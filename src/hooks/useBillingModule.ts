import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionAffiliation } from './useInstitutionAffiliation';
import { toast } from 'sonner';

export interface BillingInvoice {
  id: string;
  institution_id: string;
  patient_id: string | null;
  invoice_number: string;
  patient_name: string;
  items: Array<{ description: string; quantity: number; unit_price: number; total: number }>;
  subtotal: number;
  tax: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'refunded';
  due_date: string | null;
  notes: string | null;
  insurance_provider: string | null;
  insurance_claim_number: string | null;
  created_by: string;
  created_at: string;
}

export interface BillingPayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_mode: 'cash' | 'card' | 'mobile_money' | 'insurance' | 'bank_transfer' | 'cheque';
  reference_number: string | null;
  payment_date: string;
}

export interface InsuranceClaim {
  id: string;
  institution_id: string;
  invoice_id: string | null;
  patient_name: string;
  insurance_provider: string;
  policy_number: string;
  claim_amount: number;
  approved_amount: number | null;
  status: string;
  submitted_at: string;
}

export function useBillingModule() {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const [invoicesRes, claimsRes] = await Promise.all([
        supabase.from('billing_invoices').select('*').eq('institution_id', institutionId).order('created_at', { ascending: false }).limit(100),
        supabase.from('insurance_claims').select('*').eq('institution_id', institutionId).order('submitted_at', { ascending: false }).limit(50),
      ]);

      if (!invoicesRes.error) setInvoices((invoicesRes.data as unknown as BillingInvoice[]) || []);
      if (!claimsRes.error) setClaims((claimsRes.data as unknown as InsuranceClaim[]) || []);
    } catch (err) {
      console.error('Billing module fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!institutionId) return;
    const channel = supabase
      .channel('billing_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_invoices', filter: `institution_id=eq.${institutionId}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_payments', filter: `institution_id=eq.${institutionId}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [institutionId, fetchAll]);

  const createInvoice = async (data: {
    patient_name: string;
    patient_id?: string;
    items: Array<{ description: string; quantity: number; unit_price: number; total: number }>;
    subtotal: number;
    tax?: number;
    discount?: number;
    total_amount: number;
    due_date?: string;
    notes?: string;
    insurance_provider?: string;
  }) => {
    if (!institutionId || !user) return null;
    try {
      const { data: result, error } = await supabase
        .from('billing_invoices')
        .insert({
          institution_id: institutionId,
          patient_name: data.patient_name,
          patient_id: data.patient_id || null,
          items: data.items as any,
          subtotal: data.subtotal,
          tax: data.tax || 0,
          discount: data.discount || 0,
          total_amount: data.total_amount,
          balance: data.total_amount,
          due_date: data.due_date || null,
          notes: data.notes || null,
          insurance_provider: data.insurance_provider || null,
          created_by: user.id,
          invoice_number: 'TEMP', // Overwritten by trigger
        } as any)
        .select()
        .single();

      if (error) throw error;
      toast.success(`Invoice ${(result as any).invoice_number} created`);
      return result as unknown as BillingInvoice;
    } catch (err: any) {
      toast.error('Failed to create invoice: ' + err.message);
      return null;
    }
  };

  const recordPayment = async (data: {
    invoice_id: string;
    amount: number;
    payment_mode: BillingPayment['payment_mode'];
    reference_number?: string;
  }) => {
    if (!institutionId || !user) return;
    try {
      const { error } = await supabase
        .from('billing_payments')
        .insert({
          institution_id: institutionId,
          invoice_id: data.invoice_id,
          amount: data.amount,
          payment_mode: data.payment_mode,
          reference_number: data.reference_number || null,
          received_by: user.id,
        } as any);

      if (error) throw error;
      toast.success('Payment recorded');
      fetchAll();
    } catch (err: any) {
      toast.error('Failed to record payment: ' + err.message);
    }
  };

  const submitInsuranceClaim = async (data: {
    invoice_id?: string;
    patient_name: string;
    patient_id?: string;
    insurance_provider: string;
    policy_number: string;
    claim_amount: number;
  }) => {
    if (!institutionId || !user) return null;
    try {
      const { data: result, error } = await supabase
        .from('insurance_claims')
        .insert({
          institution_id: institutionId,
          invoice_id: data.invoice_id || null,
          patient_id: data.patient_id || null,
          patient_name: data.patient_name,
          insurance_provider: data.insurance_provider,
          policy_number: data.policy_number,
          claim_amount: data.claim_amount,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      toast.success('Insurance claim submitted');
      fetchAll();
      return result as unknown as InsuranceClaim;
    } catch (err: any) {
      toast.error('Failed to submit claim: ' + err.message);
      return null;
    }
  };

  const todayCollections = invoices
    .filter(i => i.created_at?.startsWith(new Date().toISOString().split('T')[0]) && (i.status === 'paid' || i.status === 'partial'))
    .reduce((sum, i) => sum + (i.paid_amount || 0), 0);

  const pendingInvoices = invoices.filter(i => ['draft', 'sent', 'partial', 'overdue'].includes(i.status));
  const pendingClaims = claims.filter(c => c.status === 'submitted');

  return {
    invoices, claims, loading,
    todayCollections, pendingInvoices, pendingClaims,
    createInvoice, recordPayment, submitInsuranceClaim,
    refetch: fetchAll,
  };
}
