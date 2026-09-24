import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Building, Users, DollarSign, Wrench, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/use-currency";

interface StaffRow {
  id: string;
  name: string;
  role: string;
  department: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  shift: string;
}

interface InvoiceRow {
  id: string;
  invoice_number?: string | null;
  total_amount: number;
  balance: number;
  payment_status?: string | null;
  created_at?: string | null;
}

interface AssetRow {
  id: string;
  asset_name: string;
  asset_tag?: string | null;
  assigned_department?: string | null;
  category?: string | null;
  condition?: string | null;
  manufacturer?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  warranty_expiry?: string | null;
  next_maintenance_date?: string | null;
  status?: string | null;
}

/**
 * ERP administration backed by live facility data — personnel from
 * institution_personnel, finance from real billing invoices, assets from
 * the asset register. New assets insert for real; staff changes happen on
 * the Personnel page; invoices are raised in Hospital Billing.
 */
export const ERPAdministration: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState<"hr" | "finance" | "assets">("hr");
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);

  // New Asset Modal
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [savingAsset, setSavingAsset] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: "", department: "", serialNumber: "", purchaseDate: new Date().toISOString().split("T")[0] });

  const fetchAll = useCallback(async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [personnelRes, invoicesRes, assetsRes, shiftsRes] = await Promise.all([
        supabase
          .from("institution_personnel")
          .select("user_id, role, status, department")
          .eq("institution_id", institutionId),
        supabase
          .from("billing_invoices")
          .select("id, invoice_number, total_amount, balance, payment_status, created_at")
          .eq("institution_id", institutionId)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("asset_register")
          .select("*")
          .eq("institution_id", institutionId)
          .order("asset_name")
          .limit(500),
        supabase
          .from("staff_schedules")
          .select("user_id, shift_type, start_time, end_time")
          .eq("institution_id", institutionId)
          .limit(500),
      ]);
      if (personnelRes.error) throw personnelRes.error;
      if (invoicesRes.error) throw invoicesRes.error;
      if (assetsRes.error) throw assetsRes.error;

      const memberIds = ((personnelRes.data as any[]) || []).map((p) => p.user_id).filter(Boolean);
      let profilesById = new Map<string, any>();
      if (memberIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, phone")
          .in("id", memberIds);
        profilesById = new Map(((profiles as any[]) || []).map((p) => [p.id, p]));
      }
      const shiftsByUser = new Map<string, string>();
      ((shiftsRes.data as any[]) || []).forEach((s: any) => {
        if (s?.user_id && !shiftsByUser.has(s.user_id)) {
          shiftsByUser.set(
            s.user_id,
            [s.shift_type, s.start_time && s.end_time ? `${s.start_time}–${s.end_time}` : null]
              .filter(Boolean)
              .join(" ") || "Scheduled"
          );
        }
      });

      setStaff(
        ((personnelRes.data as any[]) || []).map((m: any, i: number) => {
          const prof = profilesById.get(m.user_id);
          return {
            id: m.user_id || `row-${i}`,
            name: prof
              ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim() || prof.email || "Staff member"
              : "Staff member",
            role: m.role || "Staff",
            department: m.department || "—",
            email: prof?.email,
            phone: prof?.phone,
            status: m.status || "Active",
            shift: (m.user_id && shiftsByUser.get(m.user_id)) || "—",
          };
        })
      );
      setInvoices(((invoicesRes.data as any[]) || []).map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        total_amount: Number(inv.total_amount || 0),
        balance: Number(inv.balance ?? inv.total_amount ?? 0),
        payment_status: inv.payment_status,
        created_at: inv.created_at,
      })));
      setAssets(((assetsRes.data as any[]) || []) as AssetRow[]);
    } catch (error) {
      console.error("Error loading ERP data:", error);
      toast.error("Failed to load administration data");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleAddAsset = async () => {
    if (!newAsset.name.trim() || !institutionId) {
      toast.error("Asset name is required");
      return;
    }
    setSavingAsset(true);
    try {
      const { error } = await (supabase.from("asset_register" as any) as any).insert({
        institution_id: institutionId,
        asset_name: newAsset.name.trim(),
        assigned_department: newAsset.department || null,
        serial_number: newAsset.serialNumber || null,
        purchase_date: newAsset.purchaseDate || null,
      });
      if (error) throw error;
      toast.success(`Asset ${newAsset.name.trim()} logged in registry`);
      setNewAsset({ name: "", department: "", serialNumber: "", purchaseDate: new Date().toISOString().split("T")[0] });
      setShowAssetModal(false);
      fetchAll();
    } catch (error: any) {
      console.error("Error adding asset:", error);
      toast.error(error?.message || "Failed to log asset");
    } finally {
      setSavingAsset(false);
    }
  };

  const printPayslip = (emp: StaffRow) => {
    const printWin = window.open("", "_blank");
    if (!printWin) {
      toast.error("Popup blocked — allow popups to print the slip");
      return;
    }
    printWin.document.write(`
      <html><body style="font-family: monospace; max-width: 260px; margin: auto; padding: 15px; text-align: center;">
        <h2 style="margin: 0; font-size: 16px;">STAFF PAY SLIP (ADVISORY)</h2>
        <p style="font-size: 10px;">Generated from directory records — confirm with payroll before acting</p>
        <hr style="border-top: 1px dashed #000; margin: 10px 0;"/>
        <div style="font-size: 12px; text-align: left;">
          <div><strong>Name:</strong> ${emp.name}</div>
          <div><strong>Role:</strong> ${emp.role}</div>
          <div><strong>Department:</strong> ${emp.department}</div>
          <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
        </div>
        <hr style="border-top: 1px dashed #000; margin: 10px 0;"/>
        <p style="font-size: 9px;">Amounts are settled through payroll, not this slip.</p>
        <script>window.print();</script>
      </body></html>
    `);
    printWin.document.close();
  };

  // Financial summary from real invoices
  const totalInvoiced = invoices.reduce((s, v) => s + v.total_amount, 0);
  const totalOutstanding = invoices.reduce((s, v) => s + v.balance, 0);
  const totalCollected = totalInvoiced - totalOutstanding;

  if (!institutionId) {
    return (
      <div className="p-8 rounded-3xl border border-dashed text-center text-sm text-muted-foreground">
        Administration needs an institution context — open this from a facility dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-primary-500 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <Building className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">ERP Administration &amp; Operations Suite</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-400 text-slate-950">
                Live Data
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Personnel directory, invoicing journal &amp; medical asset register
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white">
            Collected: {formatPrice(totalCollected)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-canvas-silk dark:border-slate-800 pb-2 overflow-x-auto" role="tablist" aria-label="Administration sections">
        {[
          { id: "hr", label: "Human Resources", icon: Users },
          { id: "finance", label: "Invoicing Journal", icon: DollarSign },
          { id: "assets", label: "Medical Assets", icon: Wrench },
        ].map((tab) => {
          const Icon = (tab as any).icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
                activeTab === tab.id
                  ? "bg-primary-500 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-canvas-mist dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Human Resources */}
      {activeTab === "hr" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Personnel Directory &amp; Shifts</h3>
              <p className="text-xs text-graphite-500 dark:text-slate-400">
                {staff.length} staff member{staff.length === 1 ? "" : "s"} · manage roles on the Personnel page
              </p>
            </div>
            <button
              onClick={() => navigate("/institution/personnel")}
              className="px-4 py-2 rounded-xl bg-primary-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs"
            >
              <Users className="h-4 w-4" /> Manage Personnel
            </button>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full min-w-[720px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-950 text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-3">Designation &amp; Department</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Assigned Shift</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground" role="status" aria-label="Loading staff">Loading personnel…</td></tr>
                ) : staff.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center">
                    <p className="font-bold text-sm">No personnel linked yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Add staff on the Personnel page to build this directory.</p>
                  </td></tr>
                ) : (
                  staff.map((emp) => (
                    <tr key={emp.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800/60">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{emp.name}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-primary-500">{emp.role}</div>
                        <div className="text-[10px] text-slate-400">{emp.department}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        <div>{emp.phone || "—"}</div>
                        <div className="text-[10px] text-slate-400">{emp.email || ""}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold">{emp.shift}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => printPayslip(emp)}
                          aria-label={`Print advisory pay slip for ${emp.name}`}
                          className="px-3 py-1 rounded-lg bg-primary-50 hover:bg-primary-500 hover:text-white text-primary-500 font-extrabold text-[11px] transition-colors"
                        >
                          Payslip
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Invoicing Journal (real invoices) */}
      {activeTab === "finance" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-extrabold uppercase text-slate-400">Total Invoiced</span>
              <div className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">{formatPrice(totalInvoiced)}</div>
              <span className="text-[10px] font-bold text-slate-500">All billing invoices</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-extrabold uppercase text-slate-400">Outstanding</span>
              <div className="text-2xl font-black text-rose-600 mt-1 tabular-nums">{formatPrice(totalOutstanding)}</div>
              <span className="text-[10px] font-bold text-slate-500">Awaiting collection</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-extrabold uppercase text-slate-400">Collected</span>
              <div className="text-2xl font-black text-primary-500 mt-1 tabular-nums">{formatPrice(totalCollected)}</div>
              <span className="text-[10px] font-bold text-slate-500">Invoiced minus outstanding</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Invoice Journal</h3>
            <p className="text-xs text-muted-foreground">New invoices are raised in Hospital Management → Billing.</p>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full min-w-[640px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-950 text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3 text-right">Total</th>
                  <th className="py-3 px-3 text-right">Balance</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground" role="status" aria-label="Loading invoices">Loading invoices…</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center">
                    <p className="font-bold text-sm">No invoices yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Raise the first invoice in Hospital Management → Billing.</p>
                  </td></tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800/60">
                      <td className="py-3 px-4 font-mono font-bold text-primary-500">{inv.invoice_number || inv.id.slice(0, 8)}</td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums">{formatPrice(inv.total_amount)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatPrice(inv.balance)}</td>
                      <td className="py-3 px-3 capitalize">{inv.payment_status || "pending"}</td>
                      <td className="py-3 px-3 text-slate-500">
                        {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Medical Assets (live register) */}
      {activeTab === "assets" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Medical Asset Register</h3>
              <p className="text-xs text-graphite-500 dark:text-slate-400">{assets.length} asset{assets.length === 1 ? "" : "s"} tracked</p>
            </div>

            <Dialog open={showAssetModal} onOpenChange={setShowAssetModal}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 rounded-xl bg-primary-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                  <Plus className="h-4 w-4" /> Log Asset
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
                <DialogHeader>
                  <DialogTitle className="font-black text-lg">Log Medical Asset</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <label htmlFor="erp-asset-name" className="font-bold">Asset Name *</label>
                    <input
                      id="erp-asset-name"
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
                      placeholder="e.g. Digital X-Ray System"
                      value={newAsset.name}
                      onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="erp-asset-dept" className="font-bold">Department</label>
                      <input
                        id="erp-asset-dept"
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
                        placeholder="Radiology"
                        value={newAsset.department}
                        onChange={(e) => setNewAsset({ ...newAsset, department: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="erp-asset-serial" className="font-bold">Serial Number</label>
                      <input
                        id="erp-asset-serial"
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
                        value={newAsset.serialNumber}
                        onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="erp-asset-date" className="font-bold">Purchase Date</label>
                    <input
                      id="erp-asset-date"
                      type="date"
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
                      value={newAsset.purchaseDate}
                      onChange={(e) => setNewAsset({ ...newAsset, purchaseDate: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button onClick={() => setShowAssetModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                  <button onClick={handleAddAsset} disabled={savingAsset} className="px-5 py-2.5 rounded-xl bg-primary-500 text-white font-extrabold disabled:opacity-50">
                    {savingAsset ? "Logging…" : "Save Asset"}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full min-w-[720px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-950 text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Serial #</th>
                  <th className="py-3 px-3">Next Maintenance</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground" role="status" aria-label="Loading assets">Loading assets…</td></tr>
                ) : assets.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center">
                    <p className="font-bold text-sm">No assets registered</p>
                    <p className="text-xs text-muted-foreground mt-1">Log the first asset to start the register.</p>
                  </td></tr>
                ) : (
                  assets.map((a) => (
                    <tr key={a.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800/60">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{a.asset_name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{a.asset_tag || a.id.slice(0, 8)}</div>
                      </td>
                      <td className="py-3 px-3">{a.assigned_department || "—"}</td>
                      <td className="py-3 px-3 font-mono">{a.serial_number || "—"}</td>
                      <td className="py-3 px-3 text-slate-500">
                        {a.next_maintenance_date ? new Date(a.next_maintenance_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-3 text-center capitalize">{a.status || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ERPAdministration;
