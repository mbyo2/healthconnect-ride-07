import React, { useState } from "react";
import { Users, Calendar, Clock, FileText, DollarSign, ClipboardCheck, CheckCircle, XCircle, Loader2, Plus, Upload, Printer, Building2 } from "lucide-react";
import { useHRModule, LeaveRequest } from "@/hooks/useHRModule";
import { format } from "date-fns";
import { BulkAttendanceImport } from "@/components/hr/BulkAttendanceImport";
import { ShiftScheduleCalendar } from "@/components/hr/ShiftScheduleCalendar";
import { exportPayslipPDF } from "@/utils/pdfExport";
import { useCurrency } from "@/hooks/use-currency";
import { calculateZambiaPayroll } from "@/utils/zambiaPayroll";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  maternity: "Maternity",
  paternity: "Paternity",
  unpaid: "Unpaid Leave",
  compassionate: "Compassionate",
  study: "Study Leave",
};

export const HRManagerWorkflow = () => {
  const {
    leaveRequests,
    attendance,
    payroll,
    loading,
    pendingLeaves,
    todayAttendance,
    createLeaveRequest,
    approveLeave,
  } = useHRModule();
  const { currency } = useCurrency();
  const [activeTab, setActiveTab] = useState("leaves");
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: "annual" as LeaveRequest["leave_type"],
    start_date: "",
    end_date: "",
    reason: "",
  });

  const handleCreateLeave = async () => {
    if (!leaveForm.start_date || !leaveForm.end_date) return;
    setCreating(true);
    const result = await createLeaveRequest(leaveForm);
    if (result) {
      setLeaveForm({ leave_type: "annual", start_date: "", end_date: "", reason: "" });
      setIsLeaveDialogOpen(false);
    }
    setCreating(false);
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">Approved</span>;
      case "rejected":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#e2445c]">Rejected</span>;
      default:
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#fdab3d]">Pending Review</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 font-sans">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#e6e9ef] pb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#0073ea]" />
            HR & Payroll WorkOS Workspace
          </h1>
          <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
            Shift rostering, biometric attendance, ZRA/NAPSA statutory payroll, and leave management
          </p>
        </div>

        <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
          <DialogTrigger asChild>
            <button className="px-4 py-2 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Submit Leave Request</span>
            </button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-slate-900 border border-[#e6e9ef]">
            <DialogHeader>
              <DialogTitle className="font-extrabold text-base">Submit Leave Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="font-extrabold text-[#676879] uppercase">Leave Category *</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, leave_type: e.target.value as any }))}
                  className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] bg-white dark:bg-slate-950 font-bold"
                >
                  {Object.entries(LEAVE_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-extrabold text-[#676879] uppercase">Start Date *</label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm((p) => ({ ...p, start_date: e.target.value }))}
                    className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] bg-white dark:bg-slate-950 font-bold"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#676879] uppercase">End Date *</label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] bg-white dark:bg-slate-950 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#676879] uppercase">Reason Notes</label>
                <textarea
                  rows={2}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))}
                  className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] bg-white dark:bg-slate-950 font-medium"
                />
              </div>

              <button
                onClick={handleCreateLeave}
                disabled={creating || !leaveForm.start_date || !leaveForm.end_date}
                className="w-full py-2.5 rounded-md bg-[#0073ea] text-white font-extrabold text-xs shadow-xs transition-all disabled:opacity-40"
              >
                Submit Request
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Telemetry Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs">
          <div className="text-xs font-extrabold text-[#676879] uppercase">Staff Present Today</div>
          <div className="text-3xl font-black font-mono text-[#00c875] mt-1">
            {todayAttendance.filter((a) => a.status === "present").length}
          </div>
          <div className="text-[10px] text-emerald-500 font-bold mt-0.5">Biometric Clocked-In</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs">
          <div className="text-xs font-extrabold text-[#676879] uppercase">Late Arrivals</div>
          <div className="text-3xl font-black font-mono text-[#fdab3d] mt-1">
            {todayAttendance.filter((a) => a.status === "late").length}
          </div>
          <div className="text-[10px] text-amber-500 font-bold mt-0.5">Grace period exceeded</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs">
          <div className="text-xs font-extrabold text-[#676879] uppercase">Pending Leaves</div>
          <div className="text-3xl font-black font-mono text-[#0073ea] mt-1">{pendingLeaves.length}</div>
          <div className="text-[10px] text-blue-500 font-bold mt-0.5">Awaiting Approval</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs">
          <div className="text-xs font-extrabold text-[#676879] uppercase">Active Payroll Items</div>
          <div className="text-3xl font-black font-mono text-purple-600 mt-1">{payroll.length}</div>
          <div className="text-[10px] text-purple-500 font-bold mt-0.5">ZRA/NAPSA Statutories</div>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-[#e6e9ef] rounded-xl overflow-x-auto">
        {[
          { id: "leaves", label: `Leave Requests (${leaveRequests.length})`, icon: ClipboardCheck },
          { id: "attendance", label: `Attendance (${todayAttendance.length})`, icon: Clock },
          { id: "shifts", label: "Shift Roster", icon: Calendar },
          { id: "payroll", label: `Statutory Payroll (${payroll.length})`, icon: DollarSign },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-extrabold transition-all whitespace-nowrap ${
              activeTab === t.id
                ? "bg-[#0073ea] text-white shadow-xs"
                : "text-[#676879] hover:bg-[#f0f2f7]"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Main Tab Views */}
      {activeTab === "leaves" && (
        <div className="rounded-2xl border border-[#e6e9ef] bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
                  <th className="py-2.5 px-4">Leave Category</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e9ef]">
                {leaveRequests.map((l) => (
                  <tr key={l.id} className="hover:bg-[#f0f2f7] transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {LEAVE_TYPE_LABELS[l.leave_type] || l.leave_type}
                    </td>
                    <td className="py-3 px-3 text-center">{getStatusPill(l.status)}</td>
                    <td className="py-3 px-3 font-mono font-semibold">
                      {format(new Date(l.start_date), "MMM d")} → {format(new Date(l.end_date), "MMM d, yyyy")}
                    </td>
                    <td className="py-3 px-3 text-slate-600 truncate max-w-[200px]">{l.reason || "—"}</td>
                    <td className="py-3 px-3 text-center">
                      {l.status === "pending" && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => approveLeave(l.id, true)}
                            className="px-2.5 py-1 rounded-md bg-[#00c875] text-white text-[11px] font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => approveLeave(l.id, false)}
                            className="px-2.5 py-1 rounded-md bg-[#e2445c] text-white text-[11px] font-bold"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "shifts" && <ShiftScheduleCalendar />}

      {activeTab === "payroll" && (
        <div className="rounded-2xl border border-[#e6e9ef] bg-white dark:bg-slate-900 p-4 space-y-3 shadow-xs">
          {payroll.map((p) => {
            const zm = calculateZambiaPayroll(p.basic_salary);
            return (
              <div key={p.id} className="p-3.5 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8] flex items-center justify-between text-xs">
                <div>
                  <div className="font-extrabold text-slate-900">
                    Pay Period: {format(new Date(p.period_start), "MMM d")} - {format(new Date(p.period_end), "MMM d, yyyy")}
                  </div>
                  <div className="text-[11px] font-mono text-[#676879] mt-0.5">
                    Basic: ZMW K{p.basic_salary.toLocaleString()} • Net Due: <strong className="text-[#00c875]">ZMW K{zm.netPay.toLocaleString()}</strong>
                  </div>
                </div>

                <button
                  onClick={() => {
                    exportPayslipPDF({
                      payslipNumber: `PS-${p.id.slice(0, 8).toUpperCase()}`,
                      payPeriod: `${format(new Date(p.period_start), "dd MMM")} – ${format(new Date(p.period_end), "dd MMM yyyy")}`,
                      staffName: `Staff (${p.staff_id.slice(0, 8)})`,
                      staffId: p.staff_id,
                      basicSalary: p.basic_salary,
                      allowances: [{ name: "Transport Allowance", amount: p.allowances || 0 }],
                      deductions: [
                        { name: "NAPSA Employee (5%)", amount: zm.napsaEmployee },
                        { name: "PAYE Income Tax", amount: zm.totalPaye },
                        { name: "NHIMA Insurance (1%)", amount: zm.nhimaEmployee },
                      ],
                      taxDeducted: zm.totalPaye,
                      pensionDeducted: zm.napsaEmployee,
                      healthInsuranceDeducted: zm.nhimaEmployee,
                      netPay: zm.netPay,
                      currency: p.currency || currency,
                      paymentDate: format(new Date(), "yyyy-MM-dd"),
                    }, {
                      title: "ZRA/NAPSA Official Payslip",
                      institutionName: "Doc-O-Clock Health WorkOS",
                      currency: p.currency || currency,
                    });
                  }}
                  className="px-3 py-1.5 rounded-md bg-[#0073ea] text-white font-bold text-[11px] flex items-center gap-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  PDF Payslip
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HRManagerWorkflow;
