import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, UserPlus, Search, Filter, Download, Settings, Eye, Edit,
  Trash2, Calendar, Clock, CheckCircle, AlertTriangle, Shield,
  Stethoscope, Activity, FlaskConical, Building2, UserRound
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
import { Textarea } from "@/components/ui/textarea";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

interface CareTeamRole {
  id: string;
  role_name: string;
  role_type: string;
  permissions: any;
  responsibilities: any[];
  required_qualifications: any[];
  can_prescribe: boolean;
  can_order_tests: boolean;
  can_perform_procedures: boolean;
}

interface CareTeamAssignment {
  id: string;
  patient_id: string;
  institution_id?: string;
  staff_id: string;
  role_id?: string;
  assignment_type: string;
  assigned_by?: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  notes?: string;
  patient?: {
    first_name: string;
    last_name: string;
  };
  staff?: {
    first_name: string;
    last_name: string;
    specialty?: string;
  };
  role?: CareTeamRole;
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

export const CareTeamManagement = () => {
  const navigate = useNavigate();
  const { institution } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<CareTeamRole[]>([]);
  const [assignments, setAssignments] = useState<CareTeamAssignment[]>([]);
  const [tasks, setTasks] = useState<ClinicalTask[]>([]);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);

  // Form states
  const [assignmentForm, setAssignmentForm] = useState({
    patient_id: "",
    staff_id: "",
    role_id: "",
    assignment_type: "primary",
    expires_at: "",
    notes: "",
  });

  const [taskForm, setTaskForm] = useState({
    task_name: "",
    task_type: "assessment",
    assigned_to: "",
    priority: "normal",
    due_date: "",
    estimated_duration_minutes: 30,
    notes: "",
  });

  useEffect(() => {
    if (institution) {
      fetchCareTeamData();
    }
  }, [institution]);

