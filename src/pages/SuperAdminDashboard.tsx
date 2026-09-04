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
import { DPOPaymentsAdmin } from "@/components/admin/DPOPaymentsAdmin";
import { Button } from "@/components/ui/button";

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
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role, profiles(id, email, first_name, last_name, created_at)")
        .in("role", ["admin", "super_admin"])
        .order("profiles(created_at)", { ascending: false });
      if (error) throw error;
      const formattedAdmins = (data || []).map((item: any) => ({
        id: item.user_id,
        email: item.profiles?.email,
        first_name: item.profiles?.first_name,
        last_name: item.profiles?.last_name,
        admin_level: item.role === "super_admin" ? "superadmin" : "admin",
        created_at: item.profiles?.created_at,
      }));
      setAdmins(formattedAdmins);
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
      toast.error(error.message || "Failed to create admin");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAdminLevel = async (id: string, currentLevel: AdminLevel) => {
    try {
      setIsSubmitting(true);
      const newLevel = currentLevel === "admin" ? "super_admin" : "admin";
      const { error } = await supabase.from("user_roles").update({ role: newLevel }).eq("user_id", id);
      if (error) throw error;
      toast.success(`Admin ${newLevel === "super_admin" ? "promoted to Superadmin" : "changed to Admin"}`);
      fetchAdmins();
    } catch (error) {
      toast.error("Failed to update admin level");
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
          ? <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-[#a25ddc]">Super Admin</span>
          : <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white bg-[#0073ea]">Admin</span>;
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
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border border-[#e6e9ef] rounded-xl bg-white">
              <DropdownMenuLabel className="text-xs font-extrabold text-[#676879] uppercase">Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => toggleAdminLevel(admin.id, admin.admin_level)} className="text-xs font-bold">
                {admin.admin_level === "admin" ? "Promote to Superadmin" : "Change to Admin"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs font-bold text-[#e2445c]">Remove Admin Access</DropdownMenuItem>
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
      <div className="bg-white border-b border-canvas-silk px-4 sm:px-6 py-5 sticky top-0 z-30 shadow-sm">
        <div className="max-w-content mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent-500 text-white flex items-center justify-center shadow-button">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-medium tracking-tight flex items-center gap-2">
                Super Admin Dashboard
                <span className="w-2 h-2 rounded-full bg-success-500 animate-ping" />
              </h1>
              <p className="text-sm text-graphite-500 font-medium tracking-wide">Root-level governance, admin provisioning, and platform payments oversight</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/admin-dashboard")} className="vf-btn-secondary text-sm">
              Admin Dashboard
            </button>
            <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
              <DialogTrigger asChild>
                <button className="vf-btn-primary gap-1.5 text-sm">
                  <UserPlus className="h-3.5 w-3.5" /> Add Admin
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-white border border-canvas-silk rounded-card">
                <DialogHeader>
                  <DialogTitle className="font-medium text-lg text-midnight">Create New Admin</DialogTitle>
                  <DialogDescription className="text-sm text-graphite-500">Create an admin user with access to the Admin Dashboard.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2 text-sm">
                  {[
                    { id: "email", label: "Email", type: "email", val: newAdminEmail, set: setNewAdminEmail, ph: "admin@example.online" },
                    { id: "password", label: "Password", type: "password", val: newAdminPassword, set: setNewAdminPassword, ph: "••••••••" },
                    { id: "firstName", label: "First Name", type: "text", val: newAdminFirstName, set: setNewAdminFirstName, ph: "Jane" },
                    { id: "lastName", label: "Last Name", type: "text", val: newAdminLastName, set: setNewAdminLastName, ph: "Doe" },
                  ].map(f => (
                    <div key={f.id}>
                      <label className="font-medium text-graphite-600 text-xs uppercase">{f.label}</label>
                      <input
                        id={f.id} type={f.type} value={f.val} placeholder={f.ph}
                        onChange={(e) => f.set(e.target.value)}
                        className="w-full mt-2 px-4 py-2.5 rounded-xl border border-canvas-silk font-medium focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <button onClick={() => setIsAddAdminOpen(false)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-graphite-500 hover:text-midnight">Cancel</button>
                  <button onClick={handleCreateAdmin} disabled={isSubmitting || !newAdminEmail || !newAdminPassword} className="vf-btn-primary text-sm">
                    {isSubmitting ? "Creating..." : "Create Admin"}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Admin Users", value: admins.length, sub: `${admins.filter(a => a.admin_level === "superadmin").length} superadmins`, color: "#a25ddc", icon: <ShieldAlert className="h-5 w-5" /> },
            { label: "Access Controls", value: "Active", sub: "Role-based security enabled", color: "#00c875", icon: <Settings className="h-5 w-5" /> },
            { label: "Users Managed", value: "All", sub: "Full platform access", color: "#0073ea", icon: <Users className="h-5 w-5" /> },
          ].map((card) => (
            <div key={card.label} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-[#676879] uppercase">{card.label}</span>
                <span style={{ color: card.color }}>{card.icon}</span>
              </div>
              <div className="text-2xl font-black font-mono" style={{ color: card.color }}>{card.value}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Admin Management Table */}
        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <h2 className="font-extrabold text-sm mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#a25ddc]" /> Admin & Superadmin Management
          </h2>
          <DataTable columns={adminColumns} data={admins} searchColumn="email" />
        </div>

        {/* DPO Payments Admin */}
        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <DPOPaymentsAdmin />
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
