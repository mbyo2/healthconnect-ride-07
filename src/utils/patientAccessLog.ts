import { supabase } from "@/integrations/supabase/client";

/**
 * Patient-record view logging (2026-11-11, CEO no-lawsuits bar).
 *
 * Searches were already audited server-side (patient_access_audit), but
 * OPENING a patient's record, prescriptions or lab results was logged
 * nowhere. Callers use {@link logPatientRecordAccess} (usually via the
 * usePatientAccessLog hook) at the moment a record surface is opened.
 *
 * The write is FIRE-AND-FORGET by design: it is never awaited on the
 * clinical read path, and every failure is swallowed silently — an audit
 * outage must never surface as an app error or slow a clinician down.
 * The server RPC (log_patient_record_access) derives the accessor from
 * auth.uid() and records third-party opens as 'view' and a patient
 * opening their own record as 'self_view'.
 */
export type PatientRecordSurface =
  | "medical_records"
  | "prescriptions"
  | "lab_results";

// One open = one row. React StrictMode double-invokes effects and
// several mounted components can share one surface for one patient, so
// repeat calls for the same patient+surface inside this window collapse
// into the first one. Distinct surfaces (record vs labs vs
// prescriptions) and distinct patients always log separately.
const DEDUP_WINDOW_MS = 2 * 60 * 1000;
const lastLoggedAt = new Map<string, number>();

export function logPatientRecordAccess(
  patientId: string | null | undefined,
  surface: PatientRecordSurface,
  context?: Record<string, unknown>,
): void {
  if (!patientId) return;

  const key = `${patientId}|${surface}`;
  const now = Date.now();
  const last = lastLoggedAt.get(key);
  if (last !== undefined && now - last < DEDUP_WINDOW_MS) return;
  lastLoggedAt.set(key, now);

  try {
    // (supabase as any): the generated types lag the live schema by
    // design in this repo — same pattern as request_break_glass_access.
    void (supabase as any)
      .rpc("log_patient_record_access", {
        p_patient_id: patientId,
        p_surface: surface,
        p_context: context ?? null,
      })
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    // Intentionally silent: auditing must never break the clinical UI.
  }
}
