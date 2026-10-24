/**
 * Discharge → billing handoff
 * ------------------------------------------------------------------
 * Every discharge opens a billing draft linked to the admission so no
 * discharged visit ever misses invoicing. Idempotent per admission:
 * if a bill already references the admission, nothing is created.
 *
 * Drafts carry a zero total with a "to be completed" line — billing staff
 * complete them in the Billing tab (bed days, procedures, pharmacy).
 * Zero-total pending drafts do not move revenue KPIs.
 *
 * E-14: drafts are opened by the ensure_hospital_billing_draft RPC.
 * The previous direct insert silently failed on every call — it passed
 * an explicit value for the GENERATED balance column (428C9) and the
 * error was swallowed by the non-fatal catch below.
 */
import { supabase } from '@/integrations/supabase/client';

export async function ensureBillingDraft(
  hospitalId: string | undefined,
  admission: { id: string; patient_id: string; admission_number?: string | null }
): Promise<{ created: boolean; error?: string }> {
  if (!hospitalId || !admission?.id || !admission?.patient_id) {
    return { created: false, error: 'Missing hospital or admission' };
  }
  try {
    const { data, error } = await (supabase as any).rpc('ensure_hospital_billing_draft', {
      p_hospital_id: hospitalId,
      p_admission_id: admission.id,
    });
    if (error) throw error;
    return { created: !!(data as any)?.created };
  } catch (err: any) {
    // Never break discharge when billing hiccups — staff can raise the
    // invoice manually from the Billing tab.
    console.error('Billing draft creation failed (non-fatal):', err);
    return { created: false, error: err?.message || 'Billing draft failed' };
  }
}
