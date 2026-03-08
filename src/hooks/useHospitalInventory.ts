import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionAffiliation } from './useInstitutionAffiliation';
import { toast } from 'sonner';

export interface HospitalInventoryItem {
  id: string;
  institution_id: string;
  item_name: string;
  category: string;
  subcategory: string | null;
  sku: string | null;
  barcode: string | null;
  quantity_available: number;
  reorder_level: number;
  unit: string;
  unit_cost: number;
  supplier: string | null;
  location: string | null;
  expiry_date: string | null;
  is_active: boolean;
  created_at: string;
}

export function useHospitalInventory() {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [items, setItems] = useState<HospitalInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase.from('hospital_inventory' as any) as any)
        .select('*')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .order('item_name', { ascending: true })
        .limit(500);
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Hospital inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    if (!institutionId) return;
    const ch = supabase.channel('hospital_inventory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospital_inventory', filter: `institution_id=eq.${institutionId}` }, () => fetchItems())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [institutionId, fetchItems]);

  const addItem = async (data: Partial<HospitalInventoryItem>) => {
    if (!institutionId || !user) return null;
    try {
      const { data: result, error } = await (supabase.from('hospital_inventory' as any) as any)
        .insert({ ...data, institution_id: institutionId })
        .select()
        .single();
      if (error) throw error;
      toast.success('Item added to inventory');
      fetchItems();
      return result;
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
      return null;
    }
  };

  const updateItem = async (id: string, data: Partial<HospitalInventoryItem>) => {
    try {
      const { error } = await (supabase.from('hospital_inventory' as any) as any)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Item updated');
      fetchItems();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const lowStock = items.filter(i => i.quantity_available <= i.reorder_level);
  const expiringSoon = items.filter(i => {
    if (!i.expiry_date) return false;
    const diff = new Date(i.expiry_date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 86400000;
  });

  return { items, loading, lowStock, expiringSoon, addItem, updateItem, refetch: fetchItems };
}
