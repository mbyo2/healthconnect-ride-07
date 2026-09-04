import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Video, Phone, Calendar, Clock, Plus, Search, Filter, Download,
  Settings, CheckCircle, AlertTriangle, UserRound, FileText, Eye, Edit,
  Mic, Camera, MonitorSpeaker, Activity, TrendingUp, BarChart3,
  Building2, Users, MessageSquare
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
import { Switch } from "@/components/ui/switch";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

interface ClinicalWorkflowInstance {
  id: string;
  template_id?: string;
  patient_id: string;
  institution_id?: string;
  appointment_id?: string;
  video_consultation_id?: string;
  current_stage?: string;
  status: string;
  started_by?: string;
  started_at: string;
  completed_at?: string;
  stage_data: any;
  notes?: string;
  patient?: {
    first_name: string;
    last_name: string;
  };
}

interface ClinicalTask {
  id: string;
  workflow_instance_id?: string;
  task_name: string;
  task_type: string;
  assigned_to?: string;
  assigned_by?: string;
  department_id?: string;
  priority: string;
  status: string;
  due_date?: string;
  completed_at?: string;
  estimated_duration_minutes?: number;
  actual_duration_minutes?: number;
  dependencies: any[];
  required_resources: any[];
  notes?: string;
  assigned_to_profile?: {
    first_name: string;
    last_name: string;
  };
}

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
  patient?: {
    first_name: string;
    last_name: string;
  };
}

