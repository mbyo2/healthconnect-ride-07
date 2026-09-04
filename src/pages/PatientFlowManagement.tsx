import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Clock, TrendingUp, AlertTriangle, CheckCircle, ArrowRight,
  Settings, Plus, Filter, Search, Calendar, MapPin, Activity,
  Timer, UserRound, Building2, BarChart3, Eye, Edit, Play, Pause
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
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

interface PatientFlowStage {
  id: string;
  institution_id: string;
  stage_name: string;
  stage_order: number;
  stage_type: string;
  required_roles: any[];
  estimated_duration_minutes?: number;
  auto_proceed: boolean;
  skip_allowed: boolean;
}

interface PatientFlowTracking {
  id: string;
  patient_id: string;
  institution_id: string;
  appointment_id?: string;
  current_stage_id?: string;
  previous_stage_id?: string;
  status: string;
  started_at: string;
  completed_at?: string;
  current_stage_started_at: string;
  total_wait_time_minutes?: number;
  total_service_time_minutes?: number;
  notes?: string;
  patient?: {
    first_name: string;
    last_name: string;
  };
  current_stage?: PatientFlowStage;
}

interface PatientCapacity {
  id: string;
  institution_id: string;
  department_id?: string;
  date: string;
  max_capacity: number;
  current_load: number;
  available_slots: number;
  overbooking_allowed: boolean;
  overbooking_threshold: number;
}

