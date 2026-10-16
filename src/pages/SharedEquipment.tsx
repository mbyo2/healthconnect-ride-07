import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useInstitutionAffiliation } from "@/hooks/useInstitutionAffiliation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, MapPin, Building2, Loader2, CheckCircle, XCircle, Clock, Ban } from "lucide-react";
import { toast } from "sonner";

type SharedMachine = {
  id: string;
  institution_id: string;
  institution_name: string;
  institution_city: string | null;
  asset_name: string;
  asset_tag: string | null;
  category: string;
  manufacturer: string | null;
  model_number: string | null;
  location: string | null;
  status: string;
  condition: string | null;
  share_terms: string | null;
  share_rate: number | null;
};

type ShareRequest = {
  id: string;
  asset_id: string;
  owner_institution_id: string;
  requester_institution_id: string;
  status: string;
  requested_date: string | null;
  purpose: string | null;
  notes: string | null;
  created_at: string;
  asset_name?: string;
  other_party?: string;
};

const statusBadge = (s: string) => {
  switch (s) {
    case "approved": return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    case "declined": return <Badge variant="outline" className="text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
    case "cancelled": return <Badge variant="outline"><Ban className="h-3 w-3 mr-1" />Cancelled</Badge>;
    case "completed": return <Badge variant="outline" className="text-primary border-primary/30"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
    default: return <Badge variant="outline" className="text-amber-700 border-amber-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  }
};

export default function SharedEquipment() {
  const { user } = useAuth();
  const { institutionId, isInstitutionAffiliated } = useInstitutionAffiliation();
  const [machines, setMachines] = useState<SharedMachine[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [incoming, setIncoming] = useState<ShareRequest[]>([]);
  const [outgoing, setOutgoing] = useState<ShareRequest[]>([]);
  const [reqOpen, setReqOpen] = useState(false);
  const [reqMachine, setReqMachine] = useState<SharedMachine | null>(null);
  const [reqDate, setReqDate] = useState("");
  const [reqPurpose, setReqPurpose] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchMachines = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from("shareable_equipment" as any) as any)
        .select("*")
        .order("asset_name", { ascending: true })
        .limit(200);
      if (error) throw error;
      // Never show our own institution's machines here (can't request your own)
      setMachines(((data || []) as SharedMachine[]).filter((m) => m.institution_id !== institutionId));
    } catch (e: any) {
      toast.error(e.message || "Failed to load shared machines");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  const fetchRequests = useCallback(async () => {
    if (!institutionId) return;
    try {
      const { data, error } = await (supabase.from("equipment_share_requests" as any) as any)
        .select("*")
        .or(`owner_institution_id.eq.${institutionId},requester_institution_id.eq.${institutionId}`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data || []) as any[];
      // Enrich with asset + other-party names. Asset names come from the
      // shareable_equipment view (safe columns, cross-institution readable);
      // asset_register itself is locked to own-institution staff by RLS.
      const assetIds = [...new Set(rows.map((r) => r.asset_id))];
      const { data: assets } = await (supabase.from("shareable_equipment" as any) as any)
        .select("id, asset_name").in("id", assetIds.length ? assetIds : ["00000000-0000-0000-0000-000000000000"]);
      const assetMap = new Map(((assets || []) as any[]).map((a) => [a.id, a.asset_name]));
      const instIds = [...new Set(rows.flatMap((r) => [r.owner_institution_id, r.requester_institution_id]))];
      const { data: insts } = await supabase.from("healthcare_institutions").select("id, name").in("id", instIds.length ? instIds : ["00000000-0000-0000-0000-000000000000"]);
      const instMap = new Map(((insts || []) as any[]).map((i) => [i.id, i.name]));
      const enrich = (r: any): ShareRequest => ({
        ...r,
        asset_name: assetMap.get(r.asset_id) || "Machine",
        other_party: instMap.get(r.owner_institution_id === institutionId ? r.requester_institution_id : r.owner_institution_id) || "Institution",
      });
      setIncoming(rows.filter((r) => r.owner_institution_id === institutionId).map(enrich));
      setOutgoing(rows.filter((r) => r.requester_institution_id === institutionId).map(enrich));
    } catch (e: any) {
      console.error("Failed to load share requests:", e);
    }
  }, [institutionId]);

  useEffect(() => { fetchMachines(); }, [fetchMachines]);
  useEffect(() => {
    fetchRequests();
    if (!institutionId) return;
    // Real-time: requests update both sides instantly
    const ch = supabase.channel(`equipment_sharing_${institutionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "equipment_share_requests" }, () => {
        fetchRequests();
        fetchMachines();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [institutionId, fetchRequests, fetchMachines]);

  const openRequest = (m: SharedMachine) => {
    if (!isInstitutionAffiliated || !institutionId) {
      toast.error("Your account must belong to an institution to request machines");
      return;
    }
    setReqMachine(m);
    setReqDate("");
    setReqPurpose("");
    setReqOpen(true);
  };

  const submitRequest = async () => {
    if (!reqMachine || !institutionId || !user) return;
    if (!reqPurpose.trim()) { toast.error("Please describe the purpose"); return; }
    setSaving(true);
    try {
      const { error } = await (supabase.from("equipment_share_requests" as any) as any).insert({
        asset_id: reqMachine.id,
        owner_institution_id: reqMachine.institution_id,
        requester_institution_id: institutionId,
        requested_by: user.id,
        requested_date: reqDate || null,
        purpose: reqPurpose.trim(),
      });
      if (error) throw error;
      toast.success(`Request sent to ${reqMachine.institution_name}`);
      setReqOpen(false);
      fetchRequests();
    } catch (e: any) {
      toast.error(e.message || "Failed to send request");
    } finally {
      setSaving(false);
    }
  };

  const decide = async (id: string, status: "approved" | "declined" | "completed") => {
    try {
      const { error } = await (supabase.from("equipment_share_requests" as any) as any)
        .update({ status, decided_by: user?.id, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success(status === "approved" ? "Request approved" : status === "declined" ? "Request declined" : "Marked completed");
      fetchRequests();
    } catch (e: any) {
      toast.error(e.message || "Failed to update request");
    }
  };

  const cancel = async (id: string) => {
    try {
      const { error } = await (supabase.from("equipment_share_requests" as any) as any)
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success("Request cancelled");
      fetchRequests();
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel");
    }
  };

  const filtered = machines.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [m.asset_name, m.category, m.manufacturer, m.institution_name, m.institution_city, m.asset_tag]
      .filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  return (
    <>
      <Helmet>
        <title>Shared Equipment | Doc' O Clock</title>
        <meta name="description" content="Find and request shared medical machines across institutions" />
      </Helmet>
      <div className="min-h-screen bg-canvas text-midnight font-sans pb-16">
        <div className="doc-page-header px-4 sm:px-6 py-5 shadow-sm">
          <div className="max-w-content mx-auto">
            <h1 className="font-display text-2xl font-medium tracking-tight">Shared Equipment</h1>
            <p className="text-sm text-graphite-500 font-medium tracking-wide">
              Machines shared by verified institutions — request usage across facilities
            </p>
          </div>
        </div>

        <div className="max-w-content mx-auto px-4 sm:px-6 pt-6">
          <Tabs defaultValue="directory">
            <TabsList>
              <TabsTrigger value="directory">Find Machines</TabsTrigger>
              <TabsTrigger value="requests">
                Requests {(incoming.filter((r) => r.status === "pending").length + outgoing.filter((r) => r.status === "pending").length) > 0 && (
                  <Badge className="ml-2 h-5 min-w-5 px-1">{incoming.filter((r) => r.status === "pending").length + outgoing.filter((r) => r.status === "pending").length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="directory" className="mt-4">
              <div className="relative max-w-xl mb-4">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-graphite-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search machines, institutions, categories…" className="pl-9" />
              </div>
              {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto my-8" /> : filtered.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No shared machines found. Check back soon.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((m) => (
                    <Card key={m.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center justify-between gap-2">
                          <span className="truncate">{m.asset_name}</span>
                          <Badge variant="outline" className="shrink-0 text-green-700 border-green-500/30">Available</Badge>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />{m.institution_name}
                          {m.institution_city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.institution_city}</span>}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p className="text-muted-foreground">{m.category}{m.manufacturer ? ` • ${m.manufacturer}` : ""}{m.model_number ? ` ${m.model_number}` : ""}</p>
                        {m.condition && <p className="text-muted-foreground">Condition: {m.condition}</p>}
                        {m.share_terms && <p className="text-xs bg-muted/50 rounded-lg p-2">{m.share_terms}</p>}
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-bold">{m.share_rate != null && Number(m.share_rate) > 0 ? `K${Number(m.share_rate).toLocaleString("en-ZM")}` : "Free"}</span>
                          <Button size="sm" onClick={() => openRequest(m)}>Request Use</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="mt-4 space-y-6">
              <div>
                <h2 className="font-bold mb-2">Incoming — requests for your machines</h2>
                {incoming.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
                  <div className="space-y-2">
                    {incoming.map((r) => (
                      <Card key={r.id}><CardContent className="pt-4 flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-medium">{r.asset_name} <span className="text-muted-foreground font-normal">← {r.other_party}</span></p>
                          <p className="text-xs text-muted-foreground">{r.purpose}{r.requested_date ? ` • ${r.requested_date}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {statusBadge(r.status)}
                          {r.status === "pending" && (
                            <>
                              <Button size="sm" onClick={() => decide(r.id, "approved")}>Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => decide(r.id, "declined")}>Decline</Button>
                            </>
                          )}
                          {r.status === "approved" && (
                            <Button size="sm" variant="outline" onClick={() => decide(r.id, "completed")}>Mark completed</Button>
                          )}
                        </div>
                      </CardContent></Card>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h2 className="font-bold mb-2">My requests</h2>
                {outgoing.length === 0 ? <p className="text-sm text-muted-foreground">You haven't requested any machines.</p> : (
                  <div className="space-y-2">
                    {outgoing.map((r) => (
                      <Card key={r.id}><CardContent className="pt-4 flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-medium">{r.asset_name} <span className="text-muted-foreground font-normal">→ {r.other_party}</span></p>
                          <p className="text-xs text-muted-foreground">{r.purpose}{r.requested_date ? ` • ${r.requested_date}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {statusBadge(r.status)}
                          {r.status === "pending" && <Button size="sm" variant="outline" onClick={() => cancel(r.id)}>Cancel</Button>}
                        </div>
                      </CardContent></Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request "{reqMachine?.asset_name}"</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">To: {reqMachine?.institution_name}{reqMachine?.institution_city ? `, ${reqMachine.institution_city}` : ""}</p>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Needed date (optional)</Label><Input type="date" value={reqDate} onChange={(e) => setReqDate(e.target.value)} /></div>
            <div className="space-y-1"><Label>Purpose</Label><Textarea value={reqPurpose} onChange={(e) => setReqPurpose(e.target.value)} rows={3} placeholder="e.g. CT scan for referred patient, 2 sessions" /></div>
          </div>
          <Button onClick={submitRequest} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Send request</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
