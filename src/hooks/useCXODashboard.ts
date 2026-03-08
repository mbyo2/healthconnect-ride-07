import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useInstitutionAffiliation } from './useInstitutionAffiliation';

export interface CXOMetrics {
  revenueMTD: number;
  revenueLastMonth: number;
  growthPercent: number;
  patientVolume: number;
  bedOccupancy: number;
  totalBeds: number;
  occupiedBeds: number;
  outstandingBalance: number;
  staffCount: number;
  avgWaitTime: number;
  todayAppointments: number;
  pendingClaims: number;
}

export function useCXODashboard() {
  const { institutionId } = useInstitutionAffiliation();
  const [metrics, setMetrics] = useState<CXOMetrics>({
    revenueMTD: 0, revenueLastMonth: 0, growthPercent: 0,
    patientVolume: 0, bedOccupancy: 0, totalBeds: 0, occupiedBeds: 0,
    outstandingBalance: 0, staffCount: 0, avgWaitTime: 0,
    todayAppointments: 0, pendingClaims: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!institutionId) { setLoading(false); return; }
    setLoading(true);
    try {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
      const today = now.toISOString().split('T')[0];

      const [invoicesRes, lastMonthRes, bedsRes, staffRes, appointmentsRes, claimsRes, admissionsRes] = await Promise.all([
        // MTD revenue from billing_invoices
        supabase.from('billing_invoices').select('paid_amount, balance').eq('institution_id', institutionId).gte('created_at', firstOfMonth),
        // Last month revenue
        supabase.from('billing_invoices').select('paid_amount').eq('institution_id', institutionId).gte('created_at', firstOfLastMonth).lte('created_at', lastOfLastMonth),
        // Bed data
        supabase.from('hospital_beds').select('id, status').eq('hospital_id', institutionId),
        // Staff count
        supabase.from('institution_staff').select('id').eq('institution_id', institutionId).eq('is_active', true),
        // Today's appointments
        supabase.from('appointments').select('id').eq('date', today),
        // Pending insurance claims
        supabase.from('insurance_claims').select('id').eq('institution_id', institutionId).eq('status', 'submitted'),
        // This month's unique patients (admissions)
        supabase.from('hospital_admissions').select('patient_id').eq('hospital_id', institutionId).gte('admission_date', firstOfMonth),
      ]);

      const revenueMTD = (invoicesRes.data || []).reduce((s, i) => s + ((i as any).paid_amount || 0), 0);
      const outstandingBalance = (invoicesRes.data || []).reduce((s, i) => s + ((i as any).balance || 0), 0);
      const revenueLastMonth = (lastMonthRes.data || []).reduce((s, i) => s + ((i as any).paid_amount || 0), 0);
      const growthPercent = revenueLastMonth > 0 ? Math.round(((revenueMTD - revenueLastMonth) / revenueLastMonth) * 100) : 0;

      const allBeds = bedsRes.data || [];
      const totalBeds = allBeds.length;
      const occupiedBeds = allBeds.filter((b: any) => b.status === 'occupied').length;
      const bedOccupancy = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

      const uniquePatients = new Set((admissionsRes.data || []).map((a: any) => a.patient_id)).size;

      setMetrics({
        revenueMTD,
        revenueLastMonth,
        growthPercent,
        patientVolume: uniquePatients || (appointmentsRes.data || []).length,
        bedOccupancy,
        totalBeds,
        occupiedBeds,
        outstandingBalance,
        staffCount: (staffRes.data || []).length,
        avgWaitTime: 0, // TODO: calculate from queue_tokens
        todayAppointments: (appointmentsRes.data || []).length,
        pendingClaims: (claimsRes.data || []).length,
      });
    } catch (err) {
      console.error('CXO metrics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  return { metrics, loading, refetch: fetchMetrics };
}
