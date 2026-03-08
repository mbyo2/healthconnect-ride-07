import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionAffiliation } from './useInstitutionAffiliation';
import { toast } from 'sonner';

export interface WorkOrder {
  id: string;
  institution_id: string;
  asset_id: string | null;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  location: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  reported_by: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  started_at: string | null;
  completed_at: string | null;
  due_date: string | null;
  resolution_notes: string | null;
  created_at: string;
}

export interface Asset {
  id: string;
  institution_id: string;
  asset_name: string;
  asset_tag: string | null;
  category: string;
  location: string | null;
  status: string;
  condition: string;
  next_maintenance_date: string | null;
  created_at: string;
}

export function useMaintenanceModule() {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const [woRes, assetRes] = await Promise.all([
        (supabase.from('work_orders' as any) as any).select('*').eq('institution_id', institutionId).order('created_at', { ascending: false }).limit(200),
        (supabase.from('asset_register' as any) as any).select('*').eq('institution_id', institutionId).order('asset_name', { ascending: true }).limit(500),
      ]);
      if (!woRes.error) setWorkOrders(woRes.data || []);
      if (!assetRes.error) setAssets(assetRes.data || []);
    } catch (err) {
      console.error('Maintenance module error:', err);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!institutionId) return;
    const ch = supabase.channel('maintenance_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders', filter: `institution_id=eq.${institutionId}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_register', filter: `institution_id=eq.${institutionId}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [institutionId, fetchAll]);

  const createWorkOrder = async (data: Partial<WorkOrder>) => {
    if (!institutionId || !user) return null;
    try {
      const { data: result, error } = await (supabase.from('work_orders' as any) as any)
        .insert({ ...data, institution_id: institutionId, reported_by: user.id })
        .select().single();
      if (error) throw error;
      toast.success('Work order created');
      fetchAll();
      return result;
    } catch (err: any) { toast.error(err.message); return null; }
  };

  const updateWorkOrder = async (id: string, data: Partial<WorkOrder>) => {
    try {
      const { error } = await (supabase.from('work_orders' as any) as any)
        .update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast.success('Work order updated');
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const addAsset = async (data: Partial<Asset>) => {
    if (!institutionId) return null;
    try {
      const { data: result, error } = await (supabase.from('asset_register' as any) as any)
        .insert({ ...data, institution_id: institutionId })
        .select().single();
      if (error) throw error;
      toast.success('Asset registered');
      fetchAll();
      return result;
    } catch (err: any) { toast.error(err.message); return null; }
  };

  const openOrders = workOrders.filter(w => !['completed', 'cancelled'].includes(w.status));
  const criticalOrders = workOrders.filter(w => w.priority === 'critical' && !['completed', 'cancelled'].includes(w.status));

  return { workOrders, assets, loading, openOrders, criticalOrders, createWorkOrder, updateWorkOrder, addAsset, refetch: fetchAll };
}
