import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, CheckCircle2, XCircle, Hourglass } from "lucide-react";
import { toast } from "sonner";

/**
 * Admin inbox: institution marketplace-listing change requests.
 *
 * Requests are security_audit_log rows (event_type
 * 'marketplace_listing_requested', written via
 * src/utils/marketplaceListingRequests.ts — an institution can no longer
 * change its own list_in_marketplace; the DB trust guard refuses it).
 * A request is pending until a decision row exists (event_type
 * 'marketplace_listing_decided', event_data.request_log_id = request id).
 *
 * Approve: set healthcare_institutions.list_in_marketplace to the
 * requested state (the DB trust guard permits this because the caller is
 * a platform admin), then log the decision. Exception: an institution in
 * own-money (HMS only) payment mode can never be listed — approving a
 * list request for one is refused and NO decision is written.
 * Deny: log the decision only.
 */

type ListingRequest = {
  id: string;
  created_at: string | null;
  user_id: string | null;
  institution_id: string | null;
  institution_name: string;
  from_listed: boolean;
  to_listed: boolean;
  requested_by: string | null;
  requester_name: string;
  current_listed: boolean | null;
  current_payment_mode: string | null;
  decision: "approved" | "denied" | null;
  decided_at: string | null;
};

const listedLabel = (listed: boolean | null) =>
  listed === null ? "—" : listed ? "Listed" : "Not listed";

