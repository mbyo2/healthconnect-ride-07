import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Users, Calendar, Clock, FileText, DollarSign, ClipboardCheck, CheckCircle, XCircle, Loader2, Plus, Upload } from 'lucide-react';
import { useHRModule, LeaveRequest } from '@/hooks/useHRModule';
import { format } from 'date-fns';
import { BulkAttendanceImport } from '@/components/hr/BulkAttendanceImport';
import { ShiftScheduleCalendar } from '@/components/hr/ShiftScheduleCalendar';

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Annual Leave', sick: 'Sick Leave', maternity: 'Maternity', paternity: 'Paternity',
  unpaid: 'Unpaid Leave', compassionate: 'Compassionate', study: 'Study Leave',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
};

export const HRManagerWorkflow = () => {
  const {
    leaveRequests, attendance, payroll, loading,
    pendingLeaves, todayAttendance,
    createLeaveRequest, approveLeave, recordAttendance,
  } = useHRModule();
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'annual' as LeaveRequest['leave_type'],
    start_date: '',
    end_date: '',
    reason: '',
  });

  const handleCreateLeave = async () => {
    if (!leaveForm.start_date || !leaveForm.end_date) return;
    setCreating(true);
    const result = await createLeaveRequest(leaveForm);
    if (result) {
      setLeaveForm({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
      setIsLeaveDialogOpen(false);
    }
    setCreating(false);
  };

  const handleApproveLeave = async (leaveId: string, approved: boolean) => {
    await approveLeave(leaveId, approved);
  };

  const LeaveCard = ({ leave }: { leave: LeaveRequest }) => {
    const status = STATUS_CONFIG[leave.status] || STATUS_CONFIG.pending;
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              <span className="font-medium text-foreground">{LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}</span>
            </div>
            {leave.status === 'pending' && (
              <div className="flex gap-1">
                <Button size="sm" variant="default" onClick={() => handleApproveLeave(leave.id, true)}>
                  <CheckCircle className="h-3 w-3 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleApproveLeave(leave.id, false)}>
                  <XCircle className="h-3 w-3 mr-1" /> Reject
                </Button>
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            <p>{format(new Date(leave.start_date), 'dd MMM yyyy')} → {format(new Date(leave.end_date), 'dd MMM yyyy')}</p>
            {leave.reason && <p className="mt-1">Reason: {leave.reason}</p>}
          </div>
        </CardContent>
      </Card>
    );
  };

  const AttendanceStatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      present: 'default', absent: 'destructive', late: 'secondary', half_day: 'outline', on_leave: 'outline',
    };
    return <Badge variant={config[status] || 'outline'}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">HR & Payroll Dashboard</h1>
          <p className="text-muted-foreground">Staff management, attendance, payroll & leave tracking</p>
        </div>
        <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Request Leave</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Leave Request</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Leave Type</Label>
                <Select value={leaveForm.leave_type} onValueChange={v => setLeaveForm(prev => ({ ...prev, leave_type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm(prev => ({ ...prev, start_date: e.target.value }))} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm(prev => ({ ...prev, end_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea value={leaveForm.reason} onChange={e => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))} rows={2} />
              </div>
              <Button onClick={handleCreateLeave} disabled={creating || !leaveForm.start_date || !leaveForm.end_date} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Submit Leave Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-3xl font-bold text-primary">{todayAttendance.filter(a => a.status === 'present').length}</p>
            <p className="text-sm text-muted-foreground">Present Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-3xl font-bold text-foreground">{todayAttendance.filter(a => a.status === 'late').length}</p>
            <p className="text-sm text-muted-foreground">Late Today</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="text-3xl font-bold text-destructive">{pendingLeaves.length}</p>
            <p className="text-sm text-muted-foreground">Pending Leaves</p>
          </CardContent>
        </Card>
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-accent-foreground" />
            <p className="text-3xl font-bold text-accent-foreground">{payroll.filter(p => p.status === 'draft').length}</p>
            <p className="text-sm text-muted-foreground">Pending Payroll</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="leaves">
        <TabsList>
          <TabsTrigger value="leaves"><ClipboardCheck className="h-4 w-4 mr-1" /> Leave Requests ({leaveRequests.length})</TabsTrigger>
          <TabsTrigger value="attendance"><Clock className="h-4 w-4 mr-1" /> Attendance ({todayAttendance.length})</TabsTrigger>
          <TabsTrigger value="payroll"><DollarSign className="h-4 w-4 mr-1" /> Payroll ({payroll.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="leaves" className="space-y-3 mt-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : leaveRequests.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No leave requests found.</CardContent></Card>
          ) : (
            leaveRequests.map(leave => <LeaveCard key={leave.id} leave={leave} />)
          )}
        </TabsContent>

        <TabsContent value="attendance" className="space-y-3 mt-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : todayAttendance.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No attendance records for today. Records will appear as staff clock in.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {todayAttendance.map(record => (
                <Card key={record.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Staff: {record.staff_id.slice(0, 8)}...</p>
                      <p className="text-sm text-muted-foreground">
                        {record.clock_in && `In: ${format(new Date(record.clock_in), 'HH:mm')}`}
                        {record.clock_out && ` | Out: ${format(new Date(record.clock_out), 'HH:mm')}`}
                        {record.hours_worked && ` | ${record.hours_worked}h`}
                      </p>
                    </div>
                    <AttendanceStatusBadge status={record.status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payroll" className="space-y-3 mt-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : payroll.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No payroll records found. Payroll processing will appear here.</CardContent></Card>
          ) : (
            payroll.map(record => (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {format(new Date(record.period_start), 'dd MMM')} – {format(new Date(record.period_end), 'dd MMM yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Basic: {record.currency} {record.basic_salary.toLocaleString()} | Net: {record.currency} {record.net_salary.toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={record.status === 'paid' ? 'default' : 'secondary'}>{record.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
