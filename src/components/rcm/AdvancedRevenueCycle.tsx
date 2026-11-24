import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText, AlertTriangle, CheckCircle2, XCircle, RefreshCw,
  Send, TrendingUp, DollarSign, Activity, Search,
  ChevronRight, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyErrorMessage } from "@/utils/friendly-error";

// ─── Claims Pipeline ──────────────────────────────────────────────────────────
// This surface renders ONLY real rows from public.insurance_claims.
// (Fixed 2026-11-23: an earlier version shipped hard-coded demo claims,
// a fake ERA feed, a client-side "adjudication simulator" and
// "NHIMA Accredited / EDI 837P Ready" badges with no transport behind
// them. All removed — there is no EDI 837/835 transport in the product,
// and this page must never present simulated data as live.)

type ClaimStatus = "Draft" | "Scrubbed" | "Submitted" | "Adjudicated" | "Remitted" | "Denied" | "Appealed";

interface ClaimRow {
  id: string;
  claimNumber: string;
  patientName: string;
  payerName: string;
  status: ClaimStatus;
  dateOfService: string;
  totalBilled: number;
  adjudicatedAmount?: number;
  denialReason?: string;
}

const STATUS_COLORS: Record<ClaimStatus, string> = {
  Draft: "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30",
  Scrubbed: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
  Submitted: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30",
  Adjudicated: "bg-green-500/20 text-green-700 dark:text-green-700 dark:text-green-300 border-green-500/30",
  Remitted: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  Denied: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
  Appealed: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30",
};

function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <Badge className={`text-xs border ${STATUS_COLORS[status]}`}>{status}</Badge>
  );
}

// Live insurance_claims.status is free text, default 'submitted', stored
// lower-case by the app's write paths. Normalise to the UI vocabulary.
function mapStatus(raw: string | null | undefined): ClaimStatus {
  switch ((raw || "").trim().toLowerCase()) {
    case "draft": return "Draft";
    case "scrubbed": return "Scrubbed";
    case "adjudicated":
    case "approved": return "Adjudicated";
    case "remitted":
    case "paid": return "Remitted";
    case "denied":
    case "rejected": return "Denied";
    case "appealed": return "Appealed";
    case "submitted":
    default: return "Submitted";
  }
}

function mapClaim(c: any): ClaimRow {
  return {
    id: c.id,
    claimNumber: c.claim_number || `#${String(c.id).slice(0, 8).toUpperCase()}`,
    patientName: c.patient_name || "Patient",
    payerName: c.insurance_provider || "Unknown",
    status: mapStatus(c.status),
    dateOfService: c.service_date || (c.submitted_at ? String(c.submitted_at).slice(0, 10) : "—"),
    totalBilled: Number(c.claim_amount ?? c.claimed_amount ?? 0),
    adjudicatedAmount: c.approved_amount != null ? Number(c.approved_amount) : undefined,
    denialReason: c.rejection_reason || undefined,
  };
}

