import React, { useState, useEffect, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DollarSign, Edit3, Plus, Save, Search, Tag, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";
import { supabase } from "@/integrations/supabase/client";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

export interface ServiceTariff {
  id: string;
  code: string;
  name: string;
  category: "opd" | "lab" | "radiology" | "dental" | "surgery" | "pharmacy" | "ward" | "emergency";
  department: string;
  basePrice: number;
  costPrice?: number;
  insurancePrice?: number;
  isAvailable: boolean;
}

const DEFAULT_TARIFFS: ServiceTariff[] = [
  { id: "T-101", code: "OPD-CONS-01", name: "General Practitioner Consultation", category: "opd", department: "Outpatient (OPD)", basePrice: 250, costPrice: 50, insurancePrice: 300, isAvailable: true },
  { id: "T-102", code: "OPD-CONS-02", name: "Specialist Physician Consultation", category: "opd", department: "Internal Medicine", basePrice: 450, costPrice: 80, insurancePrice: 500, isAvailable: true },
  { id: "T-103", code: "OPD-CONS-03", name: "Paediatric Consultation", category: "opd", department: "Paediatrics", basePrice: 350, costPrice: 60, insurancePrice: 400, isAvailable: true },
  { id: "T-201", code: "DENT-EXT-01", name: "Simple Dental Extraction", category: "dental", department: "Dental Clinic", basePrice: 400, costPrice: 100, insurancePrice: 450, isAvailable: true },
  { id: "T-202", code: "DENT-RCT-01", name: "Root Canal Treatment (Single Canal)", category: "dental", department: "Dental Clinic", basePrice: 1200, costPrice: 300, insurancePrice: 1400, isAvailable: true },
  { id: "T-301", code: "LAB-FBC-01", name: "Full Blood Count (FBC/CBC)", category: "lab", department: "Hematology Lab", basePrice: 180, costPrice: 40, insurancePrice: 210, isAvailable: true },
  { id: "T-401", code: "RAD-XRAY-CHEST", name: "Chest X-Ray (PA View)", category: "radiology", department: "Radiology & Imaging", basePrice: 350, costPrice: 80, insurancePrice: 400, isAvailable: true },
  { id: "T-402", code: "RAD-US-ABD", name: "Abdominal Ultrasound Scan", category: "radiology", department: "Ultrasonography", basePrice: 650, costPrice: 120, insurancePrice: 720, isAvailable: true },
  { id: "T-501", code: "SURG-APP-01", name: "Laparoscopic Appendectomy", category: "surgery", department: "General Surgery OT", basePrice: 12500, costPrice: 3500, insurancePrice: 14000, isAvailable: true },
  { id: "T-601", code: "WARD-GEN-01", name: "General Ward Bed (Per Day)", category: "ward", department: "Inpatient (IPD)", basePrice: 450, costPrice: 100, insurancePrice: 500, isAvailable: true },
  { id: "T-602", code: "WARD-ICU-01", name: "ICU Bed with Ventilator Support (Per Day)", category: "ward", department: "Intensive Care (ICU)", basePrice: 3800, costPrice: 900, insurancePrice: 4200, isAvailable: true },
];

/**
 * Fetch an institution's active tariffs (for billing charge lookup).
 * Returns [] when the charge book is empty or unreachable — callers must
 * fall back to their own safe defaults.
 */
export async function fetchInstitutionTariffs(institutionId: string): Promise<ServiceTariff[]> {
  if (!institutionId) return [];
  const { data, error } = await supabase
    .from('service_tariffs' as any)
    .select('*')
    .eq('institution_id', institutionId)
    .eq('is_active', true)
    .order('category')
    .order('name');
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    category: r.category,
    department: r.department || '',
    basePrice: Number(r.base_price) || 0,
    costPrice: Number(r.cost_price) || 0,
    insurancePrice: r.insurance_price != null ? Number(r.insurance_price) : undefined,
    isAvailable: r.is_active !== false,
  }));
}

/**
 * Resolve a charge from the tariff book: prefer a name match inside the
 * category, else the first active tariff of that category, else fallback.
 */
export function resolveTariffPrice(
  tariffs: ServiceTariff[],
  category: ServiceTariff['category'],
  nameHint: string | undefined,
  fallback: number
): number {
  const inCategory = tariffs.filter((t) => t.category === category && t.isAvailable);
  if (inCategory.length === 0) return fallback;
  if (nameHint) {
    const needle = nameHint.toLowerCase();
    const hit = inCategory.find(
      (t) => t.name.toLowerCase().includes(needle) || needle.includes(t.name.toLowerCase())
    );
    if (hit) return hit.basePrice;
  }
  return inCategory[0].basePrice;
}

