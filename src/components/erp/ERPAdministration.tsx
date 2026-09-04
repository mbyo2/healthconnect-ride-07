import React, { useState } from "react";
import { toast } from "sonner";
import {
  Users,
  DollarSign,
  Briefcase,
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  Clock,
  ShieldCheck,
  Building,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  status: "Active" | "On Leave" | "Off Duty";
  shift: string;
}

interface FinancialVoucher {
  id: string;
  voucherNo: string;
  type: "Income" | "Expense" | "Journal";
  account: string;
  amount: number;
  date: string;
  reference: string;
  status: "Posted" | "Draft";
}

interface MedicalAsset {
  id: string;
  assetCode: string;
  name: string;
  department: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyExpiry: string;
  nextCalibration: string;
  status: "Operational" | "Under Maintenance" | "Calibration Due";
}

const DEFAULT_EMPLOYEES: Employee[] = [
  { id: "emp-1", name: "Dr. Mwape Chilufya", role: "Chief Medical Officer", department: "Clinical Administration", email: "m.chilufya@dococlock.com", phone: "+260 971 234 567", status: "Active", shift: "Morning (08:00 - 16:00)" },
  { id: "emp-2", name: "Sister Grace Banda", role: "Head Nursing Officer", department: "IPD Wards", email: "g.banda@dococlock.com", phone: "+260 966 345 678", status: "Active", shift: "Morning (08:00 - 16:00)" },
  { id: "emp-3", name: "Mr. Kelvin Tembo", role: "Chief Pharmacist", department: "Pharmacy", email: "k.tembo@dococlock.com", phone: "+260 955 456 789", status: "Active", shift: "Full Day (08:00 - 17:00)" },
  { id: "emp-4", name: "Dr. Lindiwe Zulu", role: "Consultant Pediatrician", department: "Pediatrics", email: "l.zulu@dococlock.com", phone: "+260 977 567 890", status: "Active", shift: "Morning (08:00 - 16:00)" },
  { id: "emp-5", name: "Ms. Faith Musonda", role: "Senior Physiotherapist", department: "Physiotherapy", email: "f.musonda@dococlock.com", phone: "+260 979 678 901", status: "Active", shift: "Day Shift (09:00 - 17:00)" },
];

const DEFAULT_VOUCHERS: FinancialVoucher[] = [
  { id: "jv-1", voucherNo: "JV-2026-001", type: "Income", account: "OPD Consultation & Pharmacy Revenue", amount: 68500.0, date: "2026-09-01", reference: "Daily POS Batch", status: "Posted" },
  { id: "jv-2", voucherNo: "JV-2026-002", type: "Expense", account: "Medical & Surgical Consumables", amount: 24200.0, date: "2026-08-30", reference: "PharmaMed Invoice #892", status: "Posted" },
  { id: "jv-3", voucherNo: "JV-2026-003", type: "Expense", account: "Biomedical Equipment Maintenance", amount: 12500.0, date: "2026-08-28", reference: "Siemens Calibration Contract", status: "Posted" },
  { id: "jv-4", voucherNo: "JV-2026-004", type: "Income", account: "NHIMA & Private Insurance Claims", amount: 94000.0, date: "2026-08-27", reference: "August TPA Settlement", status: "Posted" },
];

const DEFAULT_ASSETS: MedicalAsset[] = [
  { id: "ast-1", assetCode: "EQ-RAD-001", name: "Digital X-Ray System (Floor Mounted)", department: "Radiology", serialNumber: "XR-99482-Z", purchaseDate: "2024-03-10", warrantyExpiry: "2027-03-10", nextCalibration: "2026-11-15", status: "Operational" },
  { id: "ast-2", assetCode: "EQ-US-002", name: "Mindray DC-70 Color Doppler Ultrasound", department: "Radiology / OB-GYN", serialNumber: "US-88391-M", purchaseDate: "2024-06-20", warrantyExpiry: "2026-06-20", nextCalibration: "2026-09-30", status: "Calibration Due" },
  { id: "ast-3", assetCode: "EQ-OT-003", name: "Anesthesia Workstation with Ventilator", department: "Operating Theatre", serialNumber: "ANES-4491-G", purchaseDate: "2023-11-15", warrantyExpiry: "2026-11-15", nextCalibration: "2026-12-01", status: "Operational" },
  { id: "ast-4", assetCode: "EQ-LAB-004", name: "Fully Automated Biochemistry Analyzer", department: "Laboratory", serialNumber: "BIO-7721-K", purchaseDate: "2024-01-05", warrantyExpiry: "2027-01-05", nextCalibration: "2026-10-10", status: "Operational" },
  { id: "ast-5", assetCode: "EQ-PT-005", name: "Electrotherapy & Ultrasound Combo (TENS)", department: "Physiotherapy", serialNumber: "PT-3301-B", purchaseDate: "2025-02-14", warrantyExpiry: "2028-02-14", nextCalibration: "2027-02-14", status: "Operational" },
];

