import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DollarSign, Edit3, Plus, Save, Search, Stethoscope, Microscope,
  Pill, Activity, Building2, Check, RefreshCw, Layers, ShieldCheck, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/use-currency';

export interface ServiceTariff {
  id: string;
  code: string;
  name: string;
  category: 'opd' | 'lab' | 'radiology' | 'dental' | 'surgery' | 'pharmacy' | 'ward' | 'emergency';
  department: string;
  basePrice: number;
  costPrice?: number;
  insurancePrice?: number;
  isAvailable: boolean;
}

const DEFAULT_TARIFFS: ServiceTariff[] = [
  // OPD & Consultation
  { id: 'T-101', code: 'OPD-CONS-01', name: 'General Practitioner Consultation', category: 'opd', department: 'Outpatient (OPD)', basePrice: 250, costPrice: 50, insurancePrice: 300, isAvailable: true },
  { id: 'T-102', code: 'OPD-CONS-02', name: 'Specialist Physician Consultation', category: 'opd', department: 'Internal Medicine', basePrice: 450, costPrice: 80, insurancePrice: 500, isAvailable: true },
  { id: 'T-103', code: 'OPD-CONS-03', name: 'Paediatric Consultation', category: 'opd', department: 'Paediatrics', basePrice: 350, costPrice: 60, insurancePrice: 400, isAvailable: true },

  // Dental Procedures
  { id: 'T-201', code: 'DENT-EXT-01', name: 'Simple Dental Extraction', category: 'dental', department: 'Dental Clinic', basePrice: 400, costPrice: 100, insurancePrice: 450, isAvailable: true },
  { id: 'T-202', code: 'DENT-RCT-01', name: 'Root Canal Treatment (Single Canal)', category: 'dental', department: 'Dental Clinic', basePrice: 1200, costPrice: 300, insurancePrice: 1400, isAvailable: true },
  { id: 'T-203', code: 'DENT-CLN-01', name: 'Teeth Scaling & Full Polish', category: 'dental', department: 'Dental Clinic', basePrice: 500, costPrice: 80, insurancePrice: 550, isAvailable: true },
  { id: 'T-204', code: 'DENT-XRAY-01', name: 'Periapical Dental X-Ray', category: 'dental', department: 'Dental Radiology', basePrice: 180, costPrice: 30, insurancePrice: 200, isAvailable: true },

  // Laboratory & Diagnostics
  { id: 'T-301', code: 'LAB-FBC-01', name: 'Full Blood Count (FBC/CBC)', category: 'lab', department: 'Hematology Lab', basePrice: 180, costPrice: 40, insurancePrice: 210, isAvailable: true },
  { id: 'T-302', code: 'LAB-LFT-01', name: 'Liver Function Test (LFT Panel)', category: 'lab', department: 'Biochemistry Lab', basePrice: 320, costPrice: 70, insurancePrice: 360, isAvailable: true },
  { id: 'T-303', code: 'LAB-KFT-01', name: 'Renal/Kidney Function Test (KFT)', category: 'lab', department: 'Biochemistry Lab', basePrice: 290, costPrice: 60, insurancePrice: 330, isAvailable: true },
  { id: 'T-304', code: 'LAB-LIPID-01', name: 'Full Lipid Profile', category: 'lab', department: 'Biochemistry Lab', basePrice: 260, costPrice: 50, insurancePrice: 300, isAvailable: true },

  // Radiology & Imaging
  { id: 'T-401', code: 'RAD-XRAY-CHEST', name: 'Chest X-Ray (PA View)', category: 'radiology', department: 'Radiology & Imaging', basePrice: 350, costPrice: 80, insurancePrice: 400, isAvailable: true },
  { id: 'T-402', code: 'RAD-US-ABD', name: 'Abdominal Ultrasound Scan', category: 'radiology', department: 'Ultrasonography', basePrice: 650, costPrice: 120, insurancePrice: 720, isAvailable: true },
  { id: 'T-403', code: 'RAD-CT-BRAIN', name: 'CT Scan — Brain (Plain)', category: 'radiology', department: 'Advanced Imaging', basePrice: 2800, costPrice: 650, insurancePrice: 3100, isAvailable: true },
  { id: 'T-404', code: 'RAD-MRI-SPINE', name: 'MRI — Lumbar Spine', category: 'radiology', department: 'Advanced Imaging', basePrice: 4500, costPrice: 1100, insurancePrice: 4900, isAvailable: true },

  // Operating Theatre & Surgery
  { id: 'T-501', code: 'SURG-APP-01', name: 'Laparoscopic Appendectomy', category: 'surgery', department: 'General Surgery OT', basePrice: 12500, costPrice: 3500, insurancePrice: 14000, isAvailable: true },
  { id: 'T-502', code: 'SURG-HERN-01', name: 'Inguinal Hernia Repair', category: 'surgery', department: 'General Surgery OT', basePrice: 8800, costPrice: 2200, insurancePrice: 9500, isAvailable: true },

  // Ward Beds & Inpatient Stay
  { id: 'T-601', code: 'WARD-GEN-01', name: 'General Ward Bed (Per Day)', category: 'ward', department: 'Inpatient (IPD)', basePrice: 450, costPrice: 100, insurancePrice: 500, isAvailable: true },
  { id: 'T-602', code: 'WARD-ICU-01', name: 'ICU Bed with Ventilator Support (Per Day)', category: 'ward', department: 'Intensive Care (ICU)', basePrice: 3800, costPrice: 900, insurancePrice: 4200, isAvailable: true },

  // Emergency & Ambulance
  { id: 'T-701', code: 'EMERG-TRIAGE-01', name: 'A&E Emergency Triage & Resuscitation', category: 'emergency', department: 'Accident & Emergency', basePrice: 850, costPrice: 180, insurancePrice: 950, isAvailable: true },
];