export const TariffAndPriceManager = ({ institutionId: propInstitutionId }: { institutionId?: string } = {}) => {
  const { currency, getSymbol } = useCurrency();
  const { institution } = useInstitutionContext();
  const institutionId = propInstitutionId || institution?.id || null;
  const [tariffs, setTariffs] = useState<ServiceTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const [editingCost, setEditingCost] = useState<number>(0);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newService, setNewService] = useState<Partial<ServiceTariff>>({
    code: "",
    name: "",
    category: "opd",
    department: "General OPD",
    basePrice: 0,
    costPrice: 0,
    insurancePrice: 0,
    isAvailable: true,
  });

  const load = useCallback(async () => {
    if (!institutionId) {
      setTariffs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_tariffs' as any)
        .select('*')
        .eq('institution_id', institutionId)
        .order('category')
        .order('name');
      if (error) throw error;
      setTariffs(
        ((data || []) as any[]).map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          category: r.category,
          department: r.department || '',
          basePrice: Number(r.base_price) || 0,
          costPrice: Number(r.cost_price) || 0,
          insurancePrice: r.insurance_price != null ? Number(r.insurance_price) : undefined,
          isAvailable: r.is_active !== false,
        }))
      );
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load tariffs');
      setTariffs([]);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    load();
  }, [load]);

  // One-click Zambian starter charge book for brand-new facilities.
  const loadStarterTariffs = async () => {
    if (!institutionId) return;
    setSeeding(true);
    try {
      const rows = DEFAULT_TARIFFS.map((t) => ({
        institution_id: institutionId,
        code: t.code,
        name: t.name,
        category: t.category,
        department: t.department,
        base_price: t.basePrice,
        cost_price: t.costPrice || 0,
        insurance_price: t.insurancePrice ?? Math.round(t.basePrice * 1.15),
        currency,
        is_active: true,
      }));
      const { error } = await supabase.from('service_tariffs' as any).upsert(rows, { onConflict: 'institution_id,code' });
      if (error) throw error;
      toast.success(`Loaded ${rows.length} starter tariffs — adjust them to your fees`);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load starter tariffs');
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveInlineEdit = async (id: string) => {
    try {
      const { error } = await supabase.from('service_tariffs' as any).update({
        base_price: editingPrice,
        cost_price: editingCost,
        insurance_price: Math.round(editingPrice * 1.15),
      }).eq('id', id);
      if (error) throw error;
      setTariffs((prev) =>
        prev.map((t) => (t.id === id ? { ...t, basePrice: editingPrice, costPrice: editingCost, insurancePrice: Math.round(editingPrice * 1.15) } : t))
      );
      setEditingId(null);
      toast.success('Updated service price successfully!');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save price');
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name || !newService.basePrice) return;
    if (!institutionId) {
      toast.error('No institution context — cannot save tariff');
      return;
    }
    try {
      const payload = {
        institution_id: institutionId,
        code: newService.code || `SRV-${Date.now().toString(36).toUpperCase()}`,
        name: newService.name,
        category: (newService.category as any) || 'opd',
        department: newService.department || 'General',
        base_price: Number(newService.basePrice),
        cost_price: Number(newService.costPrice || 0),
        insurance_price: Number(newService.insurancePrice || Number(newService.basePrice) * 1.15),
        currency,
        is_active: true,
      };
      const { data, error } = await supabase.from('service_tariffs' as any).insert(payload).select().single();
      if (error) throw error;
      const row = data as any;
      setTariffs((prev) => [{
        id: row.id, code: row.code, name: row.name, category: row.category,
        department: row.department || '', basePrice: Number(row.base_price) || 0,
        costPrice: Number(row.cost_price) || 0,
        insurancePrice: row.insurance_price != null ? Number(row.insurance_price) : undefined,
        isAvailable: row.is_active !== false,
      }, ...prev]);
      setShowAddModal(false);
      setNewService({ code: '', name: '', category: 'opd', department: 'General OPD', basePrice: 0, costPrice: 0, insurancePrice: 0, isAvailable: true });
      toast.success(`Added new service: ${payload.name}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add tariff');
    }
  };

  const toggleAvailability = async (id: string, next: boolean) => {
    try {
      const { error } = await supabase.from('service_tariffs' as any).update({ is_active: next }).eq('id', id);
      if (error) throw error;
      setTariffs((prev) => prev.map((t) => (t.id === id ? { ...t, isAvailable: next } : t)));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    }
  };

  const filtered = tariffs.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      t.department.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4 text-slate-900 dark:text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-canvas-silk pb-3">
        <div>
          <h2 className="text-base font-extrabold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary-500" />
            Universal Hospital Service Tariff & Pricing Matrix
          </h2>
          <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">
            Configure consultation fees, laboratory panels, radiology rates, and ward bed prices
          </p>
        </div>
        <div className="flex gap-2">
          {tariffs.length === 0 && !loading && (
            <button
              onClick={loadStarterTariffs}
              disabled={seeding || !institutionId}
              className="px-3.5 py-1.5 rounded-md border border-primary-500 text-primary-500 hover:bg-primary-100 font-extrabold text-xs shadow-xs flex items-center gap-1 disabled:opacity-50"
            >
              <Tag className="h-4 w-4" />
              <span>{seeding ? 'Loading…' : 'Load Starter Tariffs'}</span>
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 rounded-md bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs shadow-xs flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            <span>Add Service Tariff</span>
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-graphite-500 dark:text-slate-400 py-8 text-center">Loading charge book…</p>
      ) : tariffs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-graphite-300 dark:border-slate-700 p-8 text-center space-y-2">
          <Tag className="h-8 w-8 mx-auto text-slate-300" />
          <p className="text-sm font-extrabold">No tariffs yet</p>
          <p className="text-xs text-graphite-500 dark:text-slate-400">Load the Zambian starter charge book or add your own services — billing uses these rates.</p>
        </div>
      ) : null}

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search procedure name, code, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700"
        >
          <option value="all">All Categories ({tariffs.length})</option>
          <option value="opd">OPD & Consultation</option>
          <option value="dental">Dental Clinic</option>
          <option value="lab">Laboratory Tests</option>
          <option value="radiology">Radiology Scans</option>
          <option value="surgery">OT & Surgery</option>
          <option value="ward">Ward Beds & IPD</option>
        </select>
      </div>

      {/* Main Tariff Table */}
      {!loading && tariffs.length > 0 && (
      <div className="w-full overflow-x-auto rounded-xl border border-canvas-silk bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-canvas-silk bg-canvas text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
              <th className="py-2.5 px-4">Code / Category</th>
              <th className="py-2.5 px-3">Service Name</th>
              <th className="py-2.5 px-3">Department</th>
              <th className="py-2.5 px-3 text-right">Cost Price ({getSymbol()})</th>
              <th className="py-2.5 px-3 text-right">Base Price ({getSymbol()})</th>
              <th className="py-2.5 px-3 text-right">Margin</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-canvas-silk">
            {filtered.map((t) => {
              const isEditing = editingId === t.id;
              const cost = isEditing ? editingCost : t.costPrice || 0;
              const price = isEditing ? editingPrice : t.basePrice;
              const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;

              return (
                <tr key={t.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.code}</td>
                  <td className="py-3 px-3 font-extrabold text-slate-900">{t.name}</td>
                  <td className="py-3 px-3 text-graphite-500 dark:text-slate-400">{t.department}</td>
                  <td className="py-3 px-3 text-right font-mono">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editingCost}
                        onChange={(e) => setEditingCost(Number(e.target.value))}
                        className="w-20 text-right p-1 border rounded text-xs font-mono"
                      />
                    ) : (
                      <span>{cost.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-primary-500">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editingPrice}
                        onChange={(e) => setEditingPrice(Number(e.target.value))}
                        className="w-24 text-right p-1 border rounded text-xs font-mono font-bold text-primary-500"
                      />
                    ) : (
                      <span>{price.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                    +{margin}%
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button onClick={() => toggleAvailability(t.id, !t.isAvailable)}>
                      {t.isAvailable ? (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-success-500">Active</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-error-500">Disabled</span>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {isEditing ? (
                      <button
                        onClick={() => handleSaveInlineEdit(t.id)}
                        className="px-2.5 py-1 rounded-md bg-success-500 text-white text-[11px] font-bold"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(t.id);
                          setEditingPrice(t.basePrice);
                          setEditingCost(t.costPrice || 0);
                        }}
                        className="px-2.5 py-1 rounded-md bg-primary-500 text-white text-[11px] font-bold"
                      >
                        Edit Price
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[450px] bg-white border border-canvas-silk dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">Add Service Price</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddService} className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Service Name *</label>
              <input
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                placeholder="e.g. Dental Crown Fitting"
                className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Selling Price ({currency}) *</label>
                <input
                  type="number"
                  value={newService.basePrice}
                  onChange={(e) => setNewService({ ...newService, basePrice: Number(e.target.value) })}
                  className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold text-primary-500"
                  required
                />
              </div>
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Cost Price ({currency})</label>
                <input
                  type="number"
                  value={newService.costPrice}
                  onChange={(e) => setNewService({ ...newService, costPrice: Number(e.target.value) })}
                  className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700"
                />
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-md bg-primary-500 text-white font-bold text-xs">
                Save Price
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TariffAndPriceManager;
