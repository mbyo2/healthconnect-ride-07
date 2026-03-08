import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionAffiliation } from './useInstitutionAffiliation';
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

export function useHRModule() {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
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

  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending');
  const todayAttendance = attendance.filter(a => a.date === new Date().toISOString().split('T')[0]);

  return {
    leaveRequests, attendance, payroll, loading,
    pendingLeaves, todayAttendance,
    createLeaveRequest, approveLeave, recordAttendance,
    refetch: fetchAll,
  };
}
