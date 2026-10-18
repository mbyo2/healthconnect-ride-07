import React, { useState } from "react";
import { Users, Calendar, Clock, FileText, DollarSign, ClipboardCheck, CheckCircle, XCircle, Loader2, Plus, Upload, Printer, Building2, PlayCircle, UserPlus, Search } from "lucide-react";
import { useHRModule, LeaveRequest, Employee, PayrollRunSummary } from "@/hooks/useHRModule";
import { format } from "date-fns";
import { BulkAttendanceImport } from "@/components/hr/BulkAttendanceImport";
import { ShiftScheduleCalendar } from "@/components/hr/ShiftScheduleCalendar";
import { exportPayslipPDF } from "@/utils/pdfExport";
import { useCurrency } from "@/hooks/use-currency";
import { calculateZambiaPayroll } from "@/utils/zambiaPayroll";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    employees,
    loading,
    pendingLeaves,
    todayAttendance,
    createLeaveRequest,
    approveLeave,
    findUserByEmail,
    upsertEmployee,
    setEmployeeStatus,
    previewPayroll,
    runPayroll,
    refetch,
  } = useHRModule();
  const { currency } = useCurrency();
  const [activeTab, setActiveTab] = useState("leaves");
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [creating, setCreating] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: "annual" as LeaveRequest["leave_type"],
    start_date: "",
    end_date: "",
    reason: "",
  });

  // ─── Employee directory state ───
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [empEmail, setEmpEmail] = useState("");
  const [empLookup, setEmpLookup] = useState<{ id: string; first_name: string | null; last_name: string | null; email: string | null } | null>(null);
  const [empLookingUp, setEmpLookingUp] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);
  const [empRole, setEmpRole] = useState("staff");
  const [empDepartment, setEmpDepartment] = useState("");
  const [empSalary, setEmpSalary] = useState("");
  const [empSaving, setEmpSaving] = useState(false);

  // ─── Run payroll state ───
  const [payrollDialogOpen, setPayrollDialogOpen] = useState(false);
  const [payMonth, setPayMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [payrollPreview, setPayrollPreview] = useState<PayrollRunSummary | null>(null);
  const [payrollPreviewError, setPayrollPreviewError] = useState<string | null>(null);
  const [payrollPreviewing, setPayrollPreviewing] = useState(false);
  const [payrollProcessing, setPayrollProcessing] = useState(false);

  const openNewEmployeeDialog = () => {
    setEditingEmployee(null);
    setEmpEmail("");
    setEmpLookup(null);
    setEmpError(null);
    setEmpRole("staff");
    setEmpDepartment("");
    setEmpSalary("");
    setEmployeeDialogOpen(true);
  };

  const openEditEmployeeDialog = (e: Employee) => {
    setEditingEmployee(e);
    setEmpLookup({ id: e.user_id, first_name: e.first_name, last_name: e.last_name, email: e.email });
    setEmpError(null);
    setEmpRole(e.role);
    setEmpDepartment(e.department || "");
    setEmpSalary(String(e.salary_monthly || ""));
    setEmployeeDialogOpen(true);
  };

  const handleLookupEmployee = async () => {
    if (!empEmail.trim()) return;
    setEmpLookingUp(true);
    setEmpLookup(null);
    setEmpError(null);
    try {
      const found = await findUserByEmail(empEmail.trim());
      if (!found) {
        setEmpError("No platform user found with that email. The person must register on Doc'O Clock first.");
      } else {
        setEmpLookup(found);
      }
    } catch (err: any) {
      setEmpError("Lookup failed: " + err.message);
    }
    setEmpLookingUp(false);
  };

  const handleSaveEmployee = async () => {
    const userId = editingEmployee ? editingEmployee.user_id : empLookup?.id;
    const salary = parseFloat(empSalary);
    setEmpError(null);
    if (!userId) { setEmpError("Find the staff member by email first."); return; }
    if (!salary || salary <= 0) { setEmpError("Enter a valid monthly salary."); return; }
    setEmpSaving(true);
    const ok = await upsertEmployee({
      user_id: userId,
      role: empRole,
      department: empDepartment.trim() || undefined,
      salary_monthly: salary,
      status: "active",
    });
    setEmpSaving(false);
    if (ok) setEmployeeDialogOpen(false);
  };

  const monthToPeriod = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    const start = `${ym}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${ym}-${String(lastDay).padStart(2, "0")}`;
    return { start, end };
  };

  const handlePreviewPayroll = async () => {
    setPayrollPreviewing(true);
    setPayrollPreview(null);
    setPayrollPreviewError(null);
    try {
      const { start, end } = monthToPeriod(payMonth);
      const summary = await previewPayroll(start, end);
      setPayrollPreview(summary);
    } catch (err: any) {
      setPayrollPreviewError(err.message || "Could not build payroll preview");
    }
    setPayrollPreviewing(false);
  };

  const handleConfirmPayroll = async () => {
    if (!payrollPreview) return;
    setPayrollProcessing(true);
    const { start, end } = monthToPeriod(payMonth);
    const ok = await runPayroll(payrollPreview, start, end, currency);
    setPayrollProcessing(false);
    if (ok) {
      setPayrollDialogOpen(false);
      setPayrollPreview(null);
      setPayMonth(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      });
    }
  };

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
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-success-500">Approved</span>;
      case "rejected":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-error-500">Rejected</span>;
      default:
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-warning-500">Pending Review</span>;
    }
  };

  const getEmployeeStatusPill = (status: string) => {
    switch (status) {
      case "active":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-success-500">Active</span>;
      case "inactive":
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-slate-400">Inactive</span>;
      default:
        return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-warning-500">Pending</span>;
    }
  };

  const getAttendancePill = (status: string) => {
    const styles: Record<string, string> = {
      present: "bg-success-500",
      late: "bg-warning-500",
      absent: "bg-error-500",
      half_day: "bg-slate-400",
      on_leave: "bg-slate-400",
    };
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${styles[status] || "bg-slate-400"}`}>
        {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
      </span>
    );
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 font-sans">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-canvas-silk pb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary-500" />
            HR & Payroll WorkOS Workspace
          </h1>
          <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">
            Shift rostering, biometric attendance, ZRA/NAPSA statutory payroll, and leave management
          </p>
        </div>

        <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
          <DialogTrigger asChild>
            <button className="px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Submit Leave Request</span>
            </button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="font-extrabold text-base">Submit Leave Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Leave Category *</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, leave_type: e.target.value as any }))}
                  className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold"
                >
                  {Object.entries(LEAVE_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Start Date *</label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm((p) => ({ ...p, start_date: e.target.value }))}
                    className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">End Date *</label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Reason Notes</label>
                <textarea
                  rows={2}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))}
                  className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-medium"
                />
              </div>

              <button
                onClick={handleCreateLeave}
                disabled={creating || !leaveForm.start_date || !leaveForm.end_date}
                className="w-full py-2.5 rounded-md bg-primary-500 text-white font-extrabold text-xs shadow-xs transition-all disabled:opacity-40"
              >
                Submit Request
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Telemetry Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-canvas-silk shadow-xs">
          <div className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Staff Present Today</div>
          <div className="text-3xl font-black font-mono text-success-500 mt-1">
            {todayAttendance.filter((a) => a.status === "present").length}
          </div>
          <div className="text-xs text-primary-600 dark:text-primary-400 font-bold mt-0.5">Biometric Clocked-In</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-canvas-silk shadow-xs">
          <div className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Late Arrivals</div>
          <div className="text-3xl font-black font-mono text-warning-500 mt-1">
            {todayAttendance.filter((a) => a.status === "late").length}
          </div>
          <div className="text-xs text-primary-600 dark:text-primary-400 font-bold mt-0.5">Grace period exceeded</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-canvas-silk shadow-xs">
          <div className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Pending Leaves</div>
          <div className="text-3xl font-black font-mono text-primary-500 mt-1">{pendingLeaves.length}</div>
          <div className="text-xs text-primary-600 dark:text-primary-400 font-bold mt-0.5">Awaiting Approval</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-canvas-silk shadow-xs">
          <div className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Active Payroll Items</div>
          <div className="text-3xl font-black font-mono text-primary-500 mt-1">{payroll.length}</div>
          <div className="text-xs text-primary-600 dark:text-primary-400 font-bold mt-0.5">ZRA/NAPSA Statutories</div>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-canvas-silk rounded-xl overflow-x-auto">
        {[
          { id: "employees", label: `Employees (${employees.length})`, icon: Users },
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
                ? "bg-primary-500 text-white shadow-xs"
                : "text-graphite-500 dark:text-slate-400 hover:bg-canvas-mist dark:hover:bg-slate-800"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Main Tab Views */}
      {activeTab === "employees" && (
        <div className="rounded-2xl border border-canvas-silk bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-canvas-silk flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm">Employee Directory ({employees.length})</h3>
              <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">Staff, roles, departments and monthly salaries</p>
            </div>
            <button
              onClick={openNewEmployeeDialog}
              className="px-4 py-2.5 rounded-md bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs flex items-center gap-1.5 min-h-[44px]"
            >
              <UserPlus className="h-4 w-4" />
              Add Employee
            </button>
          </div>
          {employees.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">No employees yet.</p>
              <button
                onClick={openNewEmployeeDialog}
                className="mt-3 px-4 py-2.5 rounded-md bg-primary-500 text-white font-extrabold text-xs min-h-[44px]"
              >
                Add your first employee
              </button>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-canvas-silk bg-canvas text-xs font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-right">Salary / mo</th>
                    <th className="py-2.5 px-3">Start Date</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-silk">
                  {employees.map((e) => {
                    const name = [e.first_name, e.last_name].filter(Boolean).join(" ") || e.email || `Staff (${e.user_id.slice(0, 8)})`;
                    return (
                      <tr key={e.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{name}</td>
                        <td className="py-3 px-3 font-semibold capitalize">{e.role}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{e.department || "—"}</td>
                        <td className="py-3 px-3 text-right font-mono font-semibold">K{e.salary_monthly.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono font-semibold">{format(new Date(e.joined_at), "MMM d, yyyy")}</td>
                        <td className="py-3 px-3 text-center">{getEmployeeStatusPill(e.status)}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditEmployeeDialog(e)}
                              className="px-2.5 py-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-xs font-bold min-h-[44px]"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setEmployeeStatus(e.id, e.status === "active" ? "inactive" : "active")}
                              className={`px-2.5 py-1.5 rounded-md text-xs font-bold text-white min-h-[44px] ${e.status === "active" ? "bg-error-500" : "bg-success-500"}`}
                            >
                              {e.status === "active" ? "Deactivate" : "Reactivate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "leaves" && (
        <div className="rounded-2xl border border-canvas-silk bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-canvas-silk bg-canvas text-xs font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                  <th className="py-2.5 px-4">Leave Category</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-silk">
                {leaveRequests.map((l) => (
                  <tr key={l.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
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
                            className="px-2.5 py-1 rounded-md bg-success-500 text-white text-xs font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectTarget(l)}
                            className="px-2.5 py-1 rounded-md bg-error-500 text-white text-xs font-bold"
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

      {activeTab === "attendance" && (
        <div className="space-y-4">
          <BulkAttendanceImport onComplete={refetch} />
          <div className="rounded-2xl border border-canvas-silk bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-canvas-silk">
              <h3 className="font-extrabold text-sm">Today's Attendance ({todayAttendance.length})</h3>
              <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">Clock-in records for today</p>
            </div>
            {todayAttendance.length === 0 ? (
              <div className="p-8 text-center text-xs text-graphite-500 dark:text-slate-400 font-medium">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No attendance records for today yet.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-canvas-silk bg-canvas text-xs font-extrabold uppercase text-graphite-500 dark:text-slate-400">
                      <th className="py-2.5 px-4">Staff</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Clock In</th>
                      <th className="py-2.5 px-3">Clock Out</th>
                      <th className="py-2.5 px-3">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-canvas-silk">
                    {todayAttendance.map((a) => (
                      <tr key={a.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          Staff ({a.staff_id.slice(0, 8)})
                        </td>
                        <td className="py-3 px-3 text-center">{getAttendancePill(a.status)}</td>
                        <td className="py-3 px-3 font-mono font-semibold">{a.clock_in || "—"}</td>
                        <td className="py-3 px-3 font-mono font-semibold">{a.clock_out || "—"}</td>
                        <td className="py-3 px-3 font-mono font-semibold">
                          {a.hours_worked != null ? `${a.hours_worked}h` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "shifts" && <ShiftScheduleCalendar />}

      {activeTab === "payroll" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-canvas-silk bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm">Payroll Runs</h3>
              <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">
                Generate ZRA PAYE, NAPSA and NHIMA deductions for all active employees
              </p>
            </div>
            <button
              onClick={() => { setPayrollPreview(null); setPayrollPreviewError(null); setPayrollDialogOpen(true); }}
              className="px-4 py-2.5 rounded-md bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs flex items-center gap-1.5 min-h-[44px] whitespace-nowrap"
            >
              <PlayCircle className="h-4 w-4" />
              Run Payroll
            </button>
          </div>
          <div className="rounded-2xl border border-canvas-silk bg-white dark:bg-slate-900 p-4 space-y-3 shadow-xs">
          {payroll.length === 0 && (
            <div className="p-8 text-center">
              <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">No payroll runs yet. Use "Run Payroll" to generate the first one.</p>
            </div>
          )}
          {payroll.map((p) => {
            const zm = calculateZambiaPayroll(p.basic_salary);
            return (
              <div key={p.id} className="p-3.5 rounded-xl border border-canvas-silk bg-canvas flex items-center justify-between text-xs">
                <div>
                  <div className="font-extrabold text-slate-900">
                    Pay Period: {format(new Date(p.period_start), "MMM d")} - {format(new Date(p.period_end), "MMM d, yyyy")}
                  </div>
                  <div className="text-xs font-mono text-graphite-500 dark:text-slate-400 mt-0.5">
                    Basic: ZMW K{p.basic_salary.toLocaleString()} • Net Due: <strong className="text-success-500">ZMW K{zm.netPay.toLocaleString()}</strong>
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
                  className="px-3 py-1.5 rounded-md bg-primary-500 text-white font-bold text-xs flex items-center gap-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  PDF Payslip
                </button>
              </div>
            );
          })}
          </div>
        </div>
      )}
      {/* Reject a leave request — denies time off, requires confirmation */}
      <AlertDialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold text-base">Reject leave request?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-graphite-500 dark:text-slate-400 font-medium">
              You are about to reject this leave request. The staff member will be denied the time off
              and will need to submit a new request if they still need it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {rejectTarget && (
            <div className="rounded-xl border border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-950 p-3 text-xs space-y-1.5">
              <p><span className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Type: </span>
                <span className="font-bold">{LEAVE_TYPE_LABELS[rejectTarget.leave_type] || rejectTarget.leave_type}</span></p>
              <p><span className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Duration: </span>
                <span className="font-bold font-mono">
                  {format(new Date(rejectTarget.start_date), "MMM d, yyyy")} → {format(new Date(rejectTarget.end_date), "MMM d, yyyy")}
                </span></p>
              <p><span className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Reason: </span>
                <span className="font-medium">{rejectTarget.reason || "—"}</span></p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-error-500 text-white hover:bg-error-600"
              onClick={() => {
                if (rejectTarget) approveLeave(rejectTarget.id, false);
                setRejectTarget(null);
              }}
            >
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add / Edit Employee */}
      <Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">
              {editingEmployee ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            {!editingEmployee && (
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Staff Email *</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="email"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    placeholder="staff@example.com"
                    className="flex-1 p-2.5 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-medium min-h-[44px]"
                  />
                  <button
                    onClick={handleLookupEmployee}
                    disabled={empLookingUp || !empEmail.trim()}
                    className="px-4 rounded-md bg-slate-200 dark:bg-slate-700 font-extrabold min-h-[44px] flex items-center gap-1 disabled:opacity-40"
                  >
                    {empLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Find
                  </button>
                </div>
                <p className="text-graphite-500 dark:text-slate-400 font-medium mt-1">
                  The person must already have a Doc'O Clock account.
                </p>
              </div>
            )}
            {empLookup && (
              <div className="rounded-xl border border-success-500/40 bg-success-500/10 p-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success-500 shrink-0" />
                <span className="font-bold">
                  {[empLookup.first_name, empLookup.last_name].filter(Boolean).join(" ") || empLookup.email}
                </span>
              </div>
            )}
            {empError && (
              <div className="rounded-xl border border-error-500/40 bg-error-500/10 p-3 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-error-500 shrink-0" />
                <span className="font-medium">{empError}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Role *</label>
                <select
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold min-h-[44px]"
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="technician">Technician</option>
                </select>
              </div>
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Department</label>
                <input
                  value={empDepartment}
                  onChange={(e) => setEmpDepartment(e.target.value)}
                  placeholder="e.g. Outpatient"
                  className="w-full mt-1 p-2.5 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-medium min-h-[44px]"
                />
              </div>
            </div>
            <div>
              <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Monthly Salary (ZMW) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={empSalary}
                onChange={(e) => setEmpSalary(e.target.value)}
                placeholder="e.g. 8500"
                className="w-full mt-1 p-2.5 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono font-bold min-h-[44px]"
              />
              <p className="text-graphite-500 dark:text-slate-400 font-medium mt-1">
                Gross monthly pay — PAYE, NAPSA and NHIMA are calculated automatically at payroll run.
              </p>
            </div>
            <button
              onClick={handleSaveEmployee}
              disabled={empSaving}
              className="w-full py-2.5 rounded-md bg-primary-500 text-white font-extrabold text-xs min-h-[44px] disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {empSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingEmployee ? "Save Changes" : "Add Employee"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Run Payroll */}
      <Dialog open={payrollDialogOpen} onOpenChange={(open) => { setPayrollDialogOpen(open); if (!open) { setPayrollPreview(null); setPayrollPreviewError(null); } }}>
        <DialogContent className="bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">Run Payroll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1">
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Pay Period (month) *</label>
                <input
                  type="month"
                  value={payMonth}
                  onChange={(e) => { setPayMonth(e.target.value); setPayrollPreview(null); setPayrollPreviewError(null); }}
                  className="w-full mt-1 p-2.5 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold min-h-[44px]"
                />
              </div>
              <button
                onClick={handlePreviewPayroll}
                disabled={payrollPreviewing || !payMonth}
                className="px-4 py-2.5 rounded-md bg-primary-500 text-white font-extrabold min-h-[44px] disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
              >
                {payrollPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Preview Payroll
              </button>
            </div>

            {payrollPreviewError && (
              <div className="rounded-xl border border-error-500/40 bg-error-500/10 p-3 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-error-500 shrink-0" />
                <span className="font-medium">{payrollPreviewError}</span>
              </div>
            )}

            {payrollPreview && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="p-3 rounded-xl border border-canvas-silk bg-canvas">
                    <div className="text-graphite-500 dark:text-slate-400 font-extrabold uppercase">Employees</div>
                    <div className="text-xl font-black font-mono">{payrollPreview.employeeCount}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-canvas-silk bg-canvas">
                    <div className="text-graphite-500 dark:text-slate-400 font-extrabold uppercase">Total Gross</div>
                    <div className="text-xl font-black font-mono">K{payrollPreview.totalGross.toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-canvas-silk bg-canvas">
                    <div className="text-graphite-500 dark:text-slate-400 font-extrabold uppercase">Deductions</div>
                    <div className="text-xl font-black font-mono text-warning-500">K{payrollPreview.totalDeductions.toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-canvas-silk bg-canvas">
                    <div className="text-graphite-500 dark:text-slate-400 font-extrabold uppercase">Total Net</div>
                    <div className="text-xl font-black font-mono text-success-500">K{payrollPreview.totalNet.toLocaleString()}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-canvas-silk overflow-hidden">
                  <div className="w-full overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-canvas">
                        <tr className="text-graphite-500 dark:text-slate-400 font-extrabold uppercase">
                          <th className="py-2 px-3">Employee</th>
                          <th className="py-2 px-3 text-right">Gross</th>
                          <th className="py-2 px-3 text-right">NAPSA</th>
                          <th className="py-2 px-3 text-right">NHIMA</th>
                          <th className="py-2 px-3 text-right">PAYE</th>
                          <th className="py-2 px-3 text-right">Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-canvas-silk">
                        {payrollPreview.lines.map((l) => {
                          const name = [l.employee.first_name, l.employee.last_name].filter(Boolean).join(" ") || l.employee.email || "Staff";
                          return (
                            <tr key={l.employee.id}>
                              <td className="py-2 px-3 font-bold">{name}</td>
                              <td className="py-2 px-3 text-right font-mono">K{l.gross.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right font-mono">K{l.napsa.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right font-mono">K{l.nhima.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right font-mono">K{l.paye.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-success-500">K{l.net.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border border-warning-500/40 bg-warning-500/10 p-3 text-graphite-600 dark:text-slate-300 font-medium">
                  This will create {payrollPreview.employeeCount} payroll record{payrollPreview.employeeCount === 1 ? "" : "s"} for{" "}
                  <strong>{payMonth}</strong> with status "processed". Verify the figures above before confirming —
                  a period can only be run once.
                </div>

                <button
                  onClick={handleConfirmPayroll}
                  disabled={payrollProcessing}
                  className="w-full py-2.5 rounded-md bg-success-500 hover:bg-success-600 text-white font-extrabold text-xs min-h-[44px] disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {payrollProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Confirm & Process Payroll — K{payrollPreview.totalNet.toLocaleString()} net
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRManagerWorkflow;
