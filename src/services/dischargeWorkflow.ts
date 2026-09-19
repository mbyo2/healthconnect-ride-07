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
    const { data: existing } = await (supabase.from('hospital_billing' as any) as any)
      .select('id')
      .eq('admission_id', admission.id)
      .limit(1);
    if (existing && existing.length > 0) return { created: false };

    const { error } = await (supabase.from('hospital_billing' as any) as any).insert({
      hospital_id: hospitalId,
      patient_id: admission.patient_id,
      admission_id: admission.id,
      invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
      total_amount: 0,
      subtotal: 0,
      balance: 0,
      payment_status: 'pending',
      items: [
        {
          description: `Bed & ward charges ${admission.admission_number ? `(${admission.admission_number})` : ''} — complete in Billing`,
          amount: 0,
        },
      ],
      due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    if (error) throw error;
    return { created: true };
  } catch (err: any) {
    // Never break discharge when billing hiccups — staff can raise the
    // invoice manually from the Billing tab.
    console.error('Billing draft creation failed (non-fatal):', err);
    return { created: false, error: err?.message || 'Billing draft failed' };
  }
}