export const PatientFlowManagement = () => {
  const navigate = useNavigate();
  const { institution } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<PatientFlowStage[]>([]);
  const [activeFlows, setActiveFlows] = useState<PatientFlowTracking[]>([]);
  const [capacity, setCapacity] = useState<PatientCapacity[]>([]);
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [showCapacityDialog, setShowCapacityDialog] = useState(false);

  // Form states
  const [stageForm, setStageForm] = useState({
    stage_name: "",
    stage_type: "check_in",
    stage_order: 1,
    estimated_duration_minutes: 15,
    auto_proceed: false,
    skip_allowed: false,
  });

  const [capacityForm, setCapacityForm] = useState({
    department_id: "",
    max_capacity: 100,
    overbooking_allowed: false,
    overbooking_threshold: 10,
  });

  useEffect(() => {
    if (institution) {
      fetchFlowData();
    }
  }, [institution]);

  const fetchFlowData = async () => {
    if (!institution) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      const [stagesRes, flowsRes, capacityRes] = await Promise.all([
        supabase.from("patient_flow_stages").select("*").eq("institution_id", institution.id).order("stage_order"),
        supabase
          .from("patient_flow_tracking")
          .select(`
            *,
            patient:profiles!patient_id(first_name, last_name),
            current_stage:patient_flow_stages(*)
          `)
          .eq("institution_id", institution.id)
          .eq("status", "active")
          .order("current_stage_started_at", { ascending: false }),
        supabase.from("patient_capacity").select("*").eq("institution_id", institution.id).eq("date", today),
      ]);

      if (stagesRes.data) setStages(stagesRes.data);
      if (flowsRes.data) setActiveFlows(flowsRes.data);
      if (capacityRes.data) setCapacity(capacityRes.data);
    } catch (error) {
      console.error("Error fetching flow data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStage = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("patient_flow_stages").insert({
        institution_id: institution.id,
        ...stageForm,
        required_roles: [],
      });

      if (error) throw error;
      setShowStageDialog(false);
      fetchFlowData();
    } catch (error) {
      console.error("Error creating stage:", error);
    }
  };

  const handleUpdateCapacity = async () => {
    if (!institution) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from("patient_capacity").upsert({
        institution_id: institution.id,
        date: today,
        ...capacityForm,
      });

      if (error) throw error;
      setShowCapacityDialog(false);
      fetchFlowData();
    } catch (error) {
      console.error("Error updating capacity:", error);
    }
  };

  const getStageTypeIcon = (type: string) => {
    switch (type) {
      case "check_in": return <Users className="h-4 w-4" />;
      case "triage": return <Activity className="h-4 w-4" />;
      case "consultation": return <UserRound className="h-4 w-4" />;
      case "diagnostic": return <Timer className="h-4 w-4" />;
      case "treatment": return <Activity className="h-4 w-4" />;
      case "billing": return <TrendingUp className="h-4 w-4" />;
      case "discharge": return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStageTypeColor = (type: string) => {
    switch (type) {
      case "check_in": return "bg-[#0073ea]";
      case "triage": return "bg-[#a25ddc]";
      case "consultation": return "bg-[#00c875]";
      case "diagnostic": return "bg-[#fdab3d]";
      case "treatment": return "bg-[#e44258]";
      case "billing": return "bg-[#6366f1]";
      case "discharge": return "bg-[#10b981]";
      default: return "bg-[#676879]";
    }
  };

  const calculateTimeInStage = (startedAt: string, estimatedDuration?: number) => {
    const started = new Date(startedAt);
    const now = new Date();
    const elapsedMinutes = (now.getTime() - started.getTime()) / (1000 * 60);
    
    if (estimatedDuration) {
      const percentage = Math.min((elapsedMinutes / estimatedDuration) * 100, 100);
      return { elapsedMinutes, percentage, isOverdue: elapsedMinutes > estimatedDuration };
    }
    return { elapsedMinutes, percentage: 0, isOverdue: false };
  };

  if (loading) return <LoadingScreen />;

  if (!institution) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-[#0073ea]" />
            <h2 className="text-xl font-extrabold">Institution Required</h2>
            <p className="text-xs text-[#676879]">Please select an institution to access patient flow management.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-[#0073ea] hover:bg-[#0056b3]">
              Go to Institution Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const averageWaitTime = activeFlows.reduce((sum, flow) => sum + (flow.total_wait_time_minutes || 0), 0) / (activeFlows.length || 1);
  const totalCapacity = capacity.reduce((sum, cap) => sum + cap.max_capacity, 0);
  const currentLoad = capacity.reduce((sum, cap) => sum + cap.current_load, 0);
  const utilizationRate = totalCapacity > 0 ? (currentLoad / totalCapacity) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Patient Flow Management</h1>
              <p className="text-xs text-[#676879] font-medium">Real-time Patient Journey & Capacity Optimization</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add Stage
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Create Flow Stage</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Stage Name</Label>
                    <Input
                      value={stageForm.stage_name}
                      onChange={(e) => setStageForm({ ...stageForm, stage_name: e.target.value })}
                      placeholder="e.g., Initial Assessment"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Stage Type</Label>
                    <Select
                      value={stageForm.stage_type}
                      onValueChange={(value) => setStageForm({ ...stageForm, stage_type: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="check_in">Check-in</SelectItem>
                        <SelectItem value="triage">Triage</SelectItem>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="diagnostic">Diagnostic</SelectItem>
                        <SelectItem value="treatment">Treatment</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="discharge">Discharge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Order</Label>
                      <Input
                        type="number"
                        value={stageForm.stage_order}
                        onChange={(e) => setStageForm({ ...stageForm, stage_order: parseInt(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Duration (min)</Label>
                      <Input
                        type="number"
                        value={stageForm.estimated_duration_minutes}
                        onChange={(e) => setStageForm({ ...stageForm, estimated_duration_minutes: parseInt(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Auto-Proceed</Label>
                      <Switch
                        checked={stageForm.auto_proceed}
                        onCheckedChange={(checked) => setStageForm({ ...stageForm, auto_proceed: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Skip Allowed</Label>
                      <Switch
                        checked={stageForm.skip_allowed}
                        onCheckedChange={(checked) => setStageForm({ ...stageForm, skip_allowed: checked })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateStage} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Create Stage
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showCapacityDialog} onOpenChange={setShowCapacityDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-xs font-bold">
                  <Settings className="h-4 w-4 mr-1" /> Capacity
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Configure Capacity</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Department</Label>
                    <Select
                      value={capacityForm.department_id}
                      onValueChange={(value) => setCapacityForm({ ...capacityForm, department_id: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="specialist">Specialist</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Max Capacity</Label>
                    <Input
                      type="number"
                      value={capacityForm.max_capacity}
                      onChange={(e) => setCapacityForm({ ...capacityForm, max_capacity: parseInt(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Overbooking Threshold</Label>
                    <Input
                      type="number"
                      value={capacityForm.overbooking_threshold}
                      onChange={(e) => setCapacityForm({ ...capacityForm, overbooking_threshold: parseInt(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Allow Overbooking</Label>
                    <Switch
                      checked={capacityForm.overbooking_allowed}
                      onCheckedChange={(checked) => setCapacityForm({ ...capacityForm, overbooking_allowed: checked })}
                    />
                  </div>
                  <Button onClick={handleUpdateCapacity} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Update Capacity
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
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Active Patients</span>
                <Users className="h-4 w-4 text-[#0073ea]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#0073ea]">{activeFlows.length}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Currently in flow</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Avg Wait Time</span>
                <Clock className="h-4 w-4 text-[#a25ddc]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#a25ddc]">{averageWaitTime.toFixed(0)}m</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Per patient</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Capacity Utilization</span>
                <BarChart3 className="h-4 w-4 text-[#00c875]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#00c875]">{utilizationRate.toFixed(0)}%</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">{currentLoad}/{totalCapacity} patients</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Flow Stages</span>
                <ArrowRight className="h-4 w-4 text-[#fdab3d]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#fdab3d]">{stages.length}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Configured stages</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 p-1">
            <TabsTrigger value="active" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Activity className="h-4 w-4 mr-2" /> Active Flows
            </TabsTrigger>
            <TabsTrigger value="stages" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <MapPin className="h-4 w-4 mr-2" /> Flow Stages
            </TabsTrigger>
            <TabsTrigger value="capacity" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" /> Capacity
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <TrendingUp className="h-4 w-4 mr-2" /> Analytics
            </TabsTrigger>
          </TabsList>

          {/* Active Flows Tab */}
          <TabsContent value="active" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search patients..." className="w-64 h-9 text-xs" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.stage_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <Filter className="h-4 w-4 mr-1" /> Filter
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <Calendar className="h-4 w-4 mr-1" Today />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeFlows.map((flow) => {
                const timeData = calculateTimeInStage(
                  flow.current_stage_started_at,
                  flow.current_stage?.estimated_duration_minutes
                );

                return (
                  <Card key={flow.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center">
                            <UserRound className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-extrabold">
                              {flow.patient?.first_name} {flow.patient?.last_name}
                            </CardTitle>
                            <div className="text-[10px] text-[#676879]">
                              Started: {new Date(flow.started_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <Badge className={timeData.isOverdue ? "bg-[#e44258] text-white text-[10px]" : "bg-[#00c875] text-white text-[10px]"}>
                          {timeData.isOverdue ? "Overdue" : "On Track"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {flow.current_stage && (
                        <div className="rounded-xl bg-[#f0f2f7] dark:bg-slate-800 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`h-6 w-6 rounded-lg ${getStageTypeColor(flow.current_stage.stage_type)} text-white flex items-center justify-center`}>
                              {getStageTypeIcon(flow.current_stage.stage_type)}
                            </div>
                            <div>
                              <div className="text-xs font-bold">{flow.current_stage.stage_name}</div>
                              <div className="text-[10px] text-[#676879]">
                                {timeData.elapsedMinutes.toFixed(0)} / {flow.current_stage.estimated_duration_minutes || 0} min
                              </div>
                            </div>
                          </div>
                          <Progress value={timeData.percentage} className="h-2" />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                        <div className="text-xs">
                          <span className="text-[#676879]">Total Wait: </span>
                          <span className="font-bold">{flow.total_wait_time_minutes || 0}m</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Play className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Flow Stages Tab */}
          <TabsContent value="stages" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold">Configured Flow Stages</h3>
              <Button variant="outline" size="sm" className="text-xs">
                <Edit className="h-4 w-4 mr-1" /> Reorder
              </Button>
            </div>

            <div className="space-y-2">
              {stages.map((stage, index) => (
                <Card key={stage.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-lg bg-[#f0f2f7] dark:bg-slate-800 flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className={`h-8 w-8 rounded-lg ${getStageTypeColor(stage.stage_type)} text-white flex items-center justify-center`}>
                          {getStageTypeIcon(stage.stage_type)}
                        </div>
                        <div>
                          <div className="text-sm font-bold">{stage.stage_name}</div>
                          <div className="text-[10px] text-[#676879]">
                            {stage.estimated_duration_minutes} min • {stage.stage_type}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {stage.auto_proceed && (
                          <Badge className="bg-[#00c875] text-white text-[10px]">Auto</Badge>
                        )}
                        {stage.skip_allowed && (
                          <Badge className="bg-[#a25ddc] text-white text-[10px]">Skip</Badge>
                        )}
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

          {/* Capacity Tab */}
          <TabsContent value="capacity" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {capacity.map((cap) => (
                <Card key={cap.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#0073ea]" />
                      {cap.department_id || "General"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Current Load</span>
                      <span className="font-bold">{cap.current_load} / {cap.max_capacity}</span>
                    </div>
                    <Progress value={(cap.current_load / cap.max_capacity) * 100} className="h-2" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Available</span>
                      <span className="font-bold text-[#00c875]">{cap.available_slots}</span>
                    </div>
                    {cap.overbooking_allowed && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#676879]">Overbooking</span>
                        <span className="font-bold text-[#fdab3d]">+{cap.overbooking_threshold}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#0073ea]" /> Flow Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                    Flow analytics chart placeholder
                  </div>
                </CardContent>
              </Card>
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#0073ea]" /> Bottlenecks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Triage Stage</span>
                      <span className="font-bold text-[#e44258]">12 min avg</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Consultation</span>
                      <span className="font-bold text-[#fdab3d]">8 min avg</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Billing</span>
                      <span className="font-bold text-[#00c875]">5 min avg</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PatientFlowManagement;