export const ERPAdministration: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<"hr" | "finance" | "assets">("hr");
  const [employees, setEmployees] = useState<Employee[]>(DEFAULT_EMPLOYEES);
  const [vouchers, setVouchers] = useState<FinancialVoucher[]>(DEFAULT_VOUCHERS);
  const [assets, setAssets] = useState<MedicalAsset[]>(DEFAULT_ASSETS);

  // New Employee Modal
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: "", role: "Medical Officer", department: "Clinical", email: "", phone: "" });

  // New Voucher Modal
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [newVoucher, setNewVoucher] = useState({ type: "Income" as const, account: "General Clinic Revenue", amount: 5000, reference: "" });

  // New Asset Modal
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: "", department: "Radiology", serialNumber: "", purchaseDate: "2026-01-01" });

  const handleAddEmployee = () => {
    if (!newEmp.name) return;
    const emp: Employee = {
      id: `emp-${Date.now()}`,
      name: newEmp.name,
      role: newEmp.role,
      department: newEmp.department,
      email: newEmp.email || "staff@dococlock.com",
      phone: newEmp.phone || "+260 970 000 000",
      status: "Active",
      shift: "Morning (08:00 - 16:00)",
    };
    setEmployees([...employees, emp]);
    toast.success(`${emp.name} added to Human Resources directory`);
    setShowEmpModal(false);
  };

  const handleAddVoucher = () => {
    const v: FinancialVoucher = {
      id: `jv-${Date.now()}`,
      voucherNo: `JV-2026-${Math.floor(100 + Math.random() * 900)}`,
      type: newVoucher.type,
      account: newVoucher.account,
      amount: newVoucher.amount,
      date: new Date().toISOString().split("T")[0],
      reference: newVoucher.reference || "Manual Voucher Entry",
      status: "Posted",
    };
    setVouchers([v, ...vouchers]);
    toast.success(`Journal Voucher ${v.voucherNo} posted to General Ledger`);
    setShowVoucherModal(false);
  };

  const handleAddAsset = () => {
    if (!newAsset.name) return;
    const a: MedicalAsset = {
      id: `ast-${Date.now()}`,
      assetCode: `EQ-${newAsset.department.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      name: newAsset.name,
      department: newAsset.department,
      serialNumber: newAsset.serialNumber || `SN-${Math.floor(10000 + Math.random() * 90000)}`,
      purchaseDate: newAsset.purchaseDate,
      warrantyExpiry: "2029-01-01",
      nextCalibration: "2027-01-01",
      status: "Operational",
    };
    setAssets([...assets, a]);
    toast.success(`Asset ${a.assetCode} (${a.name}) logged in registry`);
    setShowAssetModal(false);
  };

  // Financial summary
  const totalIncome = vouchers.filter((v) => v.type === "Income").reduce((s, v) => s + v.amount, 0);
  const totalExpenses = vouchers.filter((v) => v.type === "Expense").reduce((s, v) => s + v.amount, 0);
  const netSurplus = totalIncome - totalExpenses;

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0073ea] text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <Building className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">ERP Administration &amp; Operations Suite</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-400 text-slate-950">
                ERPNext Standard
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Human resources &amp; shifts, general ledger accounting &amp; finance, medical asset registers, calibration schedules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white">
            Net Surplus: K{netSurplus.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e6e9ef] dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: "hr", label: "Human Resources & Shifts (HR)", icon: Users },
          { id: "finance", label: "General Ledger & Financials", icon: DollarSign },
          { id: "assets", label: "Medical Assets & Calibration", icon: Wrench },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
                activeTab === tab.id
                  ? "bg-[#0073ea] text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#f0f2f7]"
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Personnel Directory &amp; Staff Scheduling</h3>
              <p className="text-xs text-[#676879] dark:text-slate-400">Manage clinical clinicians, duty rosters, shift schedules, and attendance</p>
            </div>

            <Dialog open={showEmpModal} onOpenChange={setShowEmpModal}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 rounded-xl bg-[#0073ea] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                  <Plus className="h-4 w-4" /> Add Staff Member
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
                <DialogHeader>
                  <DialogTitle className="font-black text-lg">Add Personnel Record</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <label className="font-bold">Full Name *</label>
                    <input
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                      value={newEmp.name}
                      onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold">Designation / Role</label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                        value={newEmp.role}
                        onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-bold">Department</label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                        value={newEmp.department}
                        onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold">Phone Number</label>
                    <input
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                      placeholder="+260 970 000 000"
                      value={newEmp.phone}
                      onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button onClick={() => setShowEmpModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                  <button onClick={handleAddEmployee} className="px-5 py-2.5 rounded-xl bg-[#0073ea] text-white font-extrabold">Save Staff</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 text-[11px] font-extrabold uppercase text-[#676879]">
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-3">Designation &amp; Department</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Assigned Shift</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{emp.name}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#0073ea]">{emp.role}</div>
                      <div className="text-[10px] text-slate-400">{emp.department}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      <div>{emp.phone}</div>
                      <div className="text-[10px] text-slate-400">{emp.email}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold">{emp.shift}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => toast.success(`Generated Monthly Payslip for ${emp.name}`)}
                        className="px-3 py-1 rounded-lg bg-[#f0f4ff] hover:bg-[#0073ea] hover:text-white text-[#0073ea] font-extrabold text-[11px] transition-colors"
                      >
                        Payslip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Accounts & Finance */}
      {activeTab === "finance" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-extrabold uppercase text-slate-400">Total Operating Inflow</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">K{totalIncome.toLocaleString()}</div>
              <span className="text-[10px] font-bold text-slate-500">Pharmacy + OPD + IPD + Claims</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-extrabold uppercase text-slate-400">Operating Expenses</span>
              <div className="text-2xl font-black text-rose-600 mt-1">K{totalExpenses.toLocaleString()}</div>
              <span className="text-[10px] font-bold text-slate-500">Procurement + Payroll + Maintenance</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-extrabold uppercase text-slate-400">Net Operating Margin</span>
              <div className="text-2xl font-black text-[#0073ea] mt-1">K{netSurplus.toLocaleString()}</div>
              <span className="text-[10px] font-bold text-emerald-600">✓ Healthy Cash Position</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">General Ledger &amp; Journal Vouchers</h3>

            <Dialog open={showVoucherModal} onOpenChange={setShowVoucherModal}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 rounded-xl bg-[#0073ea] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                  <Plus className="h-4 w-4" /> New Journal Voucher
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
                <DialogHeader>
                  <DialogTitle className="font-black text-lg">Post Financial Voucher</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <label className="font-bold">Voucher Type *</label>
                    <select
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-bold"
                      value={newVoucher.type}
                      onChange={(e) => setNewVoucher({ ...newVoucher, type: e.target.value as any })}
                    >
                      <option value="Income">Income (Credit)</option>
                      <option value="Expense">Expense (Debit)</option>
                      <option value="Journal">Journal Voucher (Transfer)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold">Chart of Accounts Category *</label>
                    <input
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-medium"
                      value={newVoucher.account}
                      onChange={(e) => setNewVoucher({ ...newVoucher, account: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold">Amount (ZMW) *</label>
                    <input
                      type="number"
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-black"
                      value={newVoucher.amount}
                      onChange={(e) => setNewVoucher({ ...newVoucher, amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button onClick={() => setShowVoucherModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                  <button onClick={handleAddVoucher} className="px-5 py-2.5 rounded-xl bg-[#0073ea] text-white font-extrabold">Post Voucher</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 text-[11px] font-extrabold uppercase text-[#676879]">
                  <th className="py-3 px-4">Voucher No</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Account Description</th>
                  <th className="py-3 px-3">Reference</th>
                  <th className="py-3 px-3 text-right">Amount (ZMW)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800">
                {vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60">
                    <td className="py-3 px-4 font-mono font-bold text-[#0073ea]">{v.voucherNo}</td>
                    <td className="py-3 px-3 text-slate-600">{v.date}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{v.account}</td>
                    <td className="py-3 px-3 text-slate-500">{v.reference}</td>
                    <td
                      className={`py-3 px-3 text-right font-black ${
                        v.type === "Income" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {v.type === "Income" ? "+" : "-"}K{v.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Medical Assets & Calibration */}
      {activeTab === "assets" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Medical Asset Register &amp; Calibration</h3>
              <p className="text-xs text-[#676879] dark:text-slate-400">
                Biomedical equipment tracking, maintenance schedules, and calibration compliance
              </p>
            </div>

            <Dialog open={showAssetModal} onOpenChange={setShowAssetModal}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 rounded-xl bg-[#0073ea] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                  <Plus className="h-4 w-4" /> Log New Asset
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
                <DialogHeader>
                  <DialogTitle className="font-black text-lg">Register Biomedical Asset</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <label className="font-bold">Asset Name *</label>
                    <input
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                      value={newAsset.name}
                      onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold">Department</label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                        value={newAsset.department}
                        onChange={(e) => setNewAsset({ ...newAsset, department: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-bold">Serial Number</label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                        value={newAsset.serialNumber}
                        onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <button onClick={() => setShowAssetModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                  <button onClick={handleAddAsset} className="px-5 py-2.5 rounded-xl bg-[#0073ea] text-white font-extrabold">Save Asset</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 text-[11px] font-extrabold uppercase text-[#676879]">
                  <th className="py-3 px-4">Asset Code &amp; Name</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Serial No</th>
                  <th className="py-3 px-3">Next Calibration</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800">
                {assets.map((ast) => (
                  <tr key={ast.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60">
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900 dark:text-slate-100">{ast.name}</div>
                      <div className="text-[10px] font-mono text-[#0073ea]">{ast.assetCode}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold">{ast.department}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{ast.serialNumber}</td>
                    <td className="py-3 px-3 font-bold text-slate-700 dark:text-slate-300">{ast.nextCalibration}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          ast.status === "Operational"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 animate-pulse"
                        }`}
                      >
                        {ast.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => toast.success(`Preventative maintenance task logged for ${ast.assetCode}`)}
                        className="px-3 py-1 rounded-lg bg-[#f0f4ff] hover:bg-[#0073ea] hover:text-white text-[#0073ea] font-extrabold text-[11px] transition-colors"
                      >
                        Service
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ERPAdministration;
