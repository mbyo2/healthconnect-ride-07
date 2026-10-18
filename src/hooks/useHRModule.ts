import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionAffiliation } from './useInstitutionAffiliation';
import { calculatePayroll } from '@/utils/zambiaPayroll';
import { fetchInstitutionTaxConfig } from '@/utils/taxConfig';
import { toast } from 'sonner';

export interface LeaveRequest {
  id: string;
  institution_id: string;
  staff_id: string;
  leave_type: 'annual' | 'sick' | 'maternity' | 'paternity' | 'unpaid' | 'compassionate' | 'study';
  start_date: string;
  end_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  institution_id: string;
  staff_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
  hours_worked: number | null;
  overtime_hours: number | null;
  notes: string | null;
}

export interface PayrollRecord {
  id: string;
  institution_id: string;
  staff_id: string;
  period_start: string;
  period_end: string;
  basic_salary: number;
  overtime_pay: number;
  allowances: number;
  deductions: number;
  tax: number;
  net_salary: number;
  currency: string;
  status: string;
  paid_at: string | null;
}

export interface Employee {
  id: string;
  institution_id: string;
  user_id: string;
  role: string;
  department: string | null;
  salary_monthly: number;
  status: 'active' | 'inactive' | 'pending';
  joined_at: string;
  // joined from profiles
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export interface PayrollRunSummary {
  employeeCount: number;
  totalGross: number;
  totalNapsa: number;
  totalNhima: number;
  totalPaye: number;
  totalDeductions: number;
  totalNet: number;
  lines: {
    employee: Employee;
    gross: number;
    napsa: number;
    nhima: number;
    paye: number;
    net: number;
  }[];
}

export function useHRModule() {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const [leavesRes, attendanceRes, payrollRes] = await Promise.all([
        supabase.from('leave_requests').select('*').eq('institution_id', institutionId).order('created_at', { ascending: false }).limit(50),
        supabase.from('staff_attendance').select('*').eq('institution_id', institutionId).order('date', { ascending: false }).limit(100),
        supabase.from('payroll_records').select('*').eq('institution_id', institutionId).order('period_end', { ascending: false }).limit(50),
      ]);

      if (!leavesRes.error) setLeaveRequests((leavesRes.data as unknown as LeaveRequest[]) || []);
      if (!attendanceRes.error) setAttendance((attendanceRes.data as unknown as AttendanceRecord[]) || []);
      if (!payrollRes.error) setPayroll((payrollRes.data as unknown as PayrollRecord[]) || []);
    } catch (err) {
      console.error('HR module fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createLeaveRequest = async (data: {
    leave_type: LeaveRequest['leave_type'];
    start_date: string;
    end_date: string;
    reason?: string;
  }) => {
    if (!institutionId || !user) return null;
    try {
      const { data: result, error } = await supabase
        .from('leave_requests')
        .insert({
          institution_id: institutionId,
          staff_id: user.id,
          leave_type: data.leave_type,
          start_date: data.start_date,
          end_date: data.end_date,
          reason: data.reason || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      toast.success('Leave request submitted');
      fetchAll();
      return result as unknown as LeaveRequest;
    } catch (err: any) {
      toast.error('Failed to submit leave request: ' + err.message);
      return null;
    }
  };

  const approveLeave = async (leaveId: string, approved: boolean, rejectionReason?: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason || null,
        } as any)
        .eq('id', leaveId);

      if (error) throw error;
      toast.success(approved ? 'Leave approved' : 'Leave rejected');
      fetchAll();
    } catch (err: any) {
      toast.error('Failed to update leave: ' + err.message);
    }
  };

  const recordAttendance = async (data: {
    staff_id: string;
    status: AttendanceRecord['status'];
    clock_in?: string;
    clock_out?: string;
    notes?: string;
  }) => {
    if (!institutionId || !user) return;
    try {
      const { error } = await supabase
        .from('staff_attendance')
        .upsert({
          institution_id: institutionId,
          staff_id: data.staff_id,
          date: new Date().toISOString().split('T')[0],
          status: data.status,
          clock_in: data.clock_in || null,
          clock_out: data.clock_out || null,
          notes: data.notes || null,
          recorded_by: user.id,
        } as any, { onConflict: 'institution_id,staff_id,date' });

      if (error) throw error;
      toast.success('Attendance recorded');
      fetchAll();
    } catch (err: any) {
      toast.error('Failed to record attendance: ' + err.message);
    }
  };

  // ─── Employee directory ──────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    if (!institutionId) return;
    try {
      const { data: personnel, error } = await supabase
        .from('institution_personnel')
        .select('*')
        .eq('institution_id', institutionId)
        .order('joined_at', { ascending: false });
      if (error) throw error;

      const rows = (personnel as unknown as any[]) || [];
      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      let profileMap: Record<string, { first_name: string | null; last_name: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        for (const p of (profiles as unknown as any[]) || []) {
          profileMap[p.id] = p;
        }
      }

      setEmployees(
        rows.map((r) => ({
          id: r.id,
          institution_id: r.institution_id,
          user_id: r.user_id,
          role: r.role || 'staff',
          department: r.department || null,
          salary_monthly: Number(r.salary_monthly || 0),
          status: r.status || 'active',
          joined_at: r.joined_at,
          first_name: profileMap[r.user_id]?.first_name || null,
          last_name: profileMap[r.user_id]?.last_name || null,
          email: profileMap[r.user_id]?.email || null,
        }))
      );
    } catch (err) {
      console.error('HR fetch employees error:', err);
    }
  }, [institutionId]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  /** Look up a platform user by email so they can be added as an employee. */
  const findUserByEmail = async (email: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .ilike('email', email.trim())
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
  };

  const upsertEmployee = async (data: {
    user_id: string;
    role: string;
    department?: string;
    salary_monthly: number;
    status?: 'active' | 'inactive' | 'pending';
  }) => {
    if (!institutionId || !user) return null;
    try {
      const { error } = await supabase
        .from('institution_personnel')
        .upsert({
          institution_id: institutionId,
          user_id: data.user_id,
          role: data.role,
          department: data.department || null,
          salary_monthly: data.salary_monthly,
          status: data.status || 'active',
        } as any, { onConflict: 'institution_id,user_id' });
      if (error) throw error;
      toast.success('Employee saved');
      fetchEmployees();
      return true;
    } catch (err: any) {
      toast.error('Failed to save employee: ' + err.message);
      return null;
    }
  };

  const setEmployeeStatus = async (employeeId: string, status: 'active' | 'inactive') => {
    try {
      const { error } = await supabase
        .from('institution_personnel')
        .update({ status } as any)
        .eq('id', employeeId);
      if (error) throw error;
      toast.success(status === 'active' ? 'Employee reactivated' : 'Employee deactivated');
      fetchEmployees();
    } catch (err: any) {
      toast.error('Failed to update employee: ' + err.message);
    }
  };

  // ─── Payroll generation ────────────────────────────────────────────
  /**
   * Build a payroll preview for a pay period without writing anything.
   * Throws if payroll was already run for the period.
   */
  const previewPayroll = async (periodStart: string, periodEnd: string): Promise<PayrollRunSummary> => {
    if (!institutionId) throw new Error('No institution selected');

    const { data: existing, error: dupError } = await supabase
      .from('payroll_records')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .limit(1);
    if (dupError) throw dupError;
    if (existing && existing.length > 0) {
      throw new Error('Payroll has already been run for this period');
    }

    const active = employees.filter((e) => e.status === 'active' && e.salary_monthly > 0);
    if (active.length === 0) {
      throw new Error('No active employees with a salary set. Add salaries in the Employee directory first.');
    }

    // Config-driven payroll: each institution uses its own statutory rates
    // (falls back to Zambia defaults when no config row exists yet).
    const taxConfig = await fetchInstitutionTaxConfig(supabase, institutionId);

    const lines = active.map((employee) => {
      const zm = calculatePayroll(employee.salary_monthly, taxConfig);
      return {
        employee,
        gross: zm.grossSalary,
        napsa: zm.napsaEmployee,
        nhima: zm.nhimaEmployee,
        paye: zm.totalPaye,
        net: zm.netPay,
      };
    });

    return {
      employeeCount: lines.length,
      totalGross: lines.reduce((s, l) => s + l.gross, 0),
      totalNapsa: lines.reduce((s, l) => s + l.napsa, 0),
      totalNhima: lines.reduce((s, l) => s + l.nhima, 0),
      totalPaye: lines.reduce((s, l) => s + l.paye, 0),
      totalDeductions: lines.reduce((s, l) => s + l.napsa + l.nhima + l.paye, 0),
      totalNet: lines.reduce((s, l) => s + l.net, 0),
      lines,
    };
  };

  /**
   * Confirm and write a payroll run. Re-checks duplicates; the DB unique
   * index is the final backstop against double runs.
   */
  const runPayroll = async (summary: PayrollRunSummary, periodStart: string, periodEnd: string, currency: string) => {
    if (!institutionId || !user) return false;
    try {
      const rows = summary.lines.map((l) => ({
        institution_id: institutionId,
        staff_id: l.employee.user_id,
        period_start: periodStart,
        period_end: periodEnd,
        basic_salary: l.gross,
        overtime_pay: 0,
        allowances: 0,
        deductions: l.napsa + l.nhima,
        tax: l.paye,
        net_salary: l.net,
        currency,
        status: 'processed',
        created_by: user.id,
      }));

      const { error } = await supabase.from('payroll_records').insert(rows as any);
      if (error) {
        // 23505 = unique violation → someone already ran this period
        if ((error as any).code === '23505') {
          throw new Error('Payroll has already been run for this period');
        }
        throw error;
      }
      toast.success(`Payroll processed for ${summary.employeeCount} employees`);
      fetchAll();
      return true;
    } catch (err: any) {
      toast.error('Failed to run payroll: ' + err.message);
      return false;
    }
  };

  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending');
  const todayAttendance = attendance.filter(a => a.date === new Date().toISOString().split('T')[0]);

  return {
    leaveRequests, attendance, payroll, employees, loading,
    pendingLeaves, todayAttendance,
    createLeaveRequest, approveLeave, recordAttendance,
    fetchEmployees, findUserByEmail, upsertEmployee, setEmployeeStatus,
    previewPayroll, runPayroll,
    refetch: fetchAll,
  };
}
