import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DollarSign, Edit3, Plus, Save, Search, Tag, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";

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

export const TariffAndPriceManager = () => {
  const { currency, getSymbol } = useCurrency();
  const [tariffs, setTariffs] = useState<ServiceTariff[]>(DEFAULT_TARIFFS);
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

  const handleSaveInlineEdit = (id: string) => {
    setTariffs((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            basePrice: editingPrice,
            costPrice: editingCost,
            insurancePrice: Math.round(editingPrice * 1.15),
          };
        }
        return t;
      })
    );
    setEditingId(null);
    toast.success("Updated service price successfully!");
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name || !newService.basePrice) return;
    const created: ServiceTariff = {
      id: `T-${Math.floor(1000 + Math.random() * 9000)}`,
      code: newService.code || `SRV-${Math.floor(100 + Math.random() * 900)}`,
      name: newService.name,
      category: (newService.category as any) || "opd",
      department: newService.department || "General",
      basePrice: Number(newService.basePrice),
      costPrice: Number(newService.costPrice || 0),
      insurancePrice: Number(newService.insurancePrice || newService.basePrice * 1.15),
      isAvailable: true,
    };
    setTariffs((prev) => [created, ...prev]);
    setShowAddModal(false);
    setNewService({ code: "", name: "", category: "opd", department: "General OPD", basePrice: 0, costPrice: 0, insurancePrice: 0, isAvailable: true });
    toast.success(`Added new service: ${created.name}`);
  };

  const toggleAvailability = (id: string) => {
    setTariffs((prev) => prev.map((t) => (t.id === id ? { ...t, isAvailable: !t.isAvailable } : t)));
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#e6e9ef] pb-3">
        <div>
          <h2 className="text-base font-extrabold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#0073ea]" />
            Universal Hospital Service Tariff & Pricing Matrix
          </h2>
          <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
            Configure consultation fees, laboratory panels, radiology rates, and ward bed prices
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          <span>Add Service Tariff</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search procedure name, code, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[#c3c6d4] bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 rounded-md border border-[#c3c6d4] bg-white dark:bg-slate-900 text-xs font-bold text-slate-700"
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
      <div className="w-full overflow-x-auto rounded-xl border border-[#e6e9ef] bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
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
          <tbody className="divide-y divide-[#e6e9ef]">
            {filtered.map((t) => {
              const isEditing = editingId === t.id;
              const cost = isEditing ? editingCost : t.costPrice || 0;
              const price = isEditing ? editingPrice : t.basePrice;
              const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;

              return (
                <tr key={t.id} className="hover:bg-[#f0f2f7] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.code}</td>
                  <td className="py-3 px-3 font-extrabold text-slate-900">{t.name}</td>
                  <td className="py-3 px-3 text-[#676879]">{t.department}</td>
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
                  <td className="py-3 px-3 text-right font-mono font-bold text-[#0073ea]">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editingPrice}
                        onChange={(e) => setEditingPrice(Number(e.target.value))}
                        className="w-24 text-right p-1 border rounded text-xs font-mono font-bold text-[#0073ea]"
                      />
                    ) : (
                      <span>{price.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                    +{margin}%
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button onClick={() => toggleAvailability(t.id)}>
                      {t.isAvailable ? (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">Active</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#e2445c]">Disabled</span>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {isEditing ? (
                      <button
                        onClick={() => handleSaveInlineEdit(t.id)}
                        className="px-2.5 py-1 rounded-md bg-[#00c875] text-white text-[11px] font-bold"
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
                        className="px-2.5 py-1 rounded-md bg-[#0073ea] text-white text-[11px] font-bold"
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

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[450px] bg-white border border-[#e6e9ef]">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">Add Service Price</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddService} className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-extrabold text-[#676879] uppercase">Service Name *</label>
              <input
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                placeholder="e.g. Dental Crown Fitting"
                className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Selling Price ({currency}) *</label>
                <input
                  type="number"
                  value={newService.basePrice}
                  onChange={(e) => setNewService({ ...newService, basePrice: Number(e.target.value) })}
                  className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold text-[#0073ea]"
                  required
                />
              </div>
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Cost Price ({currency})</label>
                <input
                  type="number"
                  value={newService.costPrice}
                  onChange={(e) => setNewService({ ...newService, costPrice: Number(e.target.value) })}
                  className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4]"
                />
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-md bg-[#0073ea] text-white font-bold text-xs">
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
