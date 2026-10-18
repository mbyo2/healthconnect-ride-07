// SuperAdminWorkflow — the PLATFORM-OWNER console (Mabvuto Banda's level).
// Sees EVERYTHING across ALL institutions and countries. Distinct from
// AdminWorkflow (platform ops) and InstitutionAdminWorkflow (facility scope).
import React, { useState } from "react";
import {
  Crown, Building2, Users, CreditCard, Globe, ShieldAlert,
  Search, Loader2, Ban, CheckCircle, LayoutDashboard,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { SuperAdminMetricsDashboard } from "@/components/metrics/RoleMetricsDashboard";
import { ChartCard, TrendAreaChart } from "@/components/metrics/MetricsCharts";
import { useCurrency } from "@/hooks/use-currency";

const TABS = [
  { id: "overview", label: "Platform Overview", icon: LayoutDashboard },
  { id: "institutions", label: "Institutions", icon: Building2 },
  { id: "users", label: "Users", icon: Users },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { id: "countries", label: "Countries", icon: Globe },
  { id: "audit", label: "Audit Log", icon: ShieldAlert },
] as const;

const getStatusPill = (status: string | null | undefined) => {
  const s = (status || "unknown").toLowerCase();
  const color =
    s === "active" || s === "verified" ? "bg-success-500" :
    s === "suspended" ? "bg-error-500" :
    s === "pending" ? "bg-warning-500" : "bg-slate-400";
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${color}`}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
};

export const SuperAdminWorkflow = () => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const { formatPrice } = useCurrency();

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-canvas-silk pb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            SuperAdmin Platform Console
          </h1>
          <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">
            Platform-owner view — every institution, user, subscription, and country on Doc&apos;O Clock
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              activeTab === t.id
                ? "bg-primary-500 text-white border-primary-500"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab formatPrice={formatPrice} />}
      {activeTab === "institutions" && <InstitutionsTab />}
      {activeTab === "users" && <UsersTab />}
      {activeTab === "subscriptions" && <SubscriptionsTab formatPrice={formatPrice} />}
      {activeTab === "countries" && <CountriesTab />}
      {activeTab === "audit" && <AuditTab />}
    </div>
  );
};

// ── Tab 1: Platform Overview ───────────────────────────────────────

function OverviewTab({ formatPrice }: { formatPrice: (n: number) => string }) {
  // Platform-wide revenue: sum of all hospital_billing totals (all institutions).
  const { data: revenue } = useQuery({
    queryKey: ["superadmin-platform-revenue"],
    queryFn: async () => {
      const { data } = await (supabase.from("hospital_billing" as any) as any)
        .select("total_amount");
      return ((data as any[]) || []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
    },
  });

  // Signups trend: new profiles per day, last 14 days.
  const { data: signups } = useQuery({
    queryKey: ["superadmin-signup-trend"],
    queryFn: async () => {
      const since = format(subDays(new Date(), 14), "yyyy-MM-dd");
      const { data } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", since);
      const buckets: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        buckets[format(subDays(new Date(), i), "MMM d")] = 0;
      }
      ((data as any[]) || []).forEach((p: any) => {
        const key = format(new Date(p.created_at), "MMM d");
        if (key in buckets) buckets[key]++;
      });
      return Object.entries(buckets).map(([name, signups]) => ({ name, signups }));
    },
  });

  return (
    <div className="space-y-6">
      <SuperAdminMetricsDashboard />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Platform Revenue (All Institutions)" description="Gross billed across the platform">
          <div className="py-6 text-center">
            <p className="text-3xl font-extrabold text-primary-500">{formatPrice(revenue || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Lifetime gross billing volume</p>
          </div>
        </ChartCard>
        <ChartCard title="Signups — Last 14 Days" description="New user registrations per day">
          <TrendAreaChart data={signups || []} dataKey="signups" />
        </ChartCard>
      </div>
    </div>
  );
}

// ── Tab 2: Institutions ────────────────────────────────────────────

interface InstitutionRow {
  id: string;
  name: string;
  type: string | null;
  city: string | null;
  country_code: string | null;
  is_verified: boolean | null;
  status: string | null;
  is_suspended: boolean | null;
  suspension_reason: string | null;
  admin_id: string | null;
  created_at: string;
}

function InstitutionsTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [processing, setProcessing] = useState<string | null>(null);

  const { data: institutions, isLoading, refetch } = useQuery({
    queryKey: ["superadmin-institutions"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("healthcare_institutions" as any) as any)
        .select("id, name, type, city, country_code, is_verified, status, is_suspended, suspension_reason, admin_id, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as InstitutionRow[]) || [];
    },
  });

  const setSuspended = async (inst: InstitutionRow, suspended: boolean) => {
    setProcessing(inst.id);
    try {
      let reason: string | null = null;
      if (suspended) {
        reason = window.prompt(
          `Suspend "${inst.name}"? This will block all writes (staff can still view records for patient safety).\n\nEnter suspension reason:`
        );
        if (!reason || !reason.trim()) {
          toast.error("A suspension reason is required.");
          setProcessing(null);
          return;
        }
        reason = reason.trim();
      }
      const { error } = await (supabase as any).rpc("set_institution_suspended", {
        p_institution_id: inst.id,
        p_suspended: suspended,
        p_reason: reason,
      });
      if (error) throw error;
      toast.success(`Institution ${suspended ? "suspended" : "re-activated"}.`);
      refetch();
    } catch (e: any) {
      toast.error("Failed: " + (e.message || "unknown error"));
    } finally {
      setProcessing(null);
    }
  };

  const filtered = (institutions || []).filter((i) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || i.name.toLowerCase().includes(q) || (i.city || "").toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "suspended" && i.is_suspended) ||
      (statusFilter === "active" && !i.is_suspended && i.is_verified) ||
      (statusFilter === "pending" && !i.is_verified && !i.is_suspended);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search institutions…"
            className="text-xs pl-9 pr-3 py-2 rounded-full border border-border bg-muted/50 outline-none w-56"
          />
        </div>
        {(["all", "active", "pending", "suspended"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === s
                ? "bg-primary-500 text-white border-primary-500"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} institutions</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Country</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Joined</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((i) => (
                <tr key={i.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{i.name}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{i.type || "—"}</td>
                  <td className="px-4 py-2.5 text-xs">{i.country_code || "—"}</td>
                  <td className="px-4 py-2.5">
                    {i.is_suspended ? getStatusPill("suspended") : getStatusPill(i.is_verified ? "verified" : i.status || "pending")}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{format(new Date(i.created_at), "MMM d, yyyy")}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      disabled={processing === i.id}
                      onClick={() => setSuspended(i, !i.is_suspended)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                        i.is_suspended
                          ? "text-success-600 border-success-500/40 hover:bg-success-500/10"
                          : "text-destructive border-destructive/40 hover:bg-destructive/10"
                      }`}
                    >
                      {processing === i.id ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" /> : i.is_suspended ? (
                        <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Activate</span>
                      ) : (
                        <span className="flex items-center gap-1"><Ban className="h-3.5 w-3.5" /> Suspend</span>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No institutions match.</p>}
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Users ───────────────────────────────────────────────────

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  roles: string[];
}

