import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Clock, Users, Calendar, Plus, Search, Filter, Download, Settings,
  Eye, Edit, CheckCircle, AlertTriangle, Building2, MapPin, UserRound,
  Activity, BarChart3, RefreshCw, Timer, Fingerprint, LogOut, LogIn
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

interface MedicalShift {
  id: string;
  institution_id: string;
  shift_name: string;
  shift_type: string;
  department_id?: string;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  is_overnight: boolean;
  requires_on_call: boolean;
  staff_requirements: any[];
  auto_assign_rotation: boolean;
  rotation_pattern?: string;
  is_active: boolean;
}

interface ShiftAssignment {
  id: string;
  institution_id: string;
  shift_id: string;
  staff_id: string;
  shift_date: string;
  assigned_by?: string;
  assigned_at: string;
  status: string;
  notes?: string;
  staff?: {
    first_name: string;
    last_name: string;
    specialty?: string;
  };
  shift?: MedicalShift;
}

interface AttendanceRecord {
  id: string;
  institution_id: string;
  staff_id: string;
  shift_assignment_id?: string;
  date: string;
  clock_in_time?: string;
  clock_out_time?: string;
  clock_in_method: string;
  clock_out_method?: string;
  location?: string;
  biometric_verified: boolean;
  total_hours_worked?: number;
  overtime_hours?: number;
  status: string;
  early_departure?: boolean;
  late_arrival?: boolean;
  notes?: string;
  staff?: {
    first_name: string;
    last_name: string;
  };
}

interface BiometricDevice {
  id: string;
  institution_id: string;
  device_name: string;
  device_type: string;
  device_location: string;
  serial_number?: string;
  ip_address?: string;
  is_active: boolean;
  last_sync_at?: string;
  connection_status: string;
}

