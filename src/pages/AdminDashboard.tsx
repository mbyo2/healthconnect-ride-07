import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Check, X, AlertTriangle, UserPlus, Building, Users, Activity, Calendar, DollarSign } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import { AdminLevel } from "@/types/settings";

// Define types for our data
type Application = {
  id: string;
  user_id: string;
  status: StatusType;
  created_at: string;
  specialty: string;
  license_number: string;
  experience_level: string;
  years_of_experience: number;
  review_notes: string | null;
  profile?: UserProfile;
};

type Institution = {
  id: string;
  name: string;
  type: string;
  status: string;
  admin_id: string | null;
  created_at: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  is_verified: boolean;
};

type UserProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
  avatar_url: string | null;
  admin_level?: AdminLevel;
};

// Define columns for applications table
const applicationColumns: ColumnDef<Application>[] = [
  {
    accessorKey: "profile.first_name",
    header: "First Name",
  },
  {
    accessorKey: "profile.last_name",
    header: "Last Name",
  },
  {
    accessorKey: "profile.email",
    header: "Email",
  },
  {
    accessorKey: "specialty",
    header: "Specialty",
  },
  {
    accessorKey: "experience_level",
    header: "Experience",
  },
  {
    accessorKey: "created_at",
    header: "Applied On",
    cell: ({ row }) => {
      return new Date(row.getValue("created_at")).toLocaleDateString();
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const application = row.original;
      return (
        <StatusBadge 
          status={application.status as StatusType} 
          itemId={application.id} 
          tableName="health_personnel_applications"
        />
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const application = row.original;
      const [isReviewOpen, setIsReviewOpen] = useState(false);
      const [reviewNotes, setReviewNotes] = useState(application.review_notes || "");
      const [newStatus, setNewStatus] = useState(application.status);
      const [isSubmitting, setIsSubmitting] = useState(false);

      const handleReview = async () => {
        try {
          setIsSubmitting(true);
          
          const { error } = await supabase
            .from('health_personnel_applications')
            .update({
              status: newStatus,
              review_notes: reviewNotes,
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', application.id);
            
          if (error) throw error;
          
          // If approved, update the user's role
          if (newStatus === 'approved') {
            const { error: roleError } = await supabase
              .from('profiles')
              .update({ role: 'health_personnel' })
              .eq('id', application.user_id);
              
            if (roleError) throw roleError;
          }
          
          // Create a notification for the user
          const notificationTitle = 
            newStatus === 'approved' 
              ? 'Application Approved!' 
              : newStatus === 'rejected' 
                ? 'Application Rejected' 
                : 'Application Status Updated';
                
          const notificationMessage = 
            newStatus === 'approved' 
              ? 'Your healthcare provider application has been approved. You can now access the provider dashboard.' 
              : newStatus === 'rejected' 
                ? `Your application was not approved. ${reviewNotes ? 'Please review the feedback provided.' : ''}` 
                : 'Your application status has been updated.';
          
          await supabase
            .from('notifications')
            .insert({
              user_id: application.user_id,
              title: notificationTitle,
              message: notificationMessage,
              type: 'application_update',
            });
          
          toast.success(`Application ${newStatus} successfully`);
          setIsReviewOpen(false);
        } catch (error) {
          console.error('Error updating application:', error);
          toast.error('Failed to update application');
        } finally {
          setIsSubmitting(false);
        }
      };

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setIsReviewOpen(true)}>
                Review Application
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View Documents</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Review Application</DialogTitle>
                <DialogDescription>
                  Review and update the status of this application.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approve</SelectItem>
                      <SelectItem value="rejected">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add review notes or feedback"
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleReview} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      );
    },
  },
];

// Define columns for institutions table
const institutionColumns: ColumnDef<Institution>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
    },
  },
  {
    accessorKey: "address",
    header: "Address",
  },
  {
    accessorKey: "created_at",
    header: "Registered On",
    cell: ({ row }) => {
      return new Date(row.getValue("created_at")).toLocaleDateString();
    },
  },
  {
    accessorKey: "is_verified",
    header: "Verified",
    cell: ({ row }) => {
      const isVerified = row.getValue("is_verified") as boolean;
      return isVerified ? (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Verified
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          Unverified
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const institution = row.original;
      const [isVerifyOpen, setIsVerifyOpen] = useState(false);
      const [isSubmitting, setIsSubmitting] = useState(false);

      const handleVerify = async () => {
        try {
          setIsSubmitting(true);
          
          const { error } = await supabase
            .from('healthcare_institutions')
            .update({
              is_verified: true,
            })
            .eq('id', institution.id);
            
          if (error) throw error;
          
          // Create a notification for the admin
          if (institution.admin_id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: institution.admin_id,
                title: 'Institution Verified',
                message: `Your institution "${institution.name}" has been verified.`,
                type: 'institution_update',
              });
          }
          
          toast.success('Institution verified successfully');
          setIsVerifyOpen(false);
        } catch (error) {
          console.error('Error verifying institution:', error);
          toast.error('Failed to verify institution');
        } finally {
          setIsSubmitting(false);
        }
      };

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {!institution.is_verified && (
                <DropdownMenuItem onClick={() => setIsVerifyOpen(true)}>
                  Verify Institution
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Edit Information</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Dialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Verify Institution</DialogTitle>
                <DialogDescription>
                  Are you sure you want to verify this institution?
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p>Institution: <strong>{institution.name}</strong></p>
                <p>Type: <strong>{institution.type.replace('_', ' ')}</strong></p>
                <p>Address: <strong>{institution.address || 'N/A'}</strong></p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsVerifyOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleVerify} disabled={isSubmitting}>
                  {isSubmitting ? "Verifying..." : "Verify Institution"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      );
    },
  },
];

// Define columns for admins table
const adminColumns: ColumnDef<UserProfile>[] = [
  {
    accessorKey: "first_name",
    header: "First Name",
  },
  {
    accessorKey: "last_name",
    header: "Last Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "admin_level",
    header: "Admin Level",
    cell: ({ row }) => {
      const level = row.getValue("admin_level") as string;
      return level === "superadmin" ? (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
          Super Admin
        </Badge>
      ) : (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          Admin
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const profile = row.original;
      const [isPromoteOpen, setIsPromoteOpen] = useState(false);
      const [isSubmitting, setIsSubmitting] = useState(false);

      const handlePromote = async () => {
        try {
          setIsSubmitting(true);
          
          const newLevel = profile.admin_level === "admin" ? ("superadmin" as AdminLevel) : ("admin" as AdminLevel);
          
          const { error } = await supabase
            .from('profiles')
            .update({
              admin_level: newLevel,
            })
            .eq('id', profile.id);
            
          if (error) throw error;
          
          toast.success(`Admin ${newLevel === "superadmin" ? "promoted to Super Admin" : "changed to Admin"}`);
          setIsPromoteOpen(false);
        } catch (error) {
          console.error('Error updating admin level:', error);
          toast.error('Failed to update admin level');
        } finally {
          setIsSubmitting(false);
        }
      };

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setIsPromoteOpen(true)}>
                {profile.admin_level === "admin" ? "Promote to Super Admin" : "Change to Admin"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View Profile</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Dialog open={isPromoteOpen} onOpenChange={setIsPromoteOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {profile.admin_level === "admin" ? "Promote to Super Admin" : "Change to Admin"}
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to {profile.admin_level === "admin" ? "promote this admin to super admin" : "change this super admin to admin"}?
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p>Name: <strong>{profile.first_name} {profile.last_name}</strong></p>
                <p>Email: <strong>{profile.email}</strong></p>
                <p>Current Level: <strong>{profile.admin_level === "admin" ? "Admin" : "Super Admin"}</strong></p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPromoteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePromote} disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Confirm"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      );
    },
  },
];

const AdminDashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProviders: 0,
    totalInstitutions: 0,
    pendingApplications: 0,
    totalAppointments: 0,
  });
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch applications with profiles
        const { data: applicationsData, error: applicationsError } = await supabase
          .from('health_personnel_applications')
          .select(`
            *,
            profile:user_id (
              id,
              first_name,
              last_name,
              email,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false });
          
        if (applicationsError) throw applicationsError;
        
        // Fetch institutions
        const { data: institutionsData, error: institutionsError } = await supabase
          .from('healthcare_institutions')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (institutionsError) throw institutionsError;
        
        // Fetch admins
        const { data: adminsData, error: adminsError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'admin')
          .order('created_at', { ascending: false });
          
        if (adminsError) throw adminsError;
        
        // Fetch stats
        const [
          { count: totalUsers },
          { count: totalProviders },
          { count: totalInstitutions },
          { count: pendingApplications },
          { count: totalAppointments },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'health_personnel'),
          supabase.from('healthcare_institutions').select('*', { count: 'exact', head: true }),
          supabase.from('health_personnel_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('appointments').select('*', { count: 'exact', head: true }),
        ]);
        
        // Cast the data to the correct types
        setApplications((applicationsData || []) as Application[]);
        setInstitutions((institutionsData || []).map(inst => ({ 
          ...inst, 
          status: inst.is_verified ? 'verified' : 'unverified' 
        })) as Institution[]);
        setAdmins((adminsData || []) as UserProfile[]);
        
        setStats({
          totalUsers: totalUsers || 0,
          totalProviders: totalProviders || 0,
          totalInstitutions: totalInstitutions || 0,
          pendingApplications: pendingApplications || 0,
          totalAppointments: totalAppointments || 0,
        });
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast.error('Failed to load admin dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleAddAdmin = async () => {
    try {
      setIsSubmitting(true);
      
      // Check if email exists
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', newAdminEmail)
        .single();
        
      if (userError) {
        if (userError.code === 'PGRST116') {
          toast.error('User with this email does not exist');
        } else {
          throw userError;
        }
        return;
      }
      
      if (userData.role === 'admin') {
        toast.error('This user is already an admin');
        return;
      }
      
      // Update user role to admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          role: 'admin',
          admin_level: 'admin'
        })
        .eq('id', userData.id);
        
      if (updateError) throw updateError;
      
      toast.success('Admin added successfully');
      setIsAddAdminOpen(false);
      setNewAdminEmail("");
      
      // Refresh admins list
      const { data: adminsData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });
        
      setAdmins(adminsData || []);
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('Failed to add admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Button onClick={() => navigate("/provider-dashboard")}>
            Provider Dashboard
          </Button>
          <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Admin</DialogTitle>
                <DialogDescription>
                  Enter the email of the user you want to make an admin.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddAdminOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAdmin} disabled={isSubmitting || !newAdminEmail}>
                  {isSubmitting ? "Adding..." : "Add Admin"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="institutions">Institutions</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalProviders} healthcare providers
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Applications
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingApplications}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting review
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Healthcare Institutions
                </CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalInstitutions}</div>
                <p className="text-xs text-muted-foreground">
                  Registered on the platform
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Appointments
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAppointments}</div>
                <p className="text-xs text-muted-foreground">
                  Scheduled on the platform
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Platform Activity
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Active</div>
                <p className="text-xs text-muted-foreground">
                  System running normally
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0</div>
                <p className="text-xs text-muted-foreground">
                  Payment system not integrated
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
              </CardHeader>
              <CardContent>
                {applications.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={app.profile?.avatar_url || ""} />
                        <AvatarFallback>
                          {app.profile?.first_name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {app.profile?.first_name} {app.profile?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {app.specialty}
                        </p>
                      </div>
                    </div>
                    <StatusBadge 
                      status={app.status as StatusType} 
                      itemId={app.id} 
                      tableName="health_personnel_applications"
                      className="text-xs"
                    />
                  </div>
                ))}
                {applications.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No applications found
                  </p>
                )}
                {applications.length > 5 && (
                  <Button 
                    variant="link" 
                    className="w-full mt-2"
                    onClick={() => setActiveTab("applications")}
                  >
                    View all applications
                  </Button>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Institutions</CardTitle>
              </CardHeader>
              <CardContent>
                {institutions.slice(0, 5).map((inst) => (
                  <div key={inst.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{inst.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {inst.type.replace('_', ' ')}
                      </p>
                    </div>
                    {inst.is_verified ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                        Unverified
                      </Badge>
                    )}
                  </div>
                ))}
                {institutions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No institutions found
                  </p>
                )}
                {institutions.length > 5 && (
                  <Button 
                    variant="link" 
                    className="w-full mt-2"
                    onClick={() => setActiveTab("institutions")}
                  >
                    View all institutions
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Healthcare Provider Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={applicationColumns} 
                data={applications} 
                searchColumn="profile.email"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="institutions">
          <Card>
            <CardHeader>
              <CardTitle>Healthcare Institutions</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={institutionColumns} 
                data={institutions} 
                searchColumn="name"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle>Admin Users</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={adminColumns} 
                data={admins} 
                searchColumn="email"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
