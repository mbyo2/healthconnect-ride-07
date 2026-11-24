import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionAffiliation } from './useInstitutionAffiliation';
import { toast } from 'sonner';
import { friendlyErrorMessage } from '@/utils/friendly-error';
import {
  applyMovement,
  fetchDepartments,
  fetchMovements,
  type ApplyMovementOptions,
  type HospitalDepartment,
  type HospitalInventoryMovement,
  type HospitalMovementType,
} from '@/services/hospitalStockService';

export type { HospitalDepartment, HospitalInventoryMovement, HospitalMovementType };

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
  /** Stock location — FK to hospital_departments(id). `location` is the
   *  legacy free-text field, kept for rows created before departments. */
  department_id: string | null;
  expiry_date: string | null;
  is_active: boolean;
  created_at: string;
}

export function useHospitalInventory() {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [items, setItems] = useState<HospitalInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<HospitalDepartment[]>([]);
  const [movements, setMovements] = useState<HospitalInventoryMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

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

  const fetchDepartmentList = useCallback(async () => {
    if (!institutionId) return;
    try {
      setDepartments(await fetchDepartments(institutionId));
    } catch (err) {
      console.error('Hospital departments fetch error:', err);
    }
  }, [institutionId]);

  useEffect(() => { fetchDepartmentList(); }, [fetchDepartmentList]);

  /** Movement history — whole institution, or one item when itemId is given. */
  const fetchMovementHistory = useCallback(async (itemId?: string) => {
    if (!institutionId) return [] as HospitalInventoryMovement[];
    setMovementsLoading(true);
    try {
      const rows = await fetchMovements(institutionId, itemId);
      if (!itemId) setMovements(rows);
      return rows;
    } catch (err) {
      console.error('Hospital inventory movements fetch error:', err);
      return [] as HospitalInventoryMovement[];
    } finally {
      setMovementsLoading(false);
    }
  }, [institutionId]);

  useEffect(() => { fetchMovementHistory(); }, [fetchMovementHistory]);

  /**
   * Record a stock movement via the apply_hospital_stock_movement RPC.
   * Returns true on success; on failure shows the RPC's plain-language
   * reason (e.g. insufficient stock) and returns false so dialogs can
   * stay open for correction.
   */
  const recordMovement = async (
    itemId: string,
    type: HospitalMovementType,
    quantity: number,
    opts: ApplyMovementOptions = {}
  ): Promise<boolean> => {
    try {
      await applyMovement(itemId, type, quantity, opts);
      toast.success('Stock movement recorded');
      await Promise.all([fetchItems(), fetchMovementHistory()]);
      return true;
    } catch (err: any) {
      toast.error(friendlyErrorMessage(err, 'That stock movement could not be recorded. Please check the quantity and try again.'));
      return false;
    }
  };

  const receiveItem = (itemId: string, quantity: number, opts?: ApplyMovementOptions) =>
    recordMovement(itemId, 'received', quantity, opts);
  const issueItem = (itemId: string, quantity: number, opts?: ApplyMovementOptions) =>
    recordMovement(itemId, 'issued', quantity, opts);
  const transferItem = (itemId: string, quantity: number, opts: ApplyMovementOptions) =>
    recordMovement(itemId, 'transferred', quantity, opts);
  /** Signed delta: positive adds stock, negative removes it. */
  const adjustItem = (itemId: string, signedDelta: number, opts?: ApplyMovementOptions) =>
    recordMovement(itemId, 'adjusted', signedDelta, opts);
  const writeOffItem = (
    itemId: string,
    quantity: number,
    opts?: ApplyMovementOptions & { kind?: 'written_off' | 'expired' | 'damaged' }
  ) => recordMovement(itemId, opts?.kind ?? 'written_off', quantity, opts);

  const departmentNameFor = (item: HospitalInventoryItem): string | null =>
    departments.find(d => d.id === item.department_id)?.name ?? item.location ?? null;

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
      toast.error(friendlyErrorMessage(err));
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
      toast.error(friendlyErrorMessage(err));
    }
  };

  const lowStock = items.filter(i => i.quantity_available <= i.reorder_level);
  const expiringSoon = items.filter(i => {
    if (!i.expiry_date) return false;
    const diff = new Date(i.expiry_date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 86400000;
  });

  return {
    items, loading, lowStock, expiringSoon, addItem, updateItem, refetch: fetchItems,
    departments, departmentNameFor,
    movements, movementsLoading, fetchMovementHistory,
    recordMovement, receiveItem, issueItem, transferItem, adjustItem, writeOffItem,
    institutionId,
  };
}
