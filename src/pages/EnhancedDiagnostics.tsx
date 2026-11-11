import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  FlaskConical, Activity, Plus, Search, Filter, Download, Calendar,
  Clock, CheckCircle, AlertTriangle, UserRound, FileText, Eye, Edit,
  Share2, TrendingUp, BarChart3, Building2, Video, Users
} from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

interface DiagnosticOrder {
  id: string;
  order_number: string;
  patient_id: string;
  ordering_provider_id: string;
  institution_id?: string;
  appointment_id?: string;
  video_consultation_id?: string;
  order_type: string;
  priority: string;
  clinical_indication?: string;
  requested_tests: any[];
  status: string;
  ordered_at: string;
  required_by?: string;
  results_available_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
  patient?: {
    first_name: string;
    last_name: string;
  };
  ordering_provider?: {
    first_name: string;
    last_name: string;
  };
}

interface StaffSchedule {
  id: string;
  institution_id?: string;
  staff_id: string;
  department_id?: string;
  shift_date: string;
  shift_start: string;
  shift_end: string;
  shift_type: string;
  role_id?: string;
  is_on_call: boolean;
  assigned_patients: any[];
  notes?: string;
  staff?: {
    first_name: string;
    last_name: string;
    specialty?: string;
  };
}

export const EnhancedDiagnostics = () => {
  const navigate = useNavigate();
  const { institution } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DiagnosticOrder[]>([]);
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  // Form states
  const [orderForm, setOrderForm] = useState({
    patient_id: "",
    order_type: "lab",
    priority: "routine",
    clinical_indication: "",
    requested_tests: [] as any[],
    required_by: "",
    notes: "",
  });

  const [scheduleForm, setScheduleForm] = useState({
    staff_id: "",
    department_id: "",
    shift_date: new Date().toISOString().split('T')[0],
    shift_start: "09:00",
    shift_end: "17:00",
    shift_type: "morning",
    is_on_call: false,
    notes: "",
  });

  useEffect(() => {
    if (institution) {
      fetchDiagnosticsData();
    }
  }, [institution]);

  const fetchDiagnosticsData = async () => {
    if (!institution) return;

    try {
      const [ordersRes, schedulesRes] = await Promise.all([
        supabase
          .from("diagnostic_orders")
          .select(`
            *,
            patient:profiles!patient_id(first_name, last_name),
            ordering_provider:profiles!ordering_provider_id(first_name, last_name)
          `)
          .eq("institution_id", institution.id)
          .order("ordered_at", { ascending: false })
          .limit(50),
        supabase
          .from("staff_schedules")
          .select(`
            *,
            staff:profiles!staff_id(first_name, last_name, specialty)
          `)
          .eq("institution_id", institution.id)
          .gte("shift_date", new Date().toISOString().split('T')[0])
          .order("shift_date", { ascending: true })
          .limit(50),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as any);
      if (schedulesRes.data) setSchedules(schedulesRes.data as any);
    } catch (error) {
      console.error("Error fetching diagnostics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("diagnostic_orders").insert({
        institution_id: institution.id,
        order_number: `DX-${Date.now()}`,
        ordering_provider_id: (await supabase.auth.getUser()).data.user?.id,
        ...orderForm,
      });

      if (error) throw error;
      setShowOrderDialog(false);
      fetchDiagnosticsData();
    } catch (error) {
      console.error("Error creating order:", error);
    }
  };

  const handleCreateSchedule = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("staff_schedules").insert({
        institution_id: institution.id,
        ...scheduleForm,
        assigned_patients: [],
      });

      if (error) throw error;
      setShowScheduleDialog(false);
      fetchDiagnosticsData();
    } catch (error) {
      console.error("Error creating schedule:", error);
    }
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case "lab": return <FlaskConical className="h-4 w-4" />;
      case "radiology": return <Activity className="h-4 w-4" />;
      case "both": return <Share2 className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case "lab": return "bg-primary-500";
      case "radiology": return "bg-primary-500";
      case "both": return "bg-primary-500";
      default: return "bg-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "stat": return "bg-error-500 text-white";
      case "urgent": return "bg-warning-500 text-white";
      case "routine": return "bg-primary-500 text-white";
      default: return "bg-muted-foreground text-white";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success-500 text-white";
      case "in_progress": return "bg-primary-500 text-white";
      case "approved": return "bg-success-500 text-white";
      case "pending": return "bg-warning-500 text-white";
      case "cancelled": return "bg-error-500 text-white";
      default: return "bg-muted-foreground text-white";
    }
  };

  if (loading) return <LoadingScreen />;

  if (!institution) {
    return (
      <div className="flex items-center justify-center p-6 min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-primary-500" />
            <h2 className="text-xl font-semibold">Institution Required</h2>
            <p className="text-xs text-muted-foreground">Please select an institution to access enhanced diagnostics.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-gold hover:bg-gold-deep text-gold-ink">
              Go to Institution Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const inProgressOrders = orders.filter((o) => o.status === "in_progress").length;
  const completedToday = orders.filter((o) => {
    return o.status === "completed" && new Date(o.ordered_at).toDateString() === new Date().toDateString();
  }).length;
  const scheduledStaff = schedules.filter((s) => new Date(s.shift_date) >= new Date()).length;

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="doc-page-header px-4 sm:px-6 py-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold truncate">Enhanced Diagnostics</h1>
              <p className="text-xs text-muted-foreground font-medium truncate">Lab & Radiology Order Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Create Diagnostic Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-semibold">Patient</Label>
                    <Select
                      value={orderForm.patient_id}
                      onValueChange={(value) => setOrderForm({ ...orderForm, patient_id: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder" disabled>No patients available yet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Order Type</Label>
                    <Select
                      value={orderForm.order_type}
                      onValueChange={(value) => setOrderForm({ ...orderForm, order_type: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lab">Laboratory</SelectItem>
                        <SelectItem value="radiology">Radiology</SelectItem>
                        <SelectItem value="both">Both Lab & Radiology</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Priority</Label>
                    <Select
                      value={orderForm.priority}
                      onValueChange={(value) => setOrderForm({ ...orderForm, priority: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="routine">Routine</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="stat">Stat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Clinical Indication</Label>
                    <Textarea
                      value={orderForm.clinical_indication}
                      onChange={(e) => setOrderForm({ ...orderForm, clinical_indication: e.target.value })}
                      placeholder="Reason for diagnostic order..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Required By</Label>
                    <Input
                      type="date"
                      value={orderForm.required_by}
                      onChange={(e) => setOrderForm({ ...orderForm, required_by: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Notes</Label>
                    <Textarea
                      value={orderForm.notes}
                      onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                      placeholder="Additional notes..."
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCreateOrder} className="w-full bg-gold hover:bg-gold-deep text-gold-ink font-semibold">
                    Create Order
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-xs font-semibold">
                  <Calendar className="h-4 w-4 mr-1" /> Schedule Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Schedule Staff</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-semibold">Staff Member</Label>
                    <Select
                      value={scheduleForm.staff_id}
                      onValueChange={(value) => setScheduleForm({ ...scheduleForm, staff_id: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select staff" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder" disabled>No staff available yet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Department</Label>
                    <Select
                      value={scheduleForm.department_id}
                      onValueChange={(value) => setScheduleForm({ ...scheduleForm, department_id: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lab">Laboratory</SelectItem>
                        <SelectItem value="radiology">Radiology</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Shift Date</Label>
                    <Input
                      type="date"
                      value={scheduleForm.shift_date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, shift_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">Start Time</Label>
                      <Input
                        type="time"
                        value={scheduleForm.shift_start}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, shift_start: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">End Time</Label>
                      <Input
                        type="time"
                        value={scheduleForm.shift_end}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, shift_end: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Shift Type</Label>
                    <Select
                      value={scheduleForm.shift_type}
                      onValueChange={(value) => setScheduleForm({ ...scheduleForm, shift_type: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                        <SelectItem value="on_call">On Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">On Call</Label>
                    <input
                      type="checkbox"
                      checked={scheduleForm.is_on_call}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, is_on_call: e.target.checked })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Notes</Label>
                    <Textarea
                      value={scheduleForm.notes}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                      placeholder="Schedule notes..."
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCreateSchedule} className="w-full bg-gold hover:bg-gold-deep text-gold-ink font-semibold">
                    Create Schedule
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pt-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-muted-foreground">Pending Orders</span>
                <Clock className="h-4 w-4 text-primary-500" />
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{pendingOrders}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">Awaiting processing</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-muted-foreground">In Progress</span>
                <Activity className="h-4 w-4 text-primary-500" />
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{inProgressOrders}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">Currently processing</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-muted-foreground">Completed Today</span>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{completedToday}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">Results delivered</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-muted-foreground">Scheduled Staff</span>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{scheduledStaff}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">Upcoming shifts</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="bg-card border border-border p-1">
            <TabsTrigger value="orders" className="">
              <FlaskConical className="h-4 w-4 mr-2" /> Diagnostic Orders
            </TabsTrigger>
            <TabsTrigger value="results" className="">
              <FileText className="h-4 w-4 mr-2" /> Results Management
            </TabsTrigger>
            <TabsTrigger value="scheduling" className="">
              <Calendar className="h-4 w-4 mr-2" /> Staff Scheduling
            </TabsTrigger>
            <TabsTrigger value="integration" className="">
              <Video className="h-4 w-4 mr-2" /> Telemedicine Integration
            </TabsTrigger>
          </TabsList>

          {/* Diagnostic Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input type="search" aria-label="Search orders..." className="w-64 h-9 text-xs" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="lab">Lab Only</SelectItem>
                    <SelectItem value="radiology">Radiology Only</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs min-h-[44px]">
                  <Filter className="h-4 w-4 mr-1" /> Filter
                </Button>
                <Button variant="outline" size="sm" className="text-xs min-h-[44px]">
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </div>
            </div>

            <Card className="border-border overflow-hidden">
              <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Order #</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Patient</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Type</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Priority</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Tests</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Ordered</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t border-border hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="text-xs font-semibold">{order.order_number}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-semibold">
                          {order.patient?.first_name} {order.patient?.last_name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`h-6 w-6 rounded-lg ${getOrderTypeColor(order.order_type)} text-white flex items-center justify-center`}>
                          {getOrderTypeIcon(order.order_type)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getPriorityColor(order.priority) + " text-xs"}>
                          {order.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">{order.requested_tests.length} tests</td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusColor(order.status) + " text-xs"}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(order.ordered_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </Card>
          </TabsContent>

          {/* Results Management Tab */}
          <TabsContent value="results" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary-500" /> Results Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">
                  Results management interface placeholder - Review and approve diagnostic results
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Scheduling Tab */}
          <TabsContent value="scheduling" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input type="search" aria-label="Search schedules..." className="w-64 h-9 text-xs" />
                <Select defaultValue="week">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="text-xs min-h-[44px]">
                <Download className="h-4 w-4 mr-1" /> Export Schedule
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedules.map((schedule) => (
                <Card key={schedule.id} className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center">
                          <UserRound className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">
                            {schedule.staff?.first_name} {schedule.staff?.last_name}
                          </CardTitle>
                          <div className="text-xs text-muted-foreground">{schedule.staff?.specialty}</div>
                        </div>
                      </div>
                      {schedule.is_on_call && (
                        <Badge className="bg-warning-500 text-white text-xs">On Call</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-semibold">{new Date(schedule.shift_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Shift</span>
                      <span className="font-semibold">{schedule.shift_start} - {schedule.shift_end}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant="outline" className="text-xs">{schedule.shift_type}</Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="text-xs text-muted-foreground">
                        {schedule.assigned_patients.length} patients assigned
                      </div>
                      <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] p-0">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Telemedicine Integration Tab */}
          <TabsContent value="integration" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary-500" /> Telemedicine-Diagnostic Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">
                  Telemedicine integration interface placeholder - Order diagnostics during video consultations
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedDiagnostics;