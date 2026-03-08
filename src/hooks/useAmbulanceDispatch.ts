import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionAffiliation } from './useInstitutionAffiliation';
import { toast } from 'sonner';

export interface AmbulanceDispatch {
  id: string;
  institution_id: string | null;
  patient_name: string;
  contact_phone: string | null;
  pickup_location: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  destination: string;
  destination_lat: number | null;
  destination_lng: number | null;
  ambulance_unit: string;
  priority: string;
  status: string;
  dispatcher_id: string | null;
  crew_lead_id: string | null;
  notes: string | null;
  dispatched_at: string;
  estimated_eta_minutes: number | null;
  created_at: string;
}

export function useAmbulanceDispatch() {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [dispatches, setDispatches] = useState<AmbulanceDispatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDispatches = useCallback(async () => {
    setLoading(true);
    try {
      let query = (supabase.from('ambulance_dispatches' as any) as any).select('*').order('created_at', { ascending: false }).limit(100);
      if (institutionId) query = query.eq('institution_id', institutionId);
      const { data, error } = await query;
      if (error) throw error;
      setDispatches(data || []);
    } catch (err) {
      console.error('Ambulance dispatch fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => { fetchDispatches(); }, [fetchDispatches]);

  useEffect(() => {
    const ch = supabase.channel('ambulance_dispatch_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulance_dispatches' }, () => fetchDispatches())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchDispatches]);

  const createDispatch = async (data: Partial<AmbulanceDispatch>) => {
    if (!user) return null;
    try {
      const payload: any = {
        ...data,
        institution_id: institutionId || null,
        dispatcher_id: user.id,
      };
      const { data: result, error } = await (supabase.from('ambulance_dispatches' as any) as any)
        .insert(payload).select().single();
      if (error) throw error;
      toast.success(`Dispatch created — ${data.ambulance_unit}`);
      fetchDispatches();
      return result;
    } catch (err: any) { toast.error(err.message); return null; }
  };

  const updateStatus = async (id: string, status: string, extras?: Record<string, any>) => {
    try {
      const updates: any = { status, updated_at: new Date().toISOString(), ...extras };
      if (status === 'on_scene') updates.arrived_at = new Date().toISOString();
      if (status === 'transporting') updates.departed_at = new Date().toISOString();
      if (status === 'delivered') updates.delivered_at = new Date().toISOString();
      if (status === 'completed') updates.completed_at = new Date().toISOString();

      const { error } = await (supabase.from('ambulance_dispatches' as any) as any).update(updates).eq('id', id);
      if (error) throw error;
      toast.success(`Status → ${status}`);
      fetchDispatches();
    } catch (err: any) { toast.error(err.message); }
  };

  const active = dispatches.filter(d => !['delivered', 'completed', 'cancelled'].includes(d.status));
  const inTransit = dispatches.filter(d => d.status === 'transporting');
  const completedToday = dispatches.filter(d => d.status === 'completed' && d.created_at?.startsWith(new Date().toISOString().split('T')[0]));

  return { dispatches, loading, active, inTransit, completedToday, createDispatch, updateStatus, refetch: fetchDispatches };
}