export const TariffAndPriceManager = () => {
  const { currency, getSymbol } = useCurrency();
  const [tariffs, setTariffs] = useState<ServiceTariff[]>(DEFAULT_COUNTRIES_TARIFFS());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const [editingCost, setEditingCost] = useState<number>(0);

  // New Service Dialog
  const [showAddModal, setShowAddModal] = useState(false);
  const [newService, setNewService] = useState<Partial<ServiceTariff>>({
    code: '',
    name: '',
    category: 'opd',
    department: 'General OPD',
    basePrice: 0,
    costPrice: 0,
    insurancePrice: 0,
    isAvailable: true,
  });

  function DEFAULT_COUNTRIES_TARIFFS(): ServiceTariff[] {
    return DEFAULT_TARIFFS;
  }

  // Handle inline price edit save
  const handleSaveInlineEdit = (id: string) => {
    setTariffs(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          basePrice: editingPrice,
          costPrice: editingCost,
          insurancePrice: Math.round(editingPrice * 1.15),
        };
      }
      return t;
    }));
    setEditingId(null);
    toast.success('Updated service price successfully!');
  };

  // Add new service
  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name || !newService.basePrice) return;
    const created: ServiceTariff = {
      id: `T-${Math.floor(1000 + Math.random() * 9000)}`,
      code: newService.code || `SRV-${Math.floor(100 + Math.random() * 900)}`,
      name: newService.name,
      category: newService.category as any || 'opd',
      department: newService.department || 'General',
      basePrice: Number(newService.basePrice),
      costPrice: Number(newService.costPrice || 0),
      insurancePrice: Number(newService.insurancePrice || newService.basePrice * 1.15),
      isAvailable: true,
    };
    setTariffs(prev => [created, ...prev]);
    setShowAddModal(false);
    setNewService({ code: '', name: '', category: 'opd', department: 'General OPD', basePrice: 0, costPrice: 0, insurancePrice: 0, isAvailable: true });
    toast.success(`Added new service: ${created.name} (${currency} ${created.basePrice})`);
  };

  // Toggle availability
  const toggleAvailability = (id: string) => {
    setTariffs(prev => prev.map(t => t.id === id ? { ...t, isAvailable: !t.isAvailable } : t));
    toast.info('Updated service availability status');
  };

  const filtered = tariffs.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase()) || t.department.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 rounded-2xl border border-primary/20">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Universal Service Tariff & Price Manager
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Configure consultation fees, lab test rates, radiology scans, dental tariffs, and room charges for your institution</p>
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)} className="text-xs gap-1">
          <Plus className="h-3.5 w-3.5" /> Add Service / Test Price
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="relative col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by procedure name, code, or department..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Categories ({tariffs.length})</SelectItem>
                  <SelectItem value="opd" className="text-xs">OPD &amp; Consultation</SelectItem>
                  <SelectItem value="dental" className="text-xs">Dental Clinic</SelectItem>
                  <SelectItem value="lab" className="text-xs">Laboratory Tests</SelectItem>
                  <SelectItem value="radiology" className="text-xs">Radiology &amp; Scans</SelectItem>
                  <SelectItem value="surgery" className="text-xs">OT &amp; Surgery</SelectItem>
                  <SelectItem value="ward" className="text-xs">Ward Beds &amp; IPD</SelectItem>
                  <SelectItem value="emergency" className="text-xs">Emergency &amp; Triage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tariff List Table */}
      <Card className="border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Configured Tariffs &amp; Prices ({filtered.length})</CardTitle>
            <CardDescription className="text-xs">Click Edit on any row to adjust base price, cost price, and profit margins</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">Active Currency: {currency}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-muted-foreground font-semibold">
                <th className="p-3">Code / Category</th>
                <th className="p-3">Service / Test Name</th>
                <th className="p-3">Department</th>
                <th className="p-3 text-right">Cost Price ({getSymbol()})</th>
                <th className="p-3 text-right">Base Selling Price ({getSymbol()})</th>
                <th className="p-3 text-right">Profit Margin</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(t => {
                const isEditing = editingId === t.id;
                const cost = isEditing ? editingCost : (t.costPrice || 0);
                const price = isEditing ? editingPrice : t.basePrice;
                const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;

                return (
                  <tr key={t.id} className="hover:bg-muted/20">
                    <td className="p-3">
                      <p className="font-mono font-bold text-foreground">{t.code}</p>
                      <Badge variant="outline" className="text-[9px] uppercase mt-0.5">{t.category}</Badge>
                    </td>
                    <td className="p-3 font-semibold text-foreground">{t.name}</td>
                    <td className="p-3 text-muted-foreground">{t.department}</td>
                    <td className="p-3 text-right font-mono">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editingCost}
                          onChange={e => setEditingCost(Number(e.target.value))}
                          className="h-7 w-20 text-xs font-mono text-right ml-auto"
                        />
                      ) : (
                        <span>{getSymbol()} {cost.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-primary">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editingPrice}
                          onChange={e => setEditingPrice(Number(e.target.value))}
                          className="h-7 w-24 text-xs font-mono font-bold text-right ml-auto"
                        />
                      ) : (
                        <span>{getSymbol()} {price.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Badge variant={margin >= 50 ? 'default' : 'secondary'} className="text-[10px]">
                        {margin}% profit
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => toggleAvailability(t.id)} className="cursor-pointer">
                        <Badge variant={t.isAvailable ? 'default' : 'outline'} className="text-[10px]">
                          {t.isAvailable ? 'Active' : 'Disabled'}
                        </Badge>
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      {isEditing ? (
                        <div className="flex justify-center gap-1">
                          <Button size="sm" onClick={() => handleSaveInlineEdit(t.id)} className="h-7 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700">
                            <Save className="h-3 w-3 mr-1" /> Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-7 px-2 text-[10px]">
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(t.id);
                            setEditingPrice(t.basePrice);
                            setEditingCost(t.costPrice || 0);
                          }}
                          className="h-7 px-2 text-[10px]"
                        >
                          <Edit3 className="h-3 w-3 mr-1" /> Edit Price
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add New Service Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-base">Add New Service or Procedure Price</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddService} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Service / Procedure Name *</Label>
              <Input
                value={newService.name}
                onChange={e => setNewService({ ...newService, name: e.target.value })}
                placeholder="e.g. Dental Crown Fitting or MRI Knee Scan"
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Service Code</Label>
                <Input
                  value={newService.code}
                  onChange={e => setNewService({ ...newService, code: e.target.value })}
                  placeholder="e.g. DENT-CRW-01"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={newService.category} onValueChange={v => setNewService({ ...newService, category: v as any })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opd">OPD &amp; Consultation</SelectItem>
                    <SelectItem value="dental">Dental Clinic</SelectItem>
                    <SelectItem value="lab">Laboratory Test</SelectItem>
                    <SelectItem value="radiology">Radiology &amp; Scan</SelectItem>
                    <SelectItem value="surgery">Surgery &amp; OT</SelectItem>
                    <SelectItem value="ward">Ward &amp; IPD Bed</SelectItem>
                    <SelectItem value="emergency">Emergency &amp; Triage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Department Name</Label>
              <Input
                value={newService.department}
                onChange={e => setNewService({ ...newService, department: e.target.value })}
                placeholder="e.g. Dental Department"
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Cost Price ({currency})</Label>
                <Input
                  type="number"
                  value={newService.costPrice}
                  onChange={e => setNewService({ ...newService, costPrice: Number(e.target.value) })}
                  className="h-8 text-xs font-mono"
                  min={0}
                />
              </div>
              <div>
                <Label className="text-xs">Selling Price ({currency}) *</Label>
                <Input
                  type="number"
                  value={newService.basePrice}
                  onChange={e => setNewService({ ...newService, basePrice: Number(e.target.value) })}
                  className="h-8 text-xs font-mono font-bold"
                  required
                  min={1}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" size="sm">Save Tariff Price</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
