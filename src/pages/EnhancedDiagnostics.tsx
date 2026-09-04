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

      if (ordersRes.data) setOrders(ordersRes.data);
      if (schedulesRes.data) setSchedules(schedulesRes.data);
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
      case "lab": return "bg-[#a25ddc]";
      case "radiology": return "bg-[#0073ea]";
      case "both": return "bg-[#6366f1]";
      default: return "bg-[#676879]";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "stat": return "bg-[#e44258] text-white";
      case "urgent": return "bg-[#fdab3d] text-white";
      case "routine": return "bg-[#0073ea] text-white";
      default: return "bg-[#676879] text-white";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-[#00c875] text-white";
      case "in_progress": return "bg-[#0073ea] text-white";
      case "approved": return "bg-[#a25ddc] text-white";
      case "pending": return "bg-[#fdab3d] text-white";
      case "cancelled": return "bg-[#e44258] text-white";
      default: return "bg-[#676879] text-white";
    }
  };

  if (loading) return <LoadingScreen />;

  if (!institution) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-[#0073ea]" />
            <h2 className="text-xl font-extrabold">Institution Required</h2>
            <p className="text-xs text-[#676879]">Please select an institution to access enhanced diagnostics.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-[#0073ea] hover:bg-[#0056b3]">
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
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center shadow-xs">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Enhanced Diagnostics</h1>
              <p className="text-xs text-[#676879] font-medium">Lab & Radiology Order Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs flex items-center gap-2">
                  <Plus className="h-4 w-4" /> New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Create Diagnostic Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Patient</Label>
                    <Select
                      value={orderForm.patient_id}
                      onValueChange={(value) => setOrderForm({ ...orderForm, patient_id: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder">Select patient</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Order Type</Label>
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
                    <Label className="text-xs font-bold">Priority</Label>
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
                    <Label className="text-xs font-bold">Clinical Indication</Label>
                    <Textarea
                      value={orderForm.clinical_indication}
                      onChange={(e) => setOrderForm({ ...orderForm, clinical_indication: e.target.value })}
                      placeholder="Reason for diagnostic order..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Required By</Label>
                    <Input
                      type="date"
                      value={orderForm.required_by}
                      onChange={(e) => setOrderForm({ ...orderForm, required_by: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Notes</Label>
                    <Textarea
                      value={orderForm.notes}
                      onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                      placeholder="Additional notes..."
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCreateOrder} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Create Order
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-xs font-bold">
                  <Calendar className="h-4 w-4 mr-1" /> Schedule Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Schedule Staff</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Staff Member</Label>
                    <Select
                      value={scheduleForm.staff_id}
                      onValueChange={(value) => setScheduleForm({ ...scheduleForm, staff_id: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select staff" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder">Select staff member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Department</Label>
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
                    <Label className="text-xs font-bold">Shift Date</Label>
                    <Input
                      type="date"
                      value={scheduleForm.shift_date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, shift_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Start Time</Label>
                      <Input
                        type="time"
                        value={scheduleForm.shift_start}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, shift_start: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">End Time</Label>
                      <Input
                        type="time"
                        value={scheduleForm.shift_end}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, shift_end: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Shift Type</Label>
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
                    <Label className="text-xs font-bold">On Call</Label>
                    <input
                      type="checkbox"
                      checked={scheduleForm.is_on_call}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, is_on_call: e.target.checked })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Notes</Label>
                    <Textarea
                      value={scheduleForm.notes}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                      placeholder="Schedule notes..."
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCreateSchedule} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Create Schedule
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Pending Orders</span>
                <Clock className="h-4 w-4 text-[#a25ddc]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#a25ddc]">{pendingOrders}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Awaiting processing</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">In Progress</span>
                <Activity className="h-4 w-4 text-[#0073ea]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#0073ea]">{inProgressOrders}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Currently processing</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Completed Today</span>
                <CheckCircle className="h-4 w-4 text-[#00c875]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#00c875]">{completedToday}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Results delivered</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Scheduled Staff</span>
                <Users className="h-4 w-4 text-[#fdab3d]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#fdab3d]">{scheduledStaff}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Upcoming shifts</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 p-1">
            <TabsTrigger value="orders" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <FlaskConical className="h-4 w-4 mr-2" /> Diagnostic Orders
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" /> Results Management
            </TabsTrigger>
            <TabsTrigger value="scheduling" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Calendar className="h-4 w-4 mr-2" /> Staff Scheduling
            </TabsTrigger>
            <TabsTrigger value="integration" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Video className="h-4 w-4 mr-2" /> Telemedicine Integration
            </TabsTrigger>
          </TabsList>

          {/* Diagnostic Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search orders..." className="w-64 h-9 text-xs" />
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
                <Button variant="outline" size="sm" className="text-xs">
                  <Filter className="h-4 w-4 mr-1" /> Filter
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </div>
            </div>

            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#f0f2f7] dark:bg-slate-800">
                  <tr>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Order #</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Patient</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Type</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Priority</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Tests</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Status</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Ordered</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t border-[#e6e9ef] dark:border-slate-800 hover:bg-[#f8f9fa] dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold">{order.order_number}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold">
                          {order.patient?.first_name} {order.patient?.last_name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`h-6 w-6 rounded-lg ${getOrderTypeColor(order.order_type)} text-white flex items-center justify-center`}>
                          {getOrderTypeIcon(order.order_type)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getPriorityColor(order.priority) + " text-[10px]"}>
                          {order.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">{order.requested_tests.length} tests</td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusColor(order.status) + " text-[10px]"}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#676879]">
                        {new Date(order.ordered_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* Results Management Tab */}
          <TabsContent value="results" className="space-y-4">
            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#0073ea]" /> Results Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                  Results management interface placeholder - Review and approve diagnostic results
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Scheduling Tab */}
          <TabsContent value="scheduling" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search schedules..." className="w-64 h-9 text-xs" />
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
              <Button variant="outline" size="sm" className="text-xs">
                <Download className="h-4 w-4 mr-1" /> Export Schedule
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedules.map((schedule) => (
                <Card key={schedule.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center">
                          <UserRound className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-extrabold">
                            {schedule.staff?.first_name} {schedule.staff?.last_name}
                          </CardTitle>
                          <div className="text-[10px] text-[#676879]">{schedule.staff?.specialty}</div>
                        </div>
                      </div>
                      {schedule.is_on_call && (
                        <Badge className="bg-[#fdab3d] text-white text-[10px]">On Call</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Date</span>
                      <span className="font-bold">{new Date(schedule.shift_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Shift</span>
                      <span className="font-bold">{schedule.shift_start} - {schedule.shift_end}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Type</span>
                      <Badge variant="outline" className="text-[10px]">{schedule.shift_type}</Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">
                        {schedule.assigned_patients.length} patients assigned
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
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
            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <Video className="h-4 w-4 text-[#0073ea]" /> Telemedicine-Diagnostic Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
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