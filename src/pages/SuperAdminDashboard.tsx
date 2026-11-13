import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { MoreHorizontal, UserPlus, ShieldAlert, Users, Settings, Shield } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AdminLevel } from "@/types/user";
import { syncAdminLevel } from "@/lib/adminLevelSync";
import { SubscriptionPricingAdmin } from "@/components/admin/SubscriptionPricingAdmin";
import { ModulePricingAdmin } from "@/components/admin/ModulePricingAdmin";
import { PaymentModeApprovals } from "@/components/admin/PaymentModeApprovals";
import { MarketplaceListingApprovals } from "@/components/admin/MarketplaceListingApprovals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyErrorMessage } from "@/utils/friendly-error";

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

  useEffect(() => { fetchAdmins(); }, []);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      // NOTE: user_roles has no FK to profiles (it references auth.users), so an
      // embedded profiles(...) join 400s. Fetch roles then profiles separately.
      const { data: roleRows, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "super_admin"]);
      if (rolesError) throw rolesError;
      const adminIds = (roleRows || []).map((r: any) => r.user_id);
      const { data: profileRows, error: profilesError } = adminIds.length
        ? await supabase
            .from("profiles")
            .select("id, email, first_name, last_name, created_at")
            .in("id", adminIds)
        : { data: [] as any[], error: null };
      if (profilesError) throw profilesError;
      const formattedAdmins = (roleRows || []).map((item: any) => {
        const p = (profileRows || []).find((x: any) => x.id === item.user_id);
        return {
          id: item.user_id,
          email: p?.email,
          first_name: p?.first_name,
          last_name: p?.last_name,
          admin_level: item.role === "super_admin" ? "superadmin" : "admin",
          created_at: p?.created_at,
        };
      });
      // Newest admins first (client-side; embedded order-by is unavailable)
      formattedAdmins.sort((a: any, b: any) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setAdmins(formattedAdmins as any);
    } catch (error) {
      toast.error("Failed to load admin users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    try {
      setIsSubmitting(true);
      const { data, error } = await supabase.functions.invoke("create-admin-user", {
        body: { email: newAdminEmail, password: newAdminPassword, firstName: newAdminFirstName, lastName: newAdminLastName, adminLevel: "admin" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Admin created successfully");
      setIsAddAdminOpen(false);
      setNewAdminEmail(""); setNewAdminPassword(""); setNewAdminFirstName(""); setNewAdminLastName("");
      fetchAdmins();
    } catch (error: any) {
      toast.error(friendlyErrorMessage(error, "Failed to create admin"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAdminLevel = async (id: string, currentLevel: AdminLevel) => {
    try {
      setIsSubmitting(true);
      const { data: { user: me } } = await supabase.auth.getUser();
      if (me && me.id === id) {
        toast.error("You cannot change your own admin level");
        return;
      }
      const isCurrentlySuper = currentLevel === "superadmin";
      const oldRole = isCurrentlySuper ? "super_admin" : "admin";
      const newRole = isCurrentlySuper ? "admin" : "super_admin";
      // NOTE: user_roles has no UPDATE policy — promote/demote via
      // delete+insert, which the super_admin INSERT/DELETE policies allow.
      const { error: delError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", id)
        .eq("role", oldRole);
      if (delError) throw delError;
      const { error: insError } = await supabase
        .from("user_roles")
        .insert({ user_id: id, role: newRole, granted_by: me?.id });
      if (insError) throw insError;
      await syncAdminLevel(id);
      toast.success(`Admin ${isCurrentlySuper ? "changed to Admin" : "promoted to Superadmin"}`);
      fetchAdmins();
    } catch (error: any) {
      toast.error(friendlyErrorMessage(error, "Failed to update admin level"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeAdminAccess = async (id: string, email?: string | null) => {
    try {
      const { data: { user: me } } = await supabase.auth.getUser();
      if (me && me.id === id) {
        toast.error("You cannot remove your own admin access");
        return;
      }
      if (!window.confirm(`Remove all admin access for ${email || id}? They will lose access to the admin dashboards.`)) {
        return;
      }
      setIsSubmitting(true);
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", id)
        .in("role", ["admin", "super_admin"]);
      if (error) throw error;
      await syncAdminLevel(id);
      toast.success("Admin access removed");
      fetchAdmins();
    } catch (error: any) {
      toast.error(friendlyErrorMessage(error, "Failed to remove admin access"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const adminColumns: ColumnDef<AdminUser>[] = [
    { accessorKey: "first_name", header: "First Name" },
    { accessorKey: "last_name", header: "Last Name" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "admin_level",
      header: "Admin Level",
      cell: ({ row }) => {
        const level = row.getValue("admin_level") as AdminLevel;
        return level === "superadmin"
          ? <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-primary-500">Super Admin</span>
          : <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-primary-500">Admin</span>;
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => new Date(row.getValue("created_at")).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const admin = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 min-h-[44px] min-w-[44px] p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-[13px] font-medium text-muted-foreground">Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => toggleAdminLevel(admin.id, admin.admin_level)} className="text-xs font-semibold">
                {admin.admin_level === "admin" ? "Promote to Superadmin" : "Change to Admin"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => removeAdminAccess(admin.id, admin.email)}
                className="text-xs font-semibold text-error-500"
              >
                Remove Admin Access
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-canvas text-midnight font-sans pb-16">
      {/* Top Bar */}
      <div className="doc-page-header px-4 sm:px-6 py-5">
        <div className="max-w-content mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-button">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-medium tracking-tight flex items-center gap-2">
                Super Admin Dashboard
                <span className="w-2 h-2 rounded-full bg-success-500" />
              </h1>
              <p className="text-sm text-muted-foreground font-medium">Root-level governance, admin provisioning, and platform payments oversight</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/admin-dashboard")}>
              Admin dashboard
            </Button>
            <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" /> Add admin
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create new admin</DialogTitle>
                  <DialogDescription>Create an admin user with access to the Admin Dashboard.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2 text-sm">
                  {[
                    { id: "email", label: "Email", type: "email", val: newAdminEmail, set: setNewAdminEmail, ph: "admin@example.online" },
                    { id: "password", label: "Password", type: "password", val: newAdminPassword, set: setNewAdminPassword, ph: "••••••••" },
                    { id: "firstName", label: "First Name", type: "text", val: newAdminFirstName, set: setNewAdminFirstName, ph: "Jane" },
                    { id: "lastName", label: "Last Name", type: "text", val: newAdminLastName, set: setNewAdminLastName, ph: "Doe" },
                  ].map(f => (
                    <div key={f.id}>
                      <label className="font-medium text-muted-foreground text-xs">{f.label}</label>
                      <Input
                        id={f.id} type={f.type} value={f.val} placeholder={f.ph}
                        onChange={(e) => f.set(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddAdminOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button onClick={handleCreateAdmin} disabled={isSubmitting || !newAdminEmail || !newAdminPassword}>
                    {isSubmitting ? "Creating..." : "Create admin"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="pt-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Admin Users", value: admins.length, sub: `${admins.filter(a => a.admin_level === "superadmin").length} superadmins`, icon: <ShieldAlert className="h-5 w-5" /> },
            { label: "Access Controls", value: "Active", sub: "Role-based security enabled", icon: <Settings className="h-5 w-5" /> },
            { label: "Users Managed", value: "All", sub: "Full platform access", icon: <Users className="h-5 w-5" /> },
          ].map((card) => (
            <div key={card.label} className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                <span className="h-9 w-9 rounded-lg bg-primary-500/10 text-primary-600 flex items-center justify-center">{card.icon}</span>
              </div>
              <div className="text-2xl font-semibold tnum text-foreground">{card.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Admin Management Table */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary-500" /> Admin & superadmin management
          </h2>
          <DataTable columns={adminColumns} data={admins} searchColumn="email" />
        </div>

        {/* Subscription Pricing — superadmin editable */}
        <div className="rounded-lg border border-border bg-card p-5">
          <SubscriptionPricingAdmin />
        </div>

        {/* Module Add-on Pricing — superadmin editable */}
        <div className="rounded-lg border border-border bg-card p-5">
          <ModulePricingAdmin />
        </div>

        {/* Payment Mode Approvals — institution mode-switch inbox */}
        <PaymentModeApprovals />

        {/* Marketplace Listing Approvals — institution listing inbox */}
        <MarketplaceListingApprovals />

      </div>
    </div>
  );
};

export default SuperAdminDashboard;