  const fetchCareTeamData = async () => {
    if (!institution) return;

    try {
      const [rolesRes, assignmentsRes, tasksRes] = await Promise.all([
        supabase.from("care_team_roles").select("*").order("role_name"),
        supabase
          .from("care_team_assignments")
          .select(`
            *,
            patient:profiles!patient_id(first_name, last_name),
            staff:profiles!staff_id(first_name, last_name, specialty),
            role:care_team_roles(*)
          `)
          .eq("institution_id", institution.id)
          .order("assigned_at", { ascending: false })
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
      ]);

      if (rolesRes.data) setRoles(rolesRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
      if (tasksRes.data) setTasks(tasksRes.data);
    } catch (error) {
      console.error("Error fetching care team data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("care_team_assignments").insert({
        institution_id: institution.id,
        ...assignmentForm,
        assigned_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;
      setShowAssignmentDialog(false);
      fetchCareTeamData();
    } catch (error) {
      console.error("Error creating assignment:", error);
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
      fetchCareTeamData();
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const getRoleTypeIcon = (type: string) => {
    switch (type) {
      case "clinical": return <Stethoscope className="h-4 w-4" />;
      case "nursing": return <Activity className="h-4 w-4" />;
      case "technical": return <FlaskConical className="h-4 w-4" />;
      case "administrative": return <Settings className="h-4 w-4" />;
      case "support": return <Users className="h-4 w-4" />;
      default: return <UserRound className="h-4 w-4" />;
    }
  };

  const getRoleTypeColor = (type: string) => {
    switch (type) {
      case "clinical": return "bg-[#0073ea]";
      case "nursing": return "bg-[#00c875]";
      case "technical": return "bg-[#a25ddc]";
      case "administrative": return "bg-[#fdab3d]";
      case "support": return "bg-[#6366f1]";
      default: return "bg-[#676879]";
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-[#00c875] text-white";
      case "in_progress": return "bg-[#0073ea] text-white";
      case "pending": return "bg-[#a25ddc] text-white";
      case "cancelled": return "bg-[#e44258] text-white";
      case "deferred": return "bg-[#fdab3d] text-white";
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
            <p className="text-xs text-[#676879]">Please select an institution to access care team management.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-[#0073ea] hover:bg-[#0056b3]">
              Go to Institution Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeAssignments = assignments.filter((a) => a.is_active).length;
  const pendingTasks = tasks.filter((t) => t.status === "pending").length;
  const totalRoles = roles.length;
  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date || t.status === "completed") return false;
    return new Date(t.due_date) < new Date();
  }).length;

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
              <h1 className="text-xl font-extrabold">Care Team Management</h1>
              <p className="text-xs text-[#676879] font-medium">Interdisciplinary Team Coordination</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Assign Team
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Assign Care Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Patient</Label>
                    <Select
                      value={assignmentForm.patient_id}
                      onValueChange={(value) => setAssignmentForm({ ...assignmentForm, patient_id: value })}
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
                    <Label className="text-xs font-bold">Staff Member</Label>
                    <Select
                      value={assignmentForm.staff_id}
                      onValueChange={(value) => setAssignmentForm({ ...assignmentForm, staff_id: value })}
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
                    <Label className="text-xs font-bold">Role</Label>
                    <Select
                      value={assignmentForm.role_id}
                      onValueChange={(value) => setAssignmentForm({ ...assignmentForm, role_id: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.role_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Assignment Type</Label>
                    <Select
                      value={assignmentForm.assignment_type}
                      onValueChange={(value) => setAssignmentForm({ ...assignmentForm, assignment_type: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary</SelectItem>
                        <SelectItem value="consulting">Consulting</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                        <SelectItem value="temporary">Temporary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Expires At (Optional)</Label>
                    <Input
                      type="date"
                      value={assignmentForm.expires_at}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, expires_at: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Notes</Label>
                    <Textarea
                      value={assignmentForm.notes}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                      placeholder="Assignment notes..."
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCreateAssignment} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Create Assignment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-xs font-bold">
                  <Settings className="h-4 w-4 mr-1" /> New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Create Clinical Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Task Name</Label>
                    <Input
                      value={taskForm.task_name}
                      onChange={(e) => setTaskForm({ ...taskForm, task_name: e.target.value })}
                      placeholder="e.g., Patient Assessment"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Task Type</Label>
                    <Select
                      value={taskForm.task_type}
                      onValueChange={(value) => setTaskForm({ ...taskForm, task_type: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assessment">Assessment</SelectItem>
                        <SelectItem value="lab_order">Lab Order</SelectItem>
                        <SelectItem value="radiology_order">Radiology Order</SelectItem>
                        <SelectItem value="medication">Medication</SelectItem>
                        <SelectItem value="procedure">Procedure</SelectItem>
                        <SelectItem value="documentation">Documentation</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="video_call">Video Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Assign To</Label>
                    <Select
                      value={taskForm.assigned_to}
                      onValueChange={(value) => setTaskForm({ ...taskForm, assigned_to: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select staff" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder">Select staff member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Priority</Label>
                      <Select
                        value={taskForm.priority}
                        onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Due Date</Label>
                      <Input
                        type="date"
                        value={taskForm.due_date}
                        onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Estimated Duration (min)</Label>
                    <Input
                      type="number"
                      value={taskForm.estimated_duration_minutes}
                      onChange={(e) => setTaskForm({ ...taskForm, estimated_duration_minutes: parseInt(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Notes</Label>
                    <Textarea
                      value={taskForm.notes}
                      onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                      placeholder="Task notes..."
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCreateTask} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Create Task
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
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Active Assignments</span>
                <Users className="h-4 w-4 text-[#0073ea]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#0073ea]">{activeAssignments}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Current team members</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Pending Tasks</span>
                <Clock className="h-4 w-4 text-[#a25ddc]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#a25ddc]">{pendingTasks}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Awaiting completion</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Available Roles</span>
                <Shield className="h-4 w-4 text-[#00c875]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#00c875]">{totalRoles}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Configured roles</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Overdue Tasks</span>
                <AlertTriangle className="h-4 w-4 text-[#e44258]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#e44258]">{overdueTasks}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Require attention</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="assignments" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 p-1">
            <TabsTrigger value="assignments" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" /> Team Assignments
            </TabsTrigger>
            <TabsTrigger value="roles" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Shield className="h-4 w-4 mr-2" /> Role Definitions
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <CheckCircle className="h-4 w-4 mr-2" /> Clinical Tasks
            </TabsTrigger>
            <TabsTrigger value="workflows" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Activity className="h-4 w-4 mr-2" /> Workflows
            </TabsTrigger>
          </TabsList>

          {/* Team Assignments Tab */}
          <TabsContent value="assignments" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search assignments..." className="w-64 h-9 text-xs" />
                <Select defaultValue="active">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="all">All Assignments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>

            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#f0f2f7] dark:bg-slate-800">
                  <tr>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Patient</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Staff Member</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Role</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Type</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Assigned</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Status</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="border-t border-[#e6e9ef] dark:border-slate-800 hover:bg-[#f8f9fa] dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold">
                          {assignment.patient?.first_name} {assignment.patient?.last_name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold">
                          {assignment.staff?.first_name} {assignment.staff?.last_name}
                        </div>
                        <div className="text-[10px] text-[#676879]">{assignment.staff?.specialty}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {assignment.role?.role_name || "N/A"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {assignment.assignment_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#676879]">
                        {new Date(assignment.assigned_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {assignment.is_active ? (
                          <Badge className="bg-[#00c875] text-white text-[10px]">Active</Badge>
                        ) : (
                          <Badge className="bg-[#676879] text-white text-[10px]">Inactive</Badge>
                        )}
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

          {/* Role Definitions Tab */}
          <TabsContent value="roles" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold">Care Team Roles</h3>
              <Button variant="outline" size="sm" className="text-xs">
                <Settings className="h-4 w-4 mr-1" /> Configure Roles
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => (
                <Card key={role.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${getRoleTypeColor(role.role_type)} text-white flex items-center justify-center`}>
                          {getRoleTypeIcon(role.role_type)}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-extrabold">{role.role_name}</CardTitle>
                          <div className="text-[10px] text-[#676879]">{role.role_type}</div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      {role.can_prescribe && (
                        <Badge className="bg-[#0073ea] text-white text-[10px]">Can Prescribe</Badge>
                      )}
                      {role.can_order_tests && (
                        <Badge className="bg-[#a25ddc] text-white text-[10px]">Can Order Tests</Badge>
                      )}
                      {role.can_perform_procedures && (
                        <Badge className="bg-[#00c875] text-white text-[10px]">Can Perform Procedures</Badge>
                      )}
                    </div>
                    <div className="text-xs text-[#676879]">
                      {role.responsibilities.length} responsibilities
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">
                        {role.required_qualifications.length} qualifications required
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
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
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

          {/* Workflows Tab */}
          <TabsContent value="workflows" className="space-y-4">
            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#0073ea]" /> Clinical Workflow Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                  Workflow template designer placeholder - Create and manage clinical workflows
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CareTeamManagement;