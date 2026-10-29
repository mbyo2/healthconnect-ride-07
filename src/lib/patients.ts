import { supabase } from "@/integrations/supabase/client";

/**
 * Patient Unity (W1/W2, 2026-10-29): the ONE client path for resolving and
 * creating patients inside an institution.
 *
 * - Pickers read `search_institution_patients` (roster ∪ established clinical
 *   relationships), never per-module derivations.
 * - Desk creation goes through `find_or_create_patient`, which dedupes
 *   (phone → email → name+DOB), creates a shadow master account for walk-ins
 *   when there is no match, and always writes the institution roster link.
 */

export interface InstitutionPatient {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  onRoster: boolean;
  source: string | null;
}

export interface FindOrCreatePatientInput {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
}

export type PatientSource =
  | "registration"
  | "booking"
  | "walk_in"
  | "admission"
  | "referral"
  | "claim"
  | "queue"
  | "triage";

export interface FindOrCreatePatientResult {
  patientId: string;
  created: boolean;
  matchedBy: string | null;
}

/** Split a typed full name into first/last for the find-or-create service. */
export function splitPatientName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/** Map the form-friendly input to the RPC's parameter names. */
export function buildFindOrCreateParams(
  institutionId: string,
  input: FindOrCreatePatientInput,
  source: PatientSource = "registration",
) {
  return {
    p_institution_id: institutionId,
    p_first_name: input.firstName.trim(),
    p_last_name: input.lastName.trim(),
    p_phone: input.phone?.trim() || null,
    p_email: input.email?.trim() || null,
    p_date_of_birth: input.dateOfBirth || null,
    p_gender: input.gender || null,
    p_address: input.address?.trim() || null,
    p_emergency_contact_name: input.emergencyContactName?.trim() || null,
    p_emergency_contact_phone: input.emergencyContactPhone?.trim() || null,
    p_blood_type: input.bloodType || null,
    p_allergies: input.allergies?.trim() || null,
    p_chronic_conditions: input.chronicConditions?.trim() || null,
    p_source: source,
  };
}

export async function findOrCreatePatient(
  institutionId: string,
  input: FindOrCreatePatientInput,
  source: PatientSource = "registration",
): Promise<FindOrCreatePatientResult> {
  const { data, error } = await (supabase.rpc as any)(
    "find_or_create_patient",
    buildFindOrCreateParams(institutionId, input, source),
  );
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.patient_id) {
    throw new Error("Patient service did not return a patient record");
  }
  return {
    patientId: row.patient_id as string,
    created: Boolean(row.created),
    matchedBy: (row.matched_by as string | null) ?? null,
  };
}

/**
 * The patient's active queue token at an institution, if any (status
 * waiting or serving, most recent first). Used by flows that have a
 * patient but no token-selection surface (e.g. Triage) to attach their
 * record to the visit the patient is actually on — data-layer linking,
 * never a guess across visits: completed/cancelled tokens never match.
 */
export async function findActiveQueueTokenId(
  institutionId: string,
  patientId: string,
): Promise<string | null> {
  if (!institutionId || !patientId) return null;
  const { data, error } = await (supabase.from("queue_tokens" as any) as any)
    .select("id")
    .eq("institution_id", institutionId)
    .eq("patient_id", patientId)
    .in("status", ["waiting", "serving"])
    .order("check_in_time", { ascending: false })
    .limit(1);
  if (error) return null;
  return (data && data[0]?.id) || null;
}

export async function searchInstitutionPatients(
  institutionId: string,
  query: string,
): Promise<InstitutionPatient[]> {
  const { data, error } = await (supabase.rpc as any)("search_institution_patients", {
    p_institution_id: institutionId,
    p_query: query,
  });
  if (error) throw error;
  return (data || []).map((r: any) => {
    const firstName = r.first_name || "";
    const lastName = r.last_name || "";
    return {
      id: r.patient_id as string,
      firstName,
      lastName,
      name: [firstName, lastName].filter(Boolean).join(" ") || "Unnamed patient",
      email: r.email ?? null,
      phone: r.phone ?? null,
      dateOfBirth: r.date_of_birth ?? null,
      onRoster: Boolean(r.on_roster),
      source: r.source ?? null,
    } as InstitutionPatient;
  });
}
