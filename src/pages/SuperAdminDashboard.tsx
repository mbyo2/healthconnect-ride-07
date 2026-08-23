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
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Monday Sticky Top Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#a25ddc] text-white flex items-center justify-center shadow-xs">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                Super Admin WorkOS
                <span className="w-2 h-2 rounded-full bg-[#00c875] animate-ping" />
              </h1>
              <p className="text-xs text-[#676879] font-medium">Root-level governance, admin provisioning, and platform payments oversight</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/admin-dashboard")} className="px-3 py-1.5 rounded-md bg-[#f0f2f7] font-bold text-xs">
              Admin Dashboard
            </button>
            <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
              <DialogTrigger asChild>
                <button className="px-4 py-1.5 rounded-md bg-[#0073ea] text-white font-extrabold text-xs flex items-center gap-1 shadow-xs">
                  <UserPlus className="h-3.5 w-3.5" /> Add Admin
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-white border border-[#e6e9ef]">
                <DialogHeader>
                  <DialogTitle className="font-extrabold text-base">Create New Admin</DialogTitle>
                  <DialogDescription className="text-xs text-[#676879]">Create an admin user with access to the Admin Dashboard.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  {[
                    { id: "email", label: "Email", type: "email", val: newAdminEmail, set: setNewAdminEmail, ph: "admin@example.online" },
                    { id: "password", label: "Password", type: "password", val: newAdminPassword, set: setNewAdminPassword, ph: "••••••••" },
                    { id: "firstName", label: "First Name", type: "text", val: newAdminFirstName, set: setNewAdminFirstName, ph: "Jane" },
                    { id: "lastName", label: "Last Name", type: "text", val: newAdminLastName, set: setNewAdminLastName, ph: "Doe" },
                  ].map(f => (
                    <div key={f.id}>
                      <label className="font-extrabold text-[#676879] uppercase">{f.label}</label>
                      <input
                        id={f.id} type={f.type} value={f.val} placeholder={f.ph}
                        onChange={(e) => f.set(e.target.value)}
                        className="w-full mt-1 p-2 rounded-md border border-[#c3c6d4] font-bold"
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <button onClick={() => setIsAddAdminOpen(false)} disabled={isSubmitting} className="px-3 py-1.5 text-xs font-bold text-slate-500">Cancel</button>
                  <button onClick={handleCreateAdmin} disabled={isSubmitting || !newAdminEmail || !newAdminPassword} className="px-4 py-1.5 rounded-md bg-[#0073ea] text-white text-xs font-bold">
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
