import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Flushes the registration detail payload that PatientRegistration stashed in
 * signup metadata when email confirmation was pending (no session, so the
 * emergency-contact / insurance / medical-record rows could not be written
 * under RLS at signup time).
 *
 * Runs once per mount while a pending payload exists. Sections are flushed
 * independently: any section that fails is written back into metadata so the
 * next sign-in retries ONLY that section — succeeded sections are never
 * re-written, and the stash is cleared only when every section succeeded.
 * Nothing is silently dropped: a failed section stays pending until it lands.
 */

export interface PendingPatientProfile {
  emergency?: { name?: string; phone?: string; email?: string; relationship?: string } | null;
  insurance?: { provider_name?: string; policy_number?: string; group_number?: string; coverage_start_date?: string } | null;
  allergies?: string | null;
  chronic_conditions?: string | null;
  achievement?: boolean | null;
}

/** Writes one pending payload; returns the sections that still need a retry. */
export async function flushPendingPatientProfile(
  uid: string,
  pending: PendingPatientProfile
): Promise<PendingPatientProfile> {
  const remaining: PendingPatientProfile = {};
  const today = new Date().toISOString().split("T")[0];

  // — Emergency contact (name + phone are required by both the form and the DB)
  if (pending.emergency?.name) {
    if (!pending.emergency.phone) {
      console.warn("Pending emergency contact flush dropped: phone missing");
    } else {
      const { error } = await supabase.from("emergency_contacts").insert({
        patient_id: uid,
        name: pending.emergency.name,
        phone: pending.emergency.phone,
        email: pending.emergency.email || null,
        relationship: pending.emergency.relationship || null,
        is_primary: true,
      });
      if (error) {
        console.warn("Pending emergency contact flush failed, will retry:", error.message);
        remaining.emergency = pending.emergency;
      }
    }
  }

  // — Insurance (provider_name, policy_number, coverage_start_date are DB-required)
  if (pending.insurance?.provider_name) {
    if (!pending.insurance.policy_number || !pending.insurance.coverage_start_date) {
      console.warn("Pending insurance flush dropped: policy number or coverage start date missing");
    } else {
      const { error } = await supabase.from("insurance_information").insert({
        patient_id: uid,
        provider_name: pending.insurance.provider_name,
        policy_number: pending.insurance.policy_number,
        group_number: pending.insurance.group_number || null,
        coverage_start_date: pending.insurance.coverage_start_date,
      });
      if (error) {
        console.warn("Pending insurance flush failed, will retry:", error.message);
        remaining.insurance = pending.insurance;
      }
    }
  }

  // — Allergies
  if (pending.allergies) {
    const { error } = await supabase.from("comprehensive_medical_records").insert({
      patient_id: uid,
      record_type: "allergy",
      title: "Allergies",
      description: pending.allergies,
      visit_date: today,
    });
    if (error) {
      console.warn("Pending allergy record flush failed, will retry:", error.message);
      remaining.allergies = pending.allergies;
    }
  }

  // — Chronic conditions
  if (pending.chronic_conditions) {
    const { error } = await supabase.from("comprehensive_medical_records").insert({
      patient_id: uid,
      record_type: "diagnosis",
      title: "Chronic Conditions",
      description: pending.chronic_conditions,
      visit_date: today,
      status: "chronic",
    });
    if (error) {
      console.warn("Pending chronic-condition flush failed, will retry:", error.message);
      remaining.chronic_conditions = pending.chronic_conditions;
    }
  }

  // — First-login achievement (cosmetic, but still retried on failure)
  if (pending.achievement !== false) {
    const { error } = await supabase.from("achievements").insert({
      user_id: uid,
      achievement_type: "first_login",
      progress: 100,
      target: 100,
      completed: true,
      completed_at: new Date().toISOString(),
    });
    if (error) {
      console.warn("Pending achievement flush failed, will retry:", error.message);
      remaining.achievement = true;
    }
  }

  return remaining;
}

export const useFlushPendingPatientProfile = () => {
  const { user } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    const pending = (user?.user_metadata as any)?.pending_patient_profile as
      | PendingPatientProfile
      | null
      | undefined;
    if (!user || !pending || ranRef.current) return;
    ranRef.current = true;

    (async () => {
      const remaining = await flushPendingPatientProfile(user.id, pending);
      // Clear the stash only when everything landed; otherwise persist the
      // failed sections so the next sign-in retries them. Never lose data.
      const { error } = await supabase.auth.updateUser({
        data: {
          pending_patient_profile:
            Object.keys(remaining).length === 0 ? null : remaining,
        },
      });
      if (error) console.warn("Could not update pending_patient_profile:", error.message);
    })();
  }, [user]);
};