function ClaimsPipeline({ institutionId }: { institutionId?: string }) {
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<ClaimRow | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        let query = (supabase as any)
          .from("insurance_claims")
          .select("*")
          .order("submitted_at", { ascending: false })
          .limit(100);
        if (institutionId) query = query.eq("institution_id", institutionId);
        const { data, error } = await query;
        if (error) throw error;
        setClaims((data || []).map(mapClaim));
      } catch (e) {
        console.error("Failed to load claims:", e);
        setLoadError(friendlyErrorMessage(e, "Could not load claims."));
      } finally {
        setLoading(false);
      }
    })();
  }, [institutionId]);

  const filtered = claims.filter(
    (c) =>
      c.patientName.toLowerCase().includes(search.toLowerCase()) ||
      c.claimNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.payerName.toLowerCase().includes(search.toLowerCase())
  );

  const pipelineStages: ClaimStatus[] = ["Draft", "Scrubbed", "Submitted", "Adjudicated", "Remitted"];

  const handleAction = async (claim: ClaimRow, action: string) => {
    const statusMap: Record<string, ClaimStatus> = {
      appeal: "Appealed",
      scrub: "Scrubbed",
      submit: "Submitted",
    };
    const newStatus = statusMap[action];
    if (!newStatus) return;

    // Persist to the database first — local state only updates on success.
    // A toast that says "submitted" when nothing saved is a lie. These
    // actions track the claim's internal workflow status only; claims are
    // submitted to payers outside this system (no EDI transport exists).
    try {
      const patch: any = { status: newStatus.toLowerCase(), updated_at: new Date().toISOString() };
      if (action === "submit") patch.submitted_at = new Date().toISOString();

      const { error } = await (supabase as any)
        .from("insurance_claims")
        .update(patch)
        .eq("id", claim.id);
      if (error) throw error;

      setClaims((prev) => prev.map((c) => (c.id === claim.id ? { ...c, status: newStatus } : c)));

      if (action === "appeal") toast.success(`Appeal recorded for claim ${claim.claimNumber}.`);
      else if (action === "scrub") toast.success(`Claim ${claim.claimNumber} marked as scrubbed.`);
      else if (action === "submit") toast.success(`Claim ${claim.claimNumber} marked as submitted.`);
    } catch (e: any) {
      console.error("Claim action failed:", e);
      toast.error(friendlyErrorMessage(e, `Could not ${action} claim ${claim.claimNumber}. Not saved.`));
    }
  };

  const deniedClaims = claims.filter((c) => c.status === "Denied").length;
  const totalBilled = claims.reduce((s, c) => s + c.totalBilled, 0);
  const totalRemitted = claims
    .filter((c) => c.status === "Remitted")
    .reduce((s, c) => s + (c.adjudicatedAmount ?? c.totalBilled), 0);

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Billed", value: `ZMW ${(totalBilled / 1000).toFixed(1)}K`, icon: DollarSign, color: "text-blue-700 dark:text-blue-400" },
          { label: "Remitted", value: `ZMW ${(totalRemitted / 1000).toFixed(1)}K`, icon: CheckCircle2, color: "text-emerald-700 dark:text-emerald-400" },
          { label: "Denied Claims", value: String(deniedClaims), icon: XCircle, color: "text-red-700 dark:text-red-400" },
          { label: "Collection Rate", value: `${totalBilled > 0 ? ((totalRemitted / totalBilled) * 100).toFixed(1) : 0}%`, icon: TrendingUp, color: "text-amber-700 dark:text-amber-400" },
        ].map((m) => (
          <div key={m.label} className="bg-muted rounded-xl p-4 border border-border">
            <m.icon className={`h-5 w-5 ${m.color} mb-2`} />
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Kanban Row */}
      <div className="grid grid-cols-5 gap-2 text-center">
        {pipelineStages.map((stage) => {
          const count = claims.filter((c) => c.status === stage).length;
          return (
            <div key={stage} className="bg-muted rounded-lg p-2 border border-border">
              <div className={`text-xs font-semibold mb-1 ${count > 0 ? "text-blue-700 dark:text-blue-300" : "text-muted-foreground"}`}>{stage}</div>
              <div className={`text-2xl font-bold ${count > 0 ? "text-foreground" : "text-muted-foreground"}`}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search claims by patient, claim #, or payer..."
          className="pl-9 bg-background border-input text-foreground"
        />
      </div>

      {/* Claims List */}
      {loading ? (
        <div className="bg-muted rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading claims…</p>
        </div>
      ) : loadError ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
          <AlertTriangle className="h-6 w-6 text-red-700 dark:text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-700 dark:text-red-200">{loadError}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-muted rounded-xl border border-border p-8 text-center">
          <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-foreground font-medium">
            {claims.length === 0 ? "No insurance claims yet" : "No claims match your search"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {claims.length === 0
              ? "Claims created from patient billing will appear here."
              : "Try a different patient name, claim number, or payer."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((claim) => (
            <div
              key={claim.id}
              onClick={() => setSelectedClaim(selectedClaim?.id === claim.id ? null : claim)}
              className="bg-muted rounded-xl border border-border p-4 cursor-pointer hover:border-blue-500/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{claim.patientName}</p>
                    <p className="text-xs text-muted-foreground">{claim.claimNumber} · {claim.payerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">ZMW {claim.totalBilled.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{claim.dateOfService}</p>
                  </div>
                  <ClaimStatusBadge status={claim.status} />
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedClaim?.id === claim.id ? "rotate-90" : ""}`} />
                </div>
              </div>

              {/* Expanded Detail */}
              {selectedClaim?.id === claim.id && (
                <div className="mt-4 pt-4 border-t border-border space-y-3 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                  {claim.status === "Denied" && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <p className="text-red-700 dark:text-red-300 font-semibold text-sm">Claim denied</p>
                      <p className="text-red-800 dark:text-red-200/70 text-xs mt-1">
                        {claim.denialReason || "No reason was recorded for this denial."}
                      </p>
                    </div>
                  )}
                  {claim.adjudicatedAmount != null && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                      <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                        Approved amount: ZMW {claim.adjudicatedAmount.toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {claim.status === "Draft" && (
                      <Button size="sm" onClick={() => handleAction(claim, "scrub")} className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs">
                        <Activity className="h-3 w-3 mr-1" /> Mark Scrubbed
                      </Button>
                    )}
                    {claim.status === "Scrubbed" && (
                      <Button size="sm" onClick={() => handleAction(claim, "submit")} className="bg-emerald-700 hover:bg-emerald-800 text-white h-7 text-xs">
                        <Send className="h-3 w-3 mr-1" /> Mark Submitted
                      </Button>
                    )}
                    {claim.status === "Denied" && (
                      <Button size="sm" onClick={() => handleAction(claim, "appeal")} className="bg-purple-600 hover:bg-purple-700 text-white h-7 text-xs">
                        <RefreshCw className="h-3 w-3 mr-1" /> Record Appeal
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdvancedRevenueCycle({ institutionId }: { institutionId?: string }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary-600 rounded-xl">
          <CreditCard className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Revenue Cycle — Insurance Claims</h2>
          <p className="text-muted-foreground text-sm">Live claims pipeline from patient billing: submission tracking, approvals, and denial management</p>
        </div>
      </div>

      <ClaimsPipeline institutionId={institutionId} />
    </div>
  );
}
