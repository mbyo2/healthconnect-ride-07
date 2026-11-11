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

      if (stagesRes.data) setStages(stagesRes.data as any);
      if (flowsRes.data) setActiveFlows(flowsRes.data as any);
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
      case "check_in": return "bg-primary-500";
      case "triage": return "bg-purple-500";
      case "consultation": return "bg-success-500";
      case "diagnostic": return "bg-warning-500";
      case "treatment": return "bg-error-500";
      case "billing": return "bg-indigo-500";
      case "discharge": return "bg-success-500";
      default: return "bg-muted-foreground";
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
      <div className="flex items-center justify-center p-6 min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-primary-500" />
            <h2 className="text-xl font-semibold">Institution Required</h2>
            <p className="text-xs text-muted-foreground">Please select an institution to access patient flow management.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-primary-500 hover:bg-primary-600">
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
    <div className="pb-16">
      {/* Header */}
      <div className="doc-page-header px-4 sm:px-6 py-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold truncate">Patient Flow Management</h1>
              <p className="text-xs text-muted-foreground font-medium truncate">Real-time Patient Journey & Capacity Optimization</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Add Stage
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Create Flow Stage</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-semibold">Stage Name</Label>
                    <Input
                      value={stageForm.stage_name}
                      onChange={(e) => setStageForm({ ...stageForm, stage_name: e.target.value })}
                      placeholder="e.g., Initial Assessment"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Stage Type</Label>
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
                      <Label className="text-xs font-semibold">Order</Label>
                      <Input
                        type="number"
                        value={stageForm.stage_order}
                        onChange={(e) => setStageForm({ ...stageForm, stage_order: parseInt(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Duration (min)</Label>
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
                      <Label className="text-xs font-semibold">Auto-Proceed</Label>
                      <Switch
                        checked={stageForm.auto_proceed}
                        onCheckedChange={(checked) => setStageForm({ ...stageForm, auto_proceed: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Skip Allowed</Label>
                      <Switch
                        checked={stageForm.skip_allowed}
                        onCheckedChange={(checked) => setStageForm({ ...stageForm, skip_allowed: checked })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateStage} className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold">
                    Create Stage
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showCapacityDialog} onOpenChange={setShowCapacityDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-xs font-semibold">
                  <Settings className="h-4 w-4 mr-1" /> Capacity
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Configure Capacity</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-semibold">Department</Label>
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
                    <Label className="text-xs font-semibold">Max Capacity</Label>
                    <Input
                      type="number"
                      value={capacityForm.max_capacity}
                      onChange={(e) => setCapacityForm({ ...capacityForm, max_capacity: parseInt(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Overbooking Threshold</Label>
                    <Input
                      type="number"
                      value={capacityForm.overbooking_threshold}
                      onChange={(e) => setCapacityForm({ ...capacityForm, overbooking_threshold: parseInt(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Allow Overbooking</Label>
                    <Switch
                      checked={capacityForm.overbooking_allowed}
                      onCheckedChange={(checked) => setCapacityForm({ ...capacityForm, overbooking_allowed: checked })}
                    />
                  </div>
                  <Button onClick={handleUpdateCapacity} className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold">
                    Update Capacity
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
                <span className="text-[13px] font-medium text-muted-foreground">Active Patients</span>
                <Users className="h-4 w-4 text-primary-500" />
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{activeFlows.length}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">Currently in flow</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-muted-foreground">Avg Wait Time</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{averageWaitTime.toFixed(0)}m</div>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">Per patient</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-muted-foreground">Capacity Utilization</span>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{utilizationRate.toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">{currentLoad}/{totalCapacity} patients</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-muted-foreground">Flow Stages</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{stages.length}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">Configured stages</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-card border border-border p-1">
            <TabsTrigger value="active" className="">
              <Activity className="h-4 w-4 mr-2" /> Active Flows
            </TabsTrigger>
            <TabsTrigger value="stages" className="">
              <MapPin className="h-4 w-4 mr-2" /> Flow Stages
            </TabsTrigger>
            <TabsTrigger value="capacity" className="">
              <BarChart3 className="h-4 w-4 mr-2" /> Capacity
            </TabsTrigger>
            <TabsTrigger value="analytics" className="">
              <TrendingUp className="h-4 w-4 mr-2" /> Analytics
            </TabsTrigger>
          </TabsList>

          {/* Active Flows Tab */}
          <TabsContent value="active" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input type="search" aria-label="Search patients..." className="w-64 h-9 text-xs" />
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
                  <Calendar className="h-4 w-4 mr-1" /> Today
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeFlows.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground mb-1">No patients in flow right now</p>
                  <p className="text-sm text-muted-foreground mb-4">Check a patient in to start tracking their journey through the facility.</p>
                  <Button onClick={() => navigate(`/kiosk?institution=${institution.id}`)} className="gap-1.5 min-h-[44px]"><UserRound className="h-4 w-4" /> Check In Patient</Button>
                </div>
              ) : (
              activeFlows.map((flow) => {
                const timeData = calculateTimeInStage(
                  flow.current_stage_started_at,
                  flow.current_stage?.estimated_duration_minutes
                );

                return (
                  <Card key={flow.id} className="border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center">
                            <UserRound className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold">
                              {flow.patient?.first_name} {flow.patient?.last_name}
                            </CardTitle>
                            <div className="text-xs text-muted-foreground">
                              Started: {new Date(flow.started_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <Badge className={timeData.isOverdue ? "bg-error-500 text-white text-xs" : "bg-success-500 text-white text-xs"}>
                          {timeData.isOverdue ? "Overdue" : "On Track"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {flow.current_stage && (
                        <div className="rounded-xl bg-muted p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`h-6 w-6 rounded-lg ${getStageTypeColor(flow.current_stage.stage_type)} text-white flex items-center justify-center`}>
                              {getStageTypeIcon(flow.current_stage.stage_type)}
                            </div>
                            <div>
                              <div className="text-xs font-semibold">{flow.current_stage.stage_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {timeData.elapsedMinutes.toFixed(0)} / {flow.current_stage.estimated_duration_minutes || 0} min
                              </div>
                            </div>
                          </div>
                          <Progress value={timeData.percentage} className="h-2" />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="text-xs">
                          <span className="text-muted-foreground">Total Wait: </span>
                          <span className="font-semibold">{flow.total_wait_time_minutes || 0}m</span>
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
              }))}
            </div>
          </TabsContent>

          {/* Flow Stages Tab */}
          <TabsContent value="stages" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Configured Flow Stages</h3>
              <Button variant="outline" size="sm" className="text-xs">
                <Edit className="h-4 w-4 mr-1" /> Reorder
              </Button>
            </div>

            <div className="space-y-2">
              {stages.map((stage, index) => (
                <Card key={stage.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className={`h-8 w-8 rounded-lg ${getStageTypeColor(stage.stage_type)} text-white flex items-center justify-center`}>
                          {getStageTypeIcon(stage.stage_type)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{stage.stage_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {stage.estimated_duration_minutes} min • {stage.stage_type}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {stage.auto_proceed && (
                          <Badge className="bg-success-500 text-white text-xs">Auto</Badge>
                        )}
                        {stage.skip_allowed && (
                          <Badge className="bg-purple-500 text-white text-xs">Skip</Badge>
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
                <Card key={cap.id} className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary-500" />
                      {cap.department_id || "General"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Current Load</span>
                      <span className="font-semibold">{cap.current_load} / {cap.max_capacity}</span>
                    </div>
                    <Progress value={(cap.current_load / cap.max_capacity) * 100} className="h-2" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Available</span>
                      <span className="font-semibold text-success-500">{cap.available_slots}</span>
                    </div>
                    {cap.overbooking_allowed && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Overbooking</span>
                        <span className="font-semibold text-warning-500">+{cap.overbooking_threshold}</span>
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
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary-500" /> Flow Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">
                    Flow analytics chart placeholder
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary-500" /> Bottlenecks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Triage Stage</span>
                      <span className="font-semibold text-error-500">12 min avg</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Consultation</span>
                      <span className="font-semibold text-warning-500">8 min avg</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Billing</span>
                      <span className="font-semibold text-success-500">5 min avg</span>
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