export const EnhancedTelemedicine = () => {
  const navigate = useNavigate();
  const { institution } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<ClinicalWorkflowInstance[]>([]);
  const [tasks, setTasks] = useState<ClinicalTask[]>([]);
  const [orders, setOrders] = useState<DiagnosticOrder[]>([]);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);

  // Form states
  const [workflowForm, setWorkflowForm] = useState({
    patient_id: "",
    appointment_id: "",
    video_consultation_id: "",
    notes: "",
  });

  const [taskForm, setTaskForm] = useState({
    task_name: "",
    task_type: "video_call",
    assigned_to: "",
    priority: "normal",
    due_date: "",
    estimated_duration_minutes: 30,
    notes: "",
  });

  const [orderForm, setOrderForm] = useState({
    patient_id: "",
    order_type: "lab",
    priority: "routine",
    clinical_indication: "",
    requested_tests: [] as any[],
    required_by: "",
    notes: "",
  });

  useEffect(() => {
    if (institution) {
      fetchTelemedicineData();
    }
  }, [institution]);

  const fetchTelemedicineData = async () => {
    if (!institution) return;

    try {
      const [workflowsRes, tasksRes, ordersRes] = await Promise.all([
        supabase
          .from("clinical_workflow_instances")
          .select(`
            *,
            patient:profiles!patient_id(first_name, last_name)
          `)
          .eq("institution_id", institution.id)
          .eq("status", "active")
          .order("started_at", { ascending: false })
          .limit(50),
        supabase
          .from("clinical_tasks")
          .select(`
            *,
            assigned_to_profile:profiles!assigned_to(first_name, last_name)
          `)
          .eq("status", "pending")
          .order("due_date", { ascending: true })
          .limit(50),
        supabase
          .from("diagnostic_orders")
          .select(`
            *,
            patient:profiles!patient_id(first_name, last_name)
          `)
          .eq("institution_id", institution.id)
          .eq("status", "pending")
          .order("ordered_at", { ascending: false })
          .limit(50),
      ]);

      if (workflowsRes.data) setWorkflows(workflowsRes.data);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
    } catch (error) {
      console.error("Error fetching telemedicine data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("clinical_workflow_instances").insert({
        institution_id: institution.id,
        ...workflowForm,
        started_by: (await supabase.auth.getUser()).data.user?.id,
        current_stage: "initial_assessment",
        status: "active",
        stage_data: {},
      });

      if (error) throw error;
      setShowWorkflowDialog(false);
      fetchTelemedicineData();
    } catch (error) {
      console.error("Error creating workflow:", error);
    }
  };

  const handleCreateTask = async () => {
    try {
      const { error } = await supabase.from("clinical_tasks").insert({
        ...taskForm,
        assigned_by: (await supabase.auth.getUser()).data.user?.id,
        dependencies: [],
        required_resources: [],
      });

      if (error) throw error;
      setShowTaskDialog(false);
      fetchTelemedicineData();
    } catch (error) {
      console.error("Error creating task:", error);
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
      fetchTelemedicineData();
    } catch (error) {
      console.error("Error creating order:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-[#00c875] text-white";
      case "in_progress": return "bg-[#0073ea] text-white";
      case "active": return "bg-[#a25ddc] text-white";
      case "pending": return "bg-[#fdab3d] text-white";
      case "cancelled": return "bg-[#e44258] text-white";
      default: return "bg-[#676879] text-white";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-[#e44258] text-white";
      case "high": return "bg-[#fdab3d] text-white";
      case "normal": return "bg-[#0073ea] text-white";
      case "low": return "bg-[#676879] text-white";
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
            <p className="text-xs text-[#676879]">Please select an institution to access enhanced telemedicine.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-[#0073ea] hover:bg-[#0056b3]">
              Go to Institution Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeWorkflows = workflows.filter((w) => w.status === "active").length;
  const pendingTasks = tasks.filter((t) => t.status === "pending").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const completedToday = workflows.filter((w) => {
    return w.status === "completed" && new Date(w.started_at).toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center shadow-xs">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Enhanced Telemedicine</h1>
              <p className="text-xs text-[#676879] font-medium">Integrated Telemedicine & Workflow Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showWorkflowDialog} onOpenChange={setShowWorkflowDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs flex items-center gap-2">
                  <Plus className="h-4 w-4" /> New Workflow
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Start Telemedicine Workflow</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Patient</Label>
                    <Select
                      value={workflowForm.patient_id}
                      onValueChange={(value) => setWorkflowForm({ ...workflowForm, patient_id: value })}
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
                    <Label className="text-xs font-bold">Associated Appointment (Optional)</Label>
                    <Select
                      value={workflowForm.appointment_id}
                      onValueChange={(value) => setWorkflowForm({ ...workflowForm, appointment_id: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select appointment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder">Select appointment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Video Consultation (Optional)</Label>
                    <Select
                      value={workflowForm.video_consultation_id}
                      onValueChange={(value) => setWorkflowForm({ ...workflowForm, video_consultation_id: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select consultation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder">Select consultation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Notes</Label>
                    <Textarea
                      value={workflowForm.notes}
                      onChange={(e) => setWorkflowForm({ ...workflowForm, notes: e.target.value })}
                      placeholder="Workflow notes..."
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCreateWorkflow} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Start Workflow
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
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Active Workflows</span>
                <Activity className="h-4 w-4 text-[#0073ea]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#0073ea]">{activeWorkflows}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Currently running</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Pending Tasks</span>
                <CheckCircle className="h-4 w-4 text-[#a25ddc]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#a25ddc]">{pendingTasks}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Awaiting completion</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Diagnostic Orders</span>
                <FileText className="h-4 w-4 text-[#fdab3d]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#fdab3d]">{pendingOrders}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Remote diagnostics</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Completed Today</span>
                <TrendingUp className="h-4 w-4 text-[#00c875]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#00c875]">{completedToday}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Workflow sessions</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="workflows" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 p-1">
            <TabsTrigger value="workflows" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Activity className="h-4 w-4 mr-2" /> Active Workflows
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <CheckCircle className="h-4 w-4 mr-2" /> Clinical Tasks
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" /> Remote Diagnostics
            </TabsTrigger>
            <TabsTrigger value="integration" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <MonitorSpeaker className="h-4 w-4 mr-2" /> Device Integration
            </TabsTrigger>
          </TabsList>

          {/* Active Workflows Tab */}
          <TabsContent value="workflows" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search workflows..." className="w-64 h-9 text-xs" />
                <Select defaultValue="active">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="all">All Workflows</SelectItem>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflows.map((workflow) => (
                <Card key={workflow.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center">
                          <Activity className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-extrabold">
                            {workflow.patient?.first_name} {workflow.patient?.last_name}
                          </CardTitle>
                          <div className="text-[10px] text-[#676879]">
                            Started: {new Date(workflow.started_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(workflow.status) + " text-[10px]"}>
                        {workflow.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Current Stage</span>
                      <span className="font-bold">{workflow.current_stage || "Not Started"}</span>
                    </div>
                    {workflow.video_consultation_id && (
                      <div className="flex items-center gap-2 text-xs">
                        <Video className="h-3 w-3 text-[#0073ea]" />
                        <span className="text-[#676879]">Associated video consultation</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">
                        {Object.keys(workflow.stage_data || {}).length} stages completed
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Clinical Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search tasks..." className="w-64 h-9 text-xs" />
                <Select defaultValue="pending">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="all">All Tasks</SelectItem>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => (
                <Card key={task.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-extrabold">{task.task_name}</CardTitle>
                        <div className="text-[10px] text-[#676879]">{task.task_type}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className={getPriorityColor(task.priority) + " text-[10px]"}>
                          {task.priority}
                        </Badge>
                        <Badge className={getStatusColor(task.status) + " text-[10px]"}>
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Assigned To</span>
                      <span className="font-bold">
                        {task.assigned_to_profile
                          ? `${task.assigned_to_profile.first_name} ${task.assigned_to_profile.last_name}`
                          : "Unassigned"}
                      </span>
                    </div>
                    {task.due_date && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#676879]">Due Date</span>
                        <span className={`font-bold ${new Date(task.due_date) < new Date() && task.status !== "completed" ? "text-[#e44258]" : ""}`}>
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {task.estimated_duration_minutes && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#676879]">Est. Duration</span>
                        <span className="font-bold">{task.estimated_duration_minutes} min</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">
                        {task.dependencies.length} dependencies
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Remote Diagnostics Tab */}
          <TabsContent value="diagnostics" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search diagnostic orders..." className="w-64 h-9 text-xs" />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map((order) => (
                <Card key={order.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[#a25ddc] text-white flex items-center justify-center">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-extrabold">
                            {order.patient?.first_name} {order.patient?.last_name}
                          </CardTitle>
                          <div className="text-[10px] text-[#676879]">{order.order_number}</div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(order.status) + " text-[10px]"}>
                        {order.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Order Type</span>
                      <Badge variant="outline" className="text-[10px]">{order.order_type}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Priority</span>
                      <Badge className={getPriorityColor(order.priority) + " text-[10px]"}>
                        {order.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">
                        {order.requested_tests.length} tests requested
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Device Integration Tab */}
          <TabsContent value="integration" className="space-y-4">
            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <MonitorSpeaker className="h-4 w-4 text-[#0073ea]" /> IoT Device Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                  IoT device integration interface placeholder - Connect health monitoring devices for remote patient data
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedTelemedicine;