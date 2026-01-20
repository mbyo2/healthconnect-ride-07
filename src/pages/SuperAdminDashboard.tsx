import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { MoreHorizontal, UserPlus, ShieldAlert, Users, Settings } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AdminLevel } from "@/types/user";
import { Badge } from "@/components/ui/badge";
import { createSuperAdmin } from "@/utils/createSuperAdmin";

type AdminUser = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  admin_level: AdminLevel;
  created_at: string;
};

const SuperAdminDashboard = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminFirstName, setNewAdminFirstName] = useState("");
  const [newAdminLastName, setNewAdminLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is superadmin
    const checkSuperAdmin = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          toast.error("You need to be logged in");
          navigate("/auth");
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, admin_level')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        if (profile?.admin_level !== 'superadmin') {
          toast.error("You don't have permission to access this page");
          navigate("/");
          return;
        }

        // Permission check passed, fetch admins

        // Fetch admin users
        fetchAdmins();
      } catch (error) {
        console.error("Error checking permissions:", error);
        toast.error("Error checking permissions");
        navigate("/");
      }
    };

    checkSuperAdmin();
  }, [navigate]);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('admin_level', ['admin', 'superadmin'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAdmins(data as AdminUser[]);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      toast.error("Failed to load admin users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    try {
      setIsSubmitting(true);

      const userData = await supabase.auth.getUser();
      const userId = userData.data.user?.id;

      if (!userId) {
        toast.error("Authentication error");
        return;
      }

      // Use our createSuperAdmin utility function
      const result = await createSuperAdmin(
        newAdminEmail,
        newAdminPassword,
        newAdminFirstName,
        newAdminLastName
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to create admin");
      }

      toast.success("Admin created successfully");
      setIsAddAdminOpen(false);

      // Clear form
      setNewAdminEmail("");
      setNewAdminPassword("");
      setNewAdminFirstName("");
      setNewAdminLastName("");

      // Refresh admin list
      fetchAdmins();

    } catch (error: any) {
      console.error("Error creating admin:", error);
      toast.error(error.message || "Failed to create admin");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAdminLevel = async (id: string, currentLevel: AdminLevel) => {
    try {
      setIsSubmitting(true);

      const newLevel = currentLevel === 'admin' ? 'superadmin' : 'admin';

      const { error } = await supabase
        .from('profiles')
        .update({
          admin_level: newLevel
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Admin ${newLevel === 'superadmin' ? 'promoted to Superadmin' : 'changed to Admin'}`);

      // Refresh admin list
      fetchAdmins();
    } catch (error) {
      console.error("Error updating admin level:", error);
      toast.error("Failed to update admin level");
    } finally {
      setIsSubmitting(false);
    }
  };

  const adminColumns: ColumnDef<AdminUser>[] = [
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
        const level = row.getValue("admin_level") as AdminLevel;
        return level === "superadmin" ? (
          <Badge className="bg-purple-100 dark:bg-purple-950/20 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800">
            Super Admin
          </Badge>
        ) : (
          <Badge className="bg-blue-100 dark:bg-blue-950/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800">
            Admin
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"));
        return date.toLocaleDateString();
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const admin = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => toggleAdminLevel(admin.id, admin.admin_level)}>
                {admin.admin_level === "admin" ? "Promote to Superadmin" : "Change to Admin"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Remove Admin Access</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold">Superadmin Dashboard</h1>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Button onClick={() => navigate("/admin-dashboard")}>
            Admin Dashboard
          </Button>
          <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
            <DialogTrigger asChild>
              <Button variant="default">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Admin</DialogTitle>
                <DialogDescription>
                  Create a new admin user with access to the admin dashboard.
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
                    placeholder="admin@example.com"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="firstName" className="text-right">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={newAdminFirstName}
                    onChange={(e) => setNewAdminFirstName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="lastName" className="text-right">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={newAdminLastName}
                    onChange={(e) => setNewAdminLastName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddAdminOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAdmin}
                  disabled={isSubmitting || !newAdminEmail || !newAdminPassword}
                >
                  {isSubmitting ? "Creating..." : "Create Admin"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Admin Users
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.length}</div>
            <p className="text-xs text-muted-foreground">
              {admins.filter(admin => admin.admin_level === 'superadmin').length} superadmins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Access Controls
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">
              Role-based security enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Users Managed
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">All</div>
            <p className="text-xs text-muted-foreground">
              Full access to user management
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Management</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={adminColumns}
            data={admins}
            searchColumn="email"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
