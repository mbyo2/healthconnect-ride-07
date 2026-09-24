import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, ShieldCheck, Activity, Users, DollarSign, BedDouble,
  Download, RefreshCw, Search, Hash, Network, Server, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuditEvent {
  id: string;
  action: string;
  category: string | null;
  outcome: string | null;
  resource: string | null;
  severity: string | null;
  details: any;
  user_id: string;
  created_at: string | null;
  actorName?: string;
}

interface TeamMember {
  user_id: string;
  role: string | null;
  status: string | null;
  name: string;
}

const ACTION_COLORS: Record<string, string> = {
  push_notification_sent: "text-indigo-400",
  staff_email_sent: "text-blue-400",
  payment_received: "text-emerald-400",
  refund_issued: "text-orange-400",
  search: "text-slate-400",
};

// ─── Facility Overview (live aggregates) ─────────────────────────────────────
function FacilityOverview({ institutionId }: { institutionId: string }) {
  const [loading, setLoading] = useState(true);
  const [facility, setFacility] = useState<any>(null);
  const [stats, setStats] = useState({ beds: 0, occupied: 0, admitted: 0, revenueMTD: 0, outstanding: 0, staff: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const [fac, beds, adm, inv, staff] = await Promise.all([
          supabase.from("healthcare_institutions").select("id,name,type,city,state,phone,email,license_number,is_verified,status,number_of_beds").eq("id", institutionId).maybeSingle(),
          supabase.from("hospital_beds" as any).select("id,status").eq("hospital_id", institutionId),
          supabase.from("hospital_admissions" as any).select("id,status").eq("hospital_id", institutionId).eq("status", "admitted"),
          supabase.from("hospital_billing" as any).select("total_amount,balance").eq("hospital_id", institutionId).gte("created_at", monthStart),
          supabase.from("institution_personnel" as any).select("id").eq("institution_id", institutionId).neq("status", "inactive"),
        ]);
        if (cancelled) return;
        const bedRows = (beds.data as any[]) || [];
        const invRows = (inv.data as any[]) || [];
        setFacility((fac as any).data || null);
        setStats({
          beds: bedRows.length,
          occupied: bedRows.filter((b) => b.status === "occupied").length,
          admitted: ((adm.data as any[]) || []).length,
          revenueMTD: invRows.reduce((s, r) => s + Number(r.total_amount || 0), 0),
          outstanding: invRows.reduce((s, r) => s + Number(r.balance || 0), 0),
          staff: ((staff.data as any[]) || []).length,
        });
      } catch (e) {
        console.error("Facility overview failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [institutionId]);

  const occupancy = stats.beds ? Math.round((stats.occupied / stats.beds) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4 flex flex-wrap items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-500/15"><Building2 className="h-5 w-5 text-indigo-300" /></div>
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm">{loading ? "Loading facility…" : facility?.name || "Facility"}</p>
          <p className="text-xs text-slate-400">
            {[facility?.type, facility?.city, facility?.state].filter(Boolean).join(" · ") || "—"}
            {facility?.license_number ? ` · Lic. ${facility.license_number}` : ""}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {facility?.is_verified ? <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">Verified</Badge> : null}
          {facility?.status ? <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">{facility.status}</Badge> : null}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Bed Occupancy", value: loading ? "…" : `${occupancy}%`, sub: `${stats.occupied}/${stats.beds} beds`, icon: BedDouble, color: "text-blue-400" },
          { label: "Active Admissions", value: loading ? "…" : String(stats.admitted), sub: "currently admitted", icon: Activity, color: "text-emerald-400" },
          { label: "Revenue (MTD)", value: loading ? "…" : `K${stats.revenueMTD.toLocaleString()}`, sub: `K${stats.outstanding.toLocaleString()} outstanding`, icon: DollarSign, color: "text-amber-400" },
          { label: "Registered Staff", value: loading ? "…" : String(stats.staff), sub: "personnel on record", icon: Users, color: "text-indigo-400" },
        ].map((m) => (
          <div key={m.label} className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
            <m.icon className={`h-5 w-5 ${m.color} mb-2`} />
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{m.label} · {m.sub}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">Live from beds, admissions, billing and personnel records for this facility. Zero rows render as zero — never as estimates.</p>
    </div>
  );
}

// ─── Audit Trail (real audit_logs) ───────────────────────────────────────────
function FacilityAuditTrail() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id,action,category,outcome,resource,severity,details,user_id,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data as any[]) || [];
      // Resolve actor names (best-effort; RLS may hide some profiles).
      const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      let names: Record<string, string> = {};
      if (ids.length) {
        try {
          const { data: profs } = await supabase.from("profiles").select("id,first_name,last_name").in("id", ids);
          ((profs as any[]) || []).forEach((p) => {
            names[p.id] = `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.id.slice(0, 8);
          });
        } catch { /* names stay blank */ }
      }
      setEvents(rows.map((r) => ({ ...r, actorName: names[r.user_id] || r.user_id.slice(0, 8) })));
    } catch (e: any) {
      console.error("Audit feed failed:", e);
      toast.error(e?.message || "Could not load the audit trail.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const filtered = events.filter((e) =>
    !search ||
    e.action.toLowerCase().includes(search.toLowerCase()) ||
    (e.actorName || "").toLowerCase().includes(search.toLowerCase()) ||
    (e.resource || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const rows = [["Time", "Actor", "Action", "Category", "Resource", "Outcome", "Severity"]];
    filtered.forEach((e) => rows.push([
      e.created_at || "", e.actorName || e.user_id, e.action,
      e.category || "", e.resource || "", e.outcome || "", e.severity || "",
    ]));
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `facility-audit-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} audit events.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-700/50 rounded-lg"><Hash className="h-5 w-5 text-blue-400" /></div>
          <div>
            <p className="font-semibold text-white text-sm">Facility Audit Trail</p>
            <p className="text-xs text-slate-400">
              {loading ? "Loading…" : `${filtered.length} events · system-recorded, newest first`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchEvents} disabled={loading} className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8 text-xs gap-1">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={!filtered.length} className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8 text-xs gap-1">
            <Download className="h-3 w-3" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Events Shown", value: String(filtered.length), color: "text-blue-400" },
          { label: "Unique Actors", value: String(new Set(filtered.map((e) => e.user_id)).size), color: "text-indigo-400" },
          { label: "Categories", value: String(new Set(filtered.map((e) => e.category || "—")).size), color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="bg-slate-700/20 rounded-lg p-3 border border-slate-600/20 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by actor, action, or resource…" className="pl-9 bg-slate-700/50 border-slate-600 text-white" />
      </div>

      {loading ? (
        <p className="text-xs text-slate-500 text-center py-8">Loading audit events…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-xs text-slate-500">
          <Eye className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-slate-300">No audit events recorded yet.</p>
          <p className="mt-1">Staff notifications, emails and system actions will appear here as they happen.</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
          {filtered.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div
                key={entry.id}
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                className="rounded-lg border border-slate-600/30 bg-slate-700/10 hover:border-slate-500/40 p-3 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold font-mono ${ACTION_COLORS[entry.action] || "text-slate-300"}`}>
                          {entry.action.replace(/_/g, " ")}
                        </span>
                        {entry.outcome ? <span className="text-[10px] text-slate-500">· {entry.outcome}</span> : null}
                        {entry.category ? <span className="text-[10px] text-slate-500">· {entry.category}</span> : null}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{entry.actorName} · {entry.resource || "—"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 shrink-0">{entry.created_at ? new Date(entry.created_at).toLocaleString() : "—"}</p>
                </div>
                {isExpanded && (
                  <pre className="mt-3 pt-3 border-t border-slate-700/40 text-[11px] text-slate-300 font-mono whitespace-pre-wrap break-all" onClick={(e) => e.stopPropagation()}>
                    {JSON.stringify(entry.details || {}, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Team & Roles (live personnel) ───────────────────────────────────────────
function FacilityTeam({ institutionId }: { institutionId: string }) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("institution_personnel" as any)
          .select("user_id,role,status")
          .eq("institution_id", institutionId)
          .neq("status", "inactive")
          .limit(500);
        if (error) throw error;
        const rows = ((data as any[]) || []).filter((r) => r.user_id);
        const ids = [...new Set(rows.map((r) => r.user_id))];
        let names: Record<string, string> = {};
        if (ids.length) {
          try {
            const { data: profs } = await supabase.from("profiles").select("id,first_name,last_name").in("id", ids);
            ((profs as any[]) || []).forEach((p) => {
              names[p.id] = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unnamed member";
            });
          } catch { /* keep ids */ }
        }
        if (!cancelled) setMembers(rows.map((r) => ({ user_id: r.user_id, role: r.role, status: r.status, name: names[r.user_id] || "Team member" })));
      } catch (e) {
        console.error("Team roster failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [institutionId]);

  const byRole = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.role || "Unassigned"] = (acc[m.role || "Unassigned"] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4 flex items-center gap-3">
        <Users className="h-5 w-5 text-indigo-300" />
        <div>
          <p className="font-semibold text-white text-sm">{loading ? "Loading team…" : `${members.length} active team members`}</p>
          <p className="text-xs text-slate-400">Live personnel roster for this facility, grouped by assigned role.</p>
        </div>
        <ShieldCheck className="ml-auto h-5 w-5 text-emerald-400" />
      </div>
      {loading ? (
        <p className="text-xs text-slate-500 text-center py-8">Loading roster…</p>
      ) : members.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">No personnel registered for this facility yet.</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(byRole).sort((a, b) => b[1] - a[1]).map(([role, count]) => (
            <div key={role} className="bg-slate-700/20 rounded-lg p-3 border border-slate-600/20">
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-slate-300 capitalize">{role.replace(/_/g, " ")}</span>
                <span className="text-sm font-semibold text-slate-200">{count}</span>
              </div>
              <div className="h-1.5 rounded bg-slate-700 overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: `${Math.round((count / members.length) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MultiCenterAuditSuite({ institutionId }: { institutionId?: string }) {
  if (!institutionId) {
    return (
      <Card className="bg-slate-900 border-slate-700/50">
        <CardHeader><CardTitle className="text-white text-sm">Facility Governance</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-slate-400">No facility selected. Open this tab from a facility dashboard.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg shadow-indigo-900/30">
          <Network className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Facility Governance & Audit</h2>
          <p className="text-slate-400 text-sm">Live facility metrics, system-recorded audit trail, and team roster</p>
        </div>
        <div className="ml-auto hidden sm:block">
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30"><Server className="h-3 w-3 mr-1" />Live Data</Badge>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 rounded-lg text-xs">
            <Building2 className="h-3 w-3 mr-1" /> Facility Overview
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 rounded-lg text-xs">
            <Hash className="h-3 w-3 mr-1" /> Audit Trail
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 rounded-lg text-xs">
            <Users className="h-3 w-3 mr-1" /> Team & Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <FacilityOverview institutionId={institutionId} />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <FacilityAuditTrail />
        </TabsContent>
        <TabsContent value="team" className="mt-6">
          <FacilityTeam institutionId={institutionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