function UsersTab() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const { data: users, isLoading } = useQuery({
    queryKey: ["superadmin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const { data: roles } = await (supabase.from("user_roles" as any) as any)
        .select("user_id, role");
      const roleMap: Record<string, string[]> = {};
      ((roles as any[]) || []).forEach((r: any) => {
        (roleMap[r.user_id] = roleMap[r.user_id] || []).push(r.role);
      });
      return ((profiles as any[]) || []).map((p: any) => ({
        ...p,
        roles: roleMap[p.id] || ["patient"],
      })) as UserRow[];
    },
  });

  const allRoles = [...new Set((users || []).flatMap((u) => u.roles))].sort();

  const filtered = (users || []).filter((u) => {
    const q = search.toLowerCase();
    const name = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    const matchesSearch = !q || name.includes(q) || (u.email || "").toLowerCase().includes(q);
    const matchesRole = roleFilter === "all" || u.roles.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="text-xs pl-9 pr-3 py-2 rounded-full border border-border bg-muted/50 outline-none w-56"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-full border border-border bg-muted/50 outline-none"
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          {allRoles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} users</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Roles</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">
                    {`${u.first_name || ""} ${u.last_name || ""}`.trim() || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{u.email || "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400">
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{format(new Date(u.created_at), "MMM d, yyyy")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No users match.</p>}
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Subscriptions ───────────────────────────────────────────

function SubscriptionsTab({ formatPrice }: { formatPrice: (n: number) => string }) {
  const { data: subs, isLoading } = useQuery({
    queryKey: ["superadmin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("id, status, billing_cycle, current_period_start, current_period_end, created_at, plan:subscription_plans(name, target_audience, price_monthly, price_annual, currency)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const filtered = (subs || []).filter((s: any) => statusFilter === "all" || s.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(["all", "active", "trialing", "past_due", "cancelled", "expired"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === s
                ? "bg-primary-500 text-white border-primary-500"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto self-center">{filtered.length} subscriptions</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Plan</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Audience</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Cycle</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Period End</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s: any) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{s.plan?.name || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{s.plan?.target_audience || "—"}</td>
                  <td className="px-4 py-2.5 text-xs">{s.billing_cycle || "—"}</td>
                  <td className="px-4 py-2.5">{getStatusPill(s.status)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {s.current_period_end ? format(new Date(s.current_period_end), "MMM d, yyyy") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No subscriptions match.</p>}
        </div>
      )}
    </div>
  );
}

// ── Tab 5: Countries ───────────────────────────────────────────────

function CountriesTab() {
  const [search, setSearch] = useState("");

  const { data: countries, isLoading } = useQuery({
    queryKey: ["superadmin-countries"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("country_configurations" as any) as any)
        .select("country_code, country_name, currency_code, currency_symbol, payment_rails, is_active")
        .order("country_name");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const filtered = (countries || []).filter((c: any) => {
    const q = search.toLowerCase();
    return !q || c.country_name.toLowerCase().includes(q) || c.country_code.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search countries…"
            className="text-xs pl-9 pr-3 py-2 rounded-full border border-border bg-muted/50 outline-none w-56"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} countries configured</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Country</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Code</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Currency</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Payment Rails</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c: any) => (
                <tr key={c.country_code} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{c.country_name}</td>
                  <td className="px-4 py-2.5 text-xs font-mono">{c.country_code}</td>
                  <td className="px-4 py-2.5 text-xs">{c.currency_symbol} {c.currency_code}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {Array.isArray(c.payment_rails) ? c.payment_rails.slice(0, 3).join(", ") : "—"}
                    {Array.isArray(c.payment_rails) && c.payment_rails.length > 3 ? ` +${c.payment_rails.length - 3}` : ""}
                  </td>
                  <td className="px-4 py-2.5">{getStatusPill(c.is_active ? "active" : "inactive")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No countries match.</p>}
        </div>
      )}
    </div>
  );
}

// ── Tab 6: Audit Log ───────────────────────────────────────────────

function AuditTab() {
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["superadmin-audit"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("audit_logs" as any) as any)
        .select("id, action, resource, timestamp, severity, category, outcome")
        .order("timestamp", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const filtered = (entries || []).filter((e: any) => severityFilter === "all" || e.severity === severityFilter);

  const sevColor = (sev: string) =>
    sev === "critical" ? "bg-error-500" :
    sev === "error" ? "bg-orange-500" :
    sev === "warning" ? "bg-warning-500" : "bg-slate-400";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(["all", "info", "warning", "error", "critical"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              severityFilter === s
                ? "bg-primary-500 text-white border-primary-500"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto self-center">{filtered.length} entries</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Time</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Action</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Resource</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Category</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Severity</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((e: any) => (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(e.timestamp), "MMM d, HH:mm")}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-xs">{e.action}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.resource}</td>
                  <td className="px-4 py-2.5 text-xs">{e.category}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${sevColor(e.severity)}`} title={e.severity} />
                    <span className="text-xs ml-1.5">{e.severity}</span>
                  </td>
                  <td className="px-4 py-2.5">{getStatusPill(e.outcome)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No audit entries match.</p>}
        </div>
      )}
    </div>
  );
}