export const MedicalShiftHR = () => {
  const navigate = useNavigate();
  const { institution } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<MedicalShift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);

  // Form states
  const [shiftForm, setShiftForm] = useState({
    shift_name: "",
    shift_type: "day",
    department_id: "",
    start_time: "08:00",
    end_time: "17:00",
    break_duration_minutes: 60,
    is_overnight: false,
    requires_on_call: false,
    auto_assign_rotation: false,
    rotation_pattern: "",
  });

  const [assignmentForm, setAssignmentForm] = useState({
    shift_id: "",
    staff_id: "",
    shift_date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  useEffect(() => {
    if (institution) {
      fetchShiftData();
    }
  }, [institution]);

  const fetchShiftData = async () => {
    if (!institution) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      const [shiftsRes, assignmentsRes, attendanceRes, devicesRes] = await Promise.all([
        supabase.from("medical_shifts").select("*").eq("institution_id", institution.id).order("start_time"),
        supabase
          .from("shift_assignments")
          .select(`
            *,
            staff:profiles!staff_id(first_name, last_name, specialty),
            shift:medical_shifts(*)
          `)
          .eq("institution_id", institution.id)
          .gte("shift_date", today)
          .order("shift_date")
          .limit(50),
        supabase
          .from("attendance_records")
          .select(`
            *,
            staff:profiles!staff_id(first_name, last_name)
          `)
          .eq("institution_id", institution.id)
          .gte("date", today)
          .order("date", { ascending: false })
          .limit(50),
        supabase.from("biometric_devices").select("*").eq("institution_id", institution.id),
      ]);

      if (shiftsRes.data) setShifts(shiftsRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
      if (attendanceRes.data) setAttendance(attendanceRes.data);
      if (devicesRes.data) setDevices(devicesRes.data);
    } catch (error) {
      console.error("Error fetching shift data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("medical_shifts").insert({
        institution_id: institution.id,
        ...shiftForm,
        staff_requirements: [],
      });

      if (error) throw error;
      setShowShiftDialog(false);
      fetchShiftData();
    } catch (error) {
      console.error("Error creating shift:", error);
    }
  };

  const handleCreateAssignment = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("shift_assignments").insert({
        institution_id: institution.id,
        assigned_by: (await supabase.auth.getUser()).data.user?.id,
        ...assignmentForm,
        status: "scheduled",
      });

      if (error) throw error;
      setShowAssignmentDialog(false);
      fetchShiftData();
    } catch (error) {
      console.error("Error creating assignment:", error);
    }
  };

  const getShiftTypeColor = (type: string) => {
    switch (type) {
      case "day": return "bg-[#0073ea]";
      case "night": return "bg-[#6366f1]";
      case "evening": return "bg-[#fdab3d]";
      case "rotating": return "bg-[#a25ddc]";
      case "on_call": return "bg-[#e44258]";
      default: return "bg-[#676879]";
    }
  };

  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case "present": return "bg-[#00c875] text-white";
      case "absent": return "bg-[#e44258] text-white";
      case "late": return "bg-[#fdab3d] text-white";
      case "early_departure": return "bg-[#a25ddc] text-white";
      case "on_leave": return "bg-[#676879] text-white";
      default: return "bg-[#676879] text-white";
    }
  };

  const getDeviceStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-[#00c875] text-white";
      case "offline": return "bg-[#e44258] text-white";
      case "syncing": return "bg-[#fdab3d] text-white";
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
            <p className="text-xs text-[#676879]">Please select an institution to access shift HR.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-[#0073ea] hover:bg-[#0056b3]">
              Go to Institution Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeShifts = shifts.filter((s) => s.is_active).length;
  const todayAssignments = assignments.filter((a) => a.shift_date === new Date().toISOString().split('T')[0]).length;
  const presentToday = attendance.filter((a) => a.status === "present" && a.date === new Date().toISOString().split('T')[0]).length;
  const onlineDevices = devices.filter((d) => d.connection_status === "online").length;

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center shadow-xs">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Medical Shift HR & Attendance</h1>
              <p className="text-xs text-[#676879] font-medium">Shift Management & Biometric Attendance Tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs flex items-center gap-2">
                  <Plus className="h-4 w-4" /> New Shift
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Create Medical Shift</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Shift Name</Label>
                    <Input
                      value={shiftForm.shift_name}
                      onChange={(e) => setShiftForm({ ...shiftForm, shift_name: e.target.value })}
                      placeholder="e.g., Morning Shift"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Shift Type</Label>
                    <Select
                      value={shiftForm.shift_type}
                      onValueChange={(value) => setShiftForm({ ...shiftForm, shift_type: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day Shift</SelectItem>
                        <SelectItem value="night">Night Shift</SelectItem>
                        <SelectItem value="evening">Evening Shift</SelectItem>
                        <SelectItem value="rotating">Rotating Shift</SelectItem>
                        <SelectItem value="on_call">On Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Department</Label>
                    <Select
                      value={shiftForm.department_id}
                      onValueChange={(value) => setShiftForm({ ...shiftForm, department_id: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="icu">ICU</SelectItem>
                        <SelectItem value="surgery">Surgery</SelectItem>
                        <SelectItem value="laboratory">Laboratory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Start Time</Label>
                      <Input
                        type="time"
                        value={shiftForm.start_time}
                        onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">End Time</Label>
                      <Input
                        type="time"
                        value={shiftForm.end_time}
                        onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Break Duration (min)</Label>
                    <Input
                      type="number"
                      value={shiftForm.break_duration_minutes}
                      onChange={(e) => setShiftForm({ ...shiftForm, break_duration_minutes: parseInt(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Overnight Shift</Label>
                      <Switch
                        checked={shiftForm.is_overnight}
                        onCheckedChange={(checked) => setShiftForm({ ...shiftForm, is_overnight: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Requires On Call</Label>
                      <Switch
                        checked={shiftForm.requires_on_call}
                        onCheckedChange={(checked) => setShiftForm({ ...shiftForm, requires_on_call: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Auto Assign Rotation</Label>
                      <Switch
                        checked={shiftForm.auto_assign_rotation}
                        onCheckedChange={(checked) => setShiftForm({ ...shiftForm, auto_assign_rotation: checked })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateShift} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Create Shift
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
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Active Shifts</span>
                <Clock className="h-4 w-4 text-[#0073ea]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#0073ea]">{activeShifts}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Configured shifts</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Today's Assignments</span>
                <Users className="h-4 w-4 text-[#a25ddc]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#a25ddc]">{todayAssignments}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Staff scheduled</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Present Today</span>
                <CheckCircle className="h-4 w-4 text-[#00c875]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#00c875]">{presentToday}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Clock-in recorded</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Online Devices</span>
                <Fingerprint className="h-4 w-4 text-[#fdab3d]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#fdab3d]">{onlineDevices}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Biometric devices</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="shifts" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 p-1">
            <TabsTrigger value="shifts" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Clock className="h-4 w-4 mr-2" /> Shifts
            </TabsTrigger>
            <TabsTrigger value="assignments" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" /> Assignments
            </TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Fingerprint className="h-4 w-4 mr-2" /> Attendance
            </TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Settings className="h-4 w-4 mr-2" /> Biometric Devices
            </TabsTrigger>
          </TabsList>

          {/* Shifts Tab */}
          <TabsContent value="shifts" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold">Medical Shifts</h3>
              <Button variant="outline" size="sm" className="text-xs">
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shifts.map((shift) => (
                <Card key={shift.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${getShiftTypeColor(shift.shift_type)} text-white flex items-center justify-center`}>
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-extrabold">{shift.shift_name}</CardTitle>
                          <div className="text-[10px] text-[#676879]">{shift.shift_type}</div>
                        </div>
                      </div>
                      {shift.is_active ? (
                        <Badge className="bg-[#00c875] text-white text-[10px]">Active</Badge>
                      ) : (
                        <Badge className="bg-[#676879] text-white text-[10px]">Inactive</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Hours</span>
                      <span className="font-bold">{shift.start_time} - {shift.end_time}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Break</span>
                      <span className="font-bold">{shift.break_duration_minutes} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {shift.is_overnight && (
                        <Badge className="bg-[#6366f1] text-white text-[10px]">Overnight</Badge>
                      )}
                      {shift.requires_on_call && (
                        <Badge className="bg-[#e44258] text-white text-[10px]">On Call</Badge>
                      )}
                      {shift.auto_assign_rotation && (
                        <Badge className="bg-[#a25ddc] text-white text-[10px]">Auto Rotation</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">
                        {shift.staff_requirements.length} staff required
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

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search assignments..." className="w-64 h-9 text-xs" />
                <Select defaultValue="today">
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
              <div className="flex items-center gap-2">
                <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs">
                      <Plus className="h-4 w-4 mr-1" /> Assign Staff
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-extrabold">Assign Staff to Shift</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label className="text-xs font-bold">Shift</Label>
                        <Select
                          value={assignmentForm.shift_id}
                          onValueChange={(value) => setAssignmentForm({ ...assignmentForm, shift_id: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select shift" />
                          </SelectTrigger>
                          <SelectContent>
                            {shifts.map((shift) => (
                              <SelectItem key={shift.id} value={shift.id}>
                                {shift.shift_name}
                              </SelectItem>
                            ))}
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
                        <Label className="text-xs font-bold">Shift Date</Label>
                        <Input
                          type="date"
                          value={assignmentForm.shift_date}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, shift_date: e.target.value })}
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
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </div>
            </div>

            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#f0f2f7] dark:bg-slate-800">
                  <tr>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Staff</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Shift</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Date</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Hours</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Status</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Assigned</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="border-t border-[#e6e9ef] dark:border-slate-800 hover:bg-[#f8f9fa] dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold">
                          {assignment.staff?.first_name} {assignment.staff?.last_name}
                        </div>
                        <div className="text-[10px] text-[#676879]">{assignment.staff?.specialty}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold">{assignment.shift?.shift_name}</div>
                        <div className="text-[10px] text-[#676879]">{assignment.shift?.start_time} - {assignment.shift?.end_time}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#676879]">
                        {new Date(assignment.shift_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {assignment.shift?.break_duration_minutes} min break
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getAttendanceStatusColor(assignment.status) + " text-[10px]"}>
                          {assignment.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#676879]">
                        {new Date(assignment.assigned_at).toLocaleDateString()}
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

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search attendance..." className="w-64 h-9 text-xs" />
                <Select defaultValue="today">
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
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <RefreshCw className="h-4 w-4 mr-1" /> Sync Biometric
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
                    <th className="text-left text-xs font-extrabold px-4 py-3">Staff</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Date</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Clock In</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Clock Out</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Hours</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Overtime</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Status</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Biometric</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record.id} className="border-t border-[#e6e9ef] dark:border-slate-800 hover:bg-[#f8f9fa] dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold">
                          {record.staff?.first_name} {record.staff?.last_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#676879]">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {record.clock_in_time ? (
                          <div className="flex items-center gap-1">
                            <LogIn className="h-3 w-3 text-[#00c875]" />
                            {new Date(record.clock_in_time).toLocaleTimeString()}
                          </div>
                        ) : (
                          <span className="text-[#676879]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {record.clock_out_time ? (
                          <div className="flex items-center gap-1">
                            <LogOut className="h-3 w-3 text-[#e44258]" />
                            {new Date(record.clock_out_time).toLocaleTimeString()}
                          </div>
                        ) : (
                          <span className="text-[#676879]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold">
                        {record.total_hours_worked?.toFixed(1) || "-"}h
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-[#fdab3d]">
                        {record.overtime_hours?.toFixed(1) || "-"}h
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getAttendanceStatusColor(record.status) + " text-[10px]"}>
                          {record.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {record.biometric_verified ? (
                          <Fingerprint className="h-4 w-4 text-[#00c875]" />
                        ) : (
                          <Fingerprint className="h-4 w-4 text-[#676879]" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* Biometric Devices Tab */}
          <TabsContent value="devices" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold">Biometric Devices</h3>
              <Button variant="outline" size="sm" className="text-xs">
                <Plus className="h-4 w-4 mr-1" /> Add Device
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {devices.map((device) => (
                <Card key={device.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center">
                          <Fingerprint className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-extrabold">{device.device_name}</CardTitle>
                          <div className="text-[10px] text-[#676879]">{device.device_type}</div>
                        </div>
                      </div>
                      <Badge className={getDeviceStatusColor(device.connection_status) + " text-[10px]"}>
                        {device.connection_status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Location</span>
                      <span className="font-bold">{device.device_location}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Serial Number</span>
                      <span className="font-bold">{device.serial_number || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">IP Address</span>
                      <span className="font-bold">{device.ip_address || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">
                        Last Sync: {device.last_sync_at ? new Date(device.last_sync_at).toLocaleString() : "Never"}
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
        </Tabs>
      </div>
    </div>
  );
};

export default MedicalShiftHR;