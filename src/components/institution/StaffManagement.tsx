import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Trash2, Loader2, Upload, UserPlus, Users, Calendar,
  Mail, Clock, CheckCircle, XCircle, AlertCircle, Search, Download
} from "lucide-react";

interface StaffMember {
  id: string;
  provider_id: string | null;
  role: string;
  department: string | null;
  is_active: boolean | null;
  start_date: string | null;
  employee_id: string | null;
  phone: string | null;
  email: string | null;
  qualification: string | null;
  license_number: string | null;
  specialty: string | null;
  staff_type: string | null;
  employment_type: string | null;
  hired_date: string | null;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface Invitation {
  id: string;
  email: string;
  staff_role: string;
  department_name: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  token: string | null;
}

interface Shift {
  id: string;
  staff_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  status: string;
  notes: string | null;
  staff?: StaffMember;
}

const STAFF_ROLES = [
  { value: 'doctor', label: 'Doctor / Surgeon' },
  { value: 'nurse', label: 'Nurse / Midwife' },
  { value: 'lab_technician', label: 'Lab Technician' },
  { value: 'radiologist', label: 'Radiologist' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'billing_clerk', label: 'Billing Clerk' },
  { value: 'admin', label: 'Administrator' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

const STAFF_TYPES = [
  { value: 'clinical', label: 'Clinical' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'admin', label: 'Administrative' },
  { value: 'support', label: 'Support' },
  { value: 'lab', label: 'Laboratory' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'radiology', label: 'Radiology' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'security', label: 'Security' },
  { value: 'management', label: 'Management' },
];

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'visiting', label: 'Visiting' },
  { value: 'intern', label: 'Intern' },
  { value: 'resident', label: 'Resident' },
];

export const StaffManagement = ({ institutionId }: { institutionId: string }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("directory");
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [inviteDept, setInviteDept] = useState("");
  const [inviteSpecialty, setInviteSpecialty] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Add staff form
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("staff");
  const [addStaffType, setAddStaffType] = useState("clinical");
  const [addEmploymentType, setAddEmploymentType] = useState("full_time");
  const [addDept, setAddDept] = useState("");
  const [addSpecialty, setAddSpecialty] = useState("");
  const [addQualification, setAddQualification] = useState("");
  const [addLicense, setAddLicense] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    if (institutionId) {
      fetchAll();
    }
  }, [institutionId]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchStaff(), fetchInvitations(), fetchDepartments(), fetchShifts()]);
    setLoading(false);
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('institution_staff')
        .select('*, profile:profiles!institution_staff_provider_id_fkey(first_name, last_name, email, avatar_url)')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff((data as any) || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations((data as any) || []);
    } catch (error) {
      console.error("Error fetching invitations:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('hospital_departments')
        .select('id, name, code')
        .eq('hospital_id', institutionId)
        .eq('is_active', true);

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('institution_id', institutionId)
        .gte('shift_date', new Date().toISOString().split('T')[0])
        .order('shift_date', { ascending: true })
        .limit(50);

      if (error) throw error;
      setShifts((data as any) || []);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setIsInviting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('staff_invitations')
        .insert({
          institution_id: institutionId,
          email: inviteEmail.toLowerCase().trim(),
          staff_role: inviteRole,
          department_name: inviteDept || null,
          specialty: inviteSpecialty || null,
          invited_by: user?.id,
        } as any);

      if (error) throw error;
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("staff");
      setInviteDept("");
      setInviteSpecialty("");
      setInviteDialogOpen(false);
      fetchInvitations();
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleAddStaff = async () => {
    if (!addEmail) return;
    setIsAdding(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', addEmail.toLowerCase().trim())
        .single();

      if (profileError || !profileData) {
        toast.error("User not found. Send an invitation instead.");
        return;
      }

      const { error } = await supabase
        .from('institution_staff')
        .insert({
          institution_id: institutionId,
          provider_id: profileData.id,
          role: addRole,
          department: addDept || null,
          staff_type: addStaffType,
          employment_type: addEmploymentType,
          specialty: addSpecialty || null,
          qualification: addQualification || null,
          license_number: addLicense || null,
          phone: addPhone || null,
          email: addEmail.toLowerCase().trim(),
          is_active: true,
          start_date: new Date().toISOString().split('T')[0],
          hired_date: new Date().toISOString().split('T')[0],
        } as any);

      if (error) throw error;
      toast.success("Staff member added successfully");
      setAddDialogOpen(false);
      resetAddForm();
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || "Failed to add staff member");
    } finally {
      setIsAdding(false);
    }
  };

  const resetAddForm = () => {
    setAddEmail("");
    setAddRole("staff");
    setAddStaffType("clinical");
    setAddEmploymentType("full_time");
    setAddDept("");
    setAddSpecialty("");
    setAddQualification("");
    setAddLicense("");
    setAddPhone("");
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const emailIdx = headers.indexOf('email');
      const roleIdx = headers.indexOf('role');
      const deptIdx = headers.indexOf('department');
      const specialtyIdx = headers.indexOf('specialty');

      if (emailIdx === -1) {
        toast.error("CSV must have an 'email' column");
        return;
      }

      let successCount = 0;
      let failCount = 0;
      const { data: { user } } = await supabase.auth.getUser();

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const email = cols[emailIdx]?.toLowerCase();
        if (!email) continue;

        try {
          const { error } = await supabase
            .from('staff_invitations')
            .insert({
              institution_id: institutionId,
              email,
              staff_role: roleIdx >= 0 ? cols[roleIdx] || 'staff' : 'staff',
              department_name: deptIdx >= 0 ? cols[deptIdx] || null : null,
              specialty: specialtyIdx >= 0 ? cols[specialtyIdx] || null : null,
              invited_by: user?.id,
            } as any);

          if (error) {
            failCount++;
          } else {
            successCount++;
          }
        } catch {
          failCount++;
        }
      }

      toast.success(`Bulk invite: ${successCount} sent, ${failCount} failed`);
      fetchInvitations();
    };
    reader.readAsText(file);
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const handleRevokeInvitation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('staff_invitations')
        .update({ status: 'revoked' } as any)
        .eq('id', id);

      if (error) throw error;
      toast.success("Invitation revoked");
      fetchInvitations();
    } catch (error) {
      toast.error("Failed to revoke invitation");
    }
  };

  const handleDeactivateStaff = async (id: string) => {
    try {
      const { error } = await supabase
        .from('institution_staff')
        .update({ is_active: false, end_date: new Date().toISOString().split('T')[0] })
        .eq('id', id);

      if (error) throw error;
      toast.success("Staff deactivated");
      fetchStaff();
    } catch (error) {
      toast.error("Failed to deactivate staff");
    }
  };

  const handleDownloadTemplate = () => {
    const csv = "email,role,department,specialty\njohn@example.com,doctor,Cardiology,Cardiologist\njane@example.com,nurse,ICU,Critical Care";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredStaff = staff.filter(s => {
    const name = `${s.profile?.first_name || ''} ${s.profile?.last_name || ''}`.toLowerCase();
    const email = (s.email || s.profile?.email || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || email.includes(term) || (s.role || '').toLowerCase().includes(term);
  });

  const activeStaff = staff.filter(s => s.is_active !== false);
  const pendingInvites = invitations.filter(i => i.status === 'pending');

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
          <div className="text-2xl font-bold">{activeStaff.length}</div>
          <div className="text-xs text-muted-foreground">Active Staff</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Mail className="h-5 w-5 mx-auto mb-1 text-amber-500" />
          <div className="text-2xl font-bold">{pendingInvites.length}</div>
          <div className="text-xs text-muted-foreground">Pending Invites</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Calendar className="h-5 w-5 mx-auto mb-1 text-blue-500" />
          <div className="text-2xl font-bold">{shifts.length}</div>
          <div className="text-xs text-muted-foreground">Upcoming Shifts</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
          <div className="text-2xl font-bold">{departments.length}</div>
          <div className="text-xs text-muted-foreground">Departments</div>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="directory">Staff Directory</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="shifts">Duty Roster</TabsTrigger>
        </TabsList>

        {/* ─── Staff Directory ─── */}
        <TabsContent value="directory" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><UserPlus className="mr-1.5 h-4 w-4" /> Add Staff</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Add Existing User as Staff</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-2">
                    <div><Label>Email *</Label><Input placeholder="user@example.com" value={addEmail} onChange={e => setAddEmail(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Role *</Label>
                        <Select value={addRole} onValueChange={setAddRole}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{STAFF_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Staff Type</Label>
                        <Select value={addStaffType} onValueChange={setAddStaffType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{STAFF_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Employment</Label>
                        <Select value={addEmploymentType} onValueChange={setAddEmploymentType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Department</Label><Input placeholder="e.g. Cardiology" value={addDept} onChange={e => setAddDept(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Specialty</Label><Input placeholder="e.g. Cardiologist" value={addSpecialty} onChange={e => setAddSpecialty(e.target.value)} /></div>
                      <div><Label>Qualification</Label><Input placeholder="e.g. MBBS, MD" value={addQualification} onChange={e => setAddQualification(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>License #</Label><Input placeholder="License number" value={addLicense} onChange={e => setAddLicense(e.target.value)} /></div>
                      <div><Label>Phone</Label><Input placeholder="+260..." value={addPhone} onChange={e => setAddPhone(e.target.value)} /></div>
                    </div>
                    <Button onClick={handleAddStaff} disabled={isAdding || !addEmail} className="w-full">
                      {isAdding && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Add Staff Member
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Mail className="mr-1.5 h-4 w-4" /> Invite</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Invite Staff by Email</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-2">
                    <div><Label>Email *</Label><Input placeholder="staff@email.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></div>
                    <div><Label>Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STAFF_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Department</Label><Input placeholder="Department name" value={inviteDept} onChange={e => setInviteDept(e.target.value)} /></div>
                    <div><Label>Specialty</Label><Input placeholder="Specialty" value={inviteSpecialty} onChange={e => setInviteSpecialty(e.target.value)} /></div>
                    <Button onClick={handleInvite} disabled={isInviting || !inviteEmail} className="w-full">
                      {isInviting && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Send Invitation
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Bulk upload */}
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
              <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 text-sm text-muted-foreground">
                Bulk invite staff by uploading a CSV file with columns: <code className="text-xs bg-muted px-1 rounded">email, role, department, specialty</code>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={handleDownloadTemplate}><Download className="h-4 w-4 mr-1" /> Template</Button>
                <Button size="sm" variant="outline" onClick={() => csvInputRef.current?.click()}><Upload className="h-4 w-4 mr-1" /> Upload CSV</Button>
                <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
              </div>
            </CardContent>
          </Card>

          {/* Staff table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Role</TableHead>
                      <TableHead className="hidden md:table-cell">Department</TableHead>
                      <TableHead className="hidden md:table-cell">Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{s.profile ? `${s.profile.first_name || ''} ${s.profile.last_name || ''}`.trim() || 'Unknown' : 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{s.email || s.profile?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell capitalize text-sm">{s.role}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{s.department || '—'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-xs capitalize">{s.staff_type || s.employment_type || '—'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.is_active !== false ? "default" : "secondary"} className="text-xs">
                            {s.is_active !== false ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {s.is_active !== false && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeactivateStaff(s.id)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredStaff.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No staff members found. Add or invite staff to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Invitations ─── */}
        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pending & Sent Invitations</CardTitle>
              <CardDescription>Track invitation status for staff onboarding</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden sm:table-cell">Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="text-sm">{inv.email}</TableCell>
                        <TableCell className="capitalize text-sm">{inv.staff_role}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{inv.department_name || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={inv.status === 'pending' ? 'default' : inv.status === 'accepted' ? 'secondary' : 'destructive'} className="text-xs capitalize">
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {inv.status === 'pending' && inv.token && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                  const url = `${window.location.origin}/accept-invitation?token=${inv.token}`;
                                  navigator.clipboard.writeText(url);
                                  toast.success("Invite link copied");
                                }}
                              >
                                Copy link
                              </Button>
                            )}
                            {inv.status === 'pending' && (
                              <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => handleRevokeInvitation(inv.id)}>
                                Revoke
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {invitations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No invitations sent yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Duty Roster ─── */}
        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Duty Roster</CardTitle>
              <CardDescription>Staff shift schedules and assignments</CardDescription>
            </CardHeader>
            <CardContent>
              {shifts.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shifts.map(shift => (
                        <TableRow key={shift.id}>
                          <TableCell className="text-sm">{shift.shift_date}</TableCell>
                          <TableCell className="text-sm">{shift.start_time} - {shift.end_time}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{shift.shift_type}</Badge></TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs capitalize">{shift.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No upcoming shifts scheduled.</p>
                  <p className="text-xs mt-1">Shift scheduling will be available once staff are onboarded.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