export const MarketplaceListingApprovals = () => {
  const [requests, setRequests] = useState<ListingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const [{ data: reqRows, error: reqErr }, { data: decRows }] = await Promise.all([
        supabase
          .from("security_audit_log")
          .select("id, created_at, user_id, event_data")
          .eq("event_type", "marketplace_listing_requested")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("security_audit_log")
          .select("created_at, event_data")
          .eq("event_type", "marketplace_listing_decided")
          .limit(500),
      ]);
      if (reqErr) throw reqErr;

      const decisions = new Map<string, { decision: "approved" | "denied"; decided_at: string | null }>();
      (decRows || []).forEach((d: any) => {
        const rid = d.event_data?.request_log_id;
        if (rid) decisions.set(rid, { decision: d.event_data?.decision, decided_at: d.created_at });
      });

      const parsed = (reqRows || []).map((r: any) => ({
        id: r.id,
        created_at: r.created_at,
        user_id: r.user_id,
        institution_id: r.event_data?.institution_id ?? null,
        institution_name: r.event_data?.institution_name ?? "Unknown institution",
        from_listed: !!r.event_data?.from_listed,
        to_listed: !!r.event_data?.to_listed,
        requested_by: r.event_data?.requested_by ?? r.user_id ?? null,
      }));

      // Enrich: live institution listing state + payment mode, requester names.
      const instIds = Array.from(new Set(parsed.map((p) => p.institution_id).filter(Boolean))) as string[];
      const userIds = Array.from(new Set(parsed.map((p) => p.requested_by).filter(Boolean))) as string[];
      const instMap: Record<string, any> = {};
      const userMap: Record<string, any> = {};
      if (instIds.length) {
        const { data } = await supabase
          .from("healthcare_institutions")
          .select("id, name, list_in_marketplace, payment_mode")
          .in("id", instIds);
        (data || []).forEach((i: any) => { instMap[i.id] = i; });
      }
      if (userIds.length) {
        const { data } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", userIds);
        (data || []).forEach((p: any) => { userMap[p.id] = p; });
      }

      setRequests(parsed.map((p) => {
        const inst = p.institution_id ? instMap[p.institution_id] : null;
        const requester = p.requested_by ? userMap[p.requested_by] : null;
        const dec = decisions.get(p.id);
        return {
          ...p,
          institution_name: inst?.name ?? p.institution_name,
          current_listed: inst ? !!inst.list_in_marketplace : null,
          current_payment_mode: inst?.payment_mode ?? null,
          requester_name: requester
            ? (`${requester.first_name || ""} ${requester.last_name || ""}`.trim() || requester.email || "Institution admin")
            : "Institution admin",
          decision: dec?.decision ?? null,
          decided_at: dec?.decided_at ?? null,
        } as ListingRequest;
      }));
    } catch (error) {
      console.error("Error fetching listing requests:", error);
      toast.error("Failed to load marketplace listing requests");
    } finally {
      setLoading(false);
    }
  };

  const writeDecision = async (req: ListingRequest, decision: "approved" | "denied") => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("security_audit_log").insert({
      event_type: "marketplace_listing_decided",
      user_id: user?.id,
      event_data: {
        request_log_id: req.id,
        decision,
        institution_id: req.institution_id,
        institution_name: req.institution_name,
        from_listed: req.from_listed,
        to_listed: req.to_listed,
        decided_by: user?.id,
      },
    });
    if (error) throw error;
  };

  const handleApprove = async (req: ListingRequest) => {
    if (!req.institution_id) {
      toast.error("Request is missing its institution — cannot approve");
      return;
    }
    try {
      setProcessing(req.id);
      if (req.to_listed === true) {
        // Live check, not the (possibly stale) list snapshot: an
        // own-money institution can never be listed. Refuse and write
        // NO decision, so the request stays actionable once the
        // institution's payment mode has been switched to platform.
        const { data: live, error: liveErr } = await supabase
          .from("healthcare_institutions")
          .select("payment_mode")
          .eq("id", req.institution_id)
          .maybeSingle();
        if (liveErr) throw liveErr;
        if ((live as any)?.payment_mode === "own") {
          toast.error("This institution is in own-money (HMS only) mode and can't be listed. Approve a payment-mode switch to platform first.");
          return;
        }
      }
      const { error: upErr } = await supabase
        .from("healthcare_institutions")
        .update({ list_in_marketplace: req.to_listed } as any)
        .eq("id", req.institution_id);
      if (upErr) throw upErr;
      await writeDecision(req, "approved");
      toast.success(`${req.institution_name} is now ${req.to_listed ? "listed in" : "removed from"} the marketplace`);
      fetchRequests();
    } catch (error: any) {
      console.error("Approve listing request failed:", error);
      toast.error(error.message || "Failed to approve request");
    } finally {
      setProcessing(null);
    }
  };

  const handleDeny = async (req: ListingRequest) => {
    try {
      setProcessing(req.id);
      await writeDecision(req, "denied");
      toast.success(`Request from ${req.institution_name} denied`);
      fetchRequests();
    } catch (error: any) {
      console.error("Deny listing request failed:", error);
      toast.error(error.message || "Failed to deny request");
    } finally {
      setProcessing(null);
    }
  };

  const pending = requests.filter((r) => !r.decision);
  const decided = requests.filter((r) => r.decision).slice(0, 10);

  const Row = ({ req }: { req: ListingRequest }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg bg-muted/30">
      <div className="space-y-1 min-w-0">
        <p className="font-medium text-sm truncate">{req.institution_name}</p>
        <p className="text-xs text-muted-foreground">
          Current: <span className="font-semibold">{listedLabel(req.current_listed ?? req.from_listed)}</span>
          {req.current_payment_mode ? <span> · Payment mode: <span className="font-semibold">{req.current_payment_mode}</span></span> : null}
          {" "}→ Requested: <span className="font-semibold">{listedLabel(req.to_listed)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Requested by {req.requester_name}
          {req.created_at ? ` · ${new Date(req.created_at).toLocaleString()}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {req.decision ? (
          <Badge variant={req.decision === "approved" ? "default" : "secondary"} className="capitalize">
            {req.decision}
            {req.decided_at ? ` · ${new Date(req.decided_at).toLocaleDateString()}` : ""}
          </Badge>
        ) : (
          <>
            <Button size="sm" onClick={() => handleApprove(req)} disabled={processing === req.id} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleDeny(req)} disabled={processing === req.id} className="gap-1.5">
              <XCircle className="h-4 w-4" /> Deny
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Marketplace Listing Approvals
          {pending.length > 0 && (
            <Badge variant="destructive" className="ml-1">{pending.length} pending</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Institutions cannot change their own marketplace listing — they request
          a change here; approving applies it immediately. An institution in
          own-money (HMS only) payment mode cannot be listed.
        </p>
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Hourglass className="h-4 w-4 animate-pulse" /> Loading requests…
          </p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending marketplace listing requests.</p>
        ) : (
          pending.map((r) => <Row key={r.id} req={r} />)
        )}
        {decided.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground pt-2 uppercase tracking-wide">Recent decisions</p>
            {decided.map((r) => <Row key={r.id} req={r} />)}
          </>
        )}
      </CardContent>
    </Card>
  );
};
