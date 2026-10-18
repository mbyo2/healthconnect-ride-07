import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign, FileText, ShieldCheck, BarChart3, Loader2, Search,
  Building2, CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInstitutionAffiliation } from "@/hooks/useInstitutionAffiliation";
import { useCurrency } from "@/hooks/use-currency";
import { FinanceMetricsDashboard } from "@/components/metrics/RoleMetricsDashboard";
import { ReportCenter } from "@/components/reports/ReportCenter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const CLAIM_STATUS_COLOR: Record<string, string> = {
  submitted: "bg-warning-500",
  approved: "bg-success-500",
  rejected: "bg-destructive",
  paid: "bg-primary-500",
};

export const FinanceManagerWorkflow = () => {
  const { institutionId, loading: affilLoading } = useInstitutionAffiliation();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [invoiceFilter, setInvoiceFilter] = useState("all");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [claimFilter, setClaimFilter] = useState("all");
  const [followUpClaim, setFollowUpClaim] = useState<any>(null);
  const [followUpNote, setFollowUpNote] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Invoices ──────────────────────────────────────────────────
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["finance-invoices", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_billing" as any)
        .select("id, invoice_number, total_amount, paid_amount, balance, payment_status, created_at, patient_id")
        .eq("hospital_id", institutionId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const filteredInvoices = invoices.filter((inv: any) => {
    const matchesStatus = invoiceFilter === "all" || inv.payment_status === invoiceFilter;
    const q = invoiceSearch.toLowerCase();
    const matchesSearch =
      !q || inv.invoice_number?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  // ── Insurance claims ──────────────────────────────────────────
  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ["finance-claims", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_claims")
        .select("*")
        .eq("institution_id", institutionId)
        .order("submitted_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const filteredClaims = claims.filter(
    (c: any) => claimFilter === "all" || c.status === claimFilter
  );

  const updateClaimStatus = async (claim: any, status: string, note?: string) => {
    setSaving(true);
    try {
      const patch: any = { status, processed_at: new Date().toISOString() };
      if (status === "approved") patch.approved_amount = claim.claim_amount;
      if (note) patch.rejection_reason = note;
      const { error } = await supabase
        .from("insurance_claims")
        .update(patch)
        .eq("id", claim.id);
      if (error) throw error;
      toast.success(`Claim ${status}.`);
      queryClient.invalidateQueries({ queryKey: ["finance-claims", institutionId] });
      setFollowUpClaim(null);
      setFollowUpNote("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update claim.");
    } finally {
      setSaving(false);
    }
  };

  // ── No institution state ──────────────────────────────────────
  if (affilLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!institutionId) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> No institution linked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your finance manager account isn't linked to an institution yet.
            Ask your institution admin to add you to the staff roster, then
            refresh this page.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hospital = { id: institutionId, name: "Institution" };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary-500" /> Finance Manager
        </h2>
        <p className="text-sm text-muted-foreground">
          Revenue, invoices, insurance claims and financial reports.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5">
            <FileText className="h-4 w-4" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="claims" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Claims
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <FileText className="h-4 w-4" /> Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <FinanceMetricsDashboard />
        </TabsContent>

        {/* ── Invoices ── */}
        <TabsContent value="invoices" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {(["all", "pending", "partial", "paid"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setInvoiceFilter(s)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  invoiceFilter === s
                    ? "bg-primary-500 text-white border-primary-500"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="ml-1.5 opacity-70">
                  {s === "all"
                    ? invoices.length
                    : invoices.filter((i: any) => i.payment_status === s).length}
                </span>
              </button>
            ))}
            <div className="relative ml-auto">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="search"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="Search invoice #…"
                className="pl-8 h-8 text-xs w-44"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground mb-1">No invoices match.</p>
                  <p className="text-sm text-muted-foreground mb-4">Try widening your filters to see more invoices.</p>
                  <Button variant="outline" size="touch" onClick={() => { setInvoiceFilter("all"); setInvoiceSearch(""); }}>Clear filters</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left px-4 py-2.5 font-medium">Invoice #</th>
                        <th className="text-right px-4 py-2.5 font-medium">Total</th>
                        <th className="text-right px-4 py-2.5 font-medium">Paid</th>
                        <th className="text-right px-4 py-2.5 font-medium">Balance</th>
                        <th className="text-center px-4 py-2.5 font-medium">Status</th>
                        <th className="text-left px-4 py-2.5 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredInvoices.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-muted/40">
                          <td className="px-4 py-2.5 font-medium text-xs">{inv.invoice_number}</td>
                          <td className="px-4 py-2.5 text-right text-xs">{formatPrice(inv.total_amount || 0)}</td>
                          <td className="px-4 py-2.5 text-right text-xs text-success-600 dark:text-success-400">{formatPrice(inv.paid_amount || 0)}</td>
                          <td className="px-4 py-2.5 text-right text-xs text-destructive">{formatPrice(inv.balance || 0)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge variant={inv.payment_status === "paid" ? "default" : "secondary"} className="text-xs">
                              {inv.payment_status || "pending"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Insurance claims ── */}
        <TabsContent value="claims" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {(["all", "submitted", "approved", "rejected", "paid"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setClaimFilter(s)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  claimFilter === s
                    ? "bg-primary-500 text-white border-primary-500"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="ml-1.5 opacity-70">
                  {s === "all" ? claims.length : claims.filter((c: any) => c.status === s).length}
                </span>
              </button>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              {claimsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredClaims.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground mb-1">No claims match.</p>
                  <p className="text-sm text-muted-foreground mb-4">Try widening your filters to see more claims.</p>
                  <Button variant="outline" size="touch" onClick={() => setClaimFilter("all")}>Clear filters</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left px-4 py-2.5 font-medium">Patient</th>
                        <th className="text-left px-4 py-2.5 font-medium">Provider</th>
                        <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                        <th className="text-center px-4 py-2.5 font-medium">Status</th>
                        <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredClaims.map((claim: any) => (
                        <tr key={claim.id} className="hover:bg-muted/40">
                          <td className="px-4 py-2.5 text-xs font-medium">{claim.patient_name}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{claim.insurance_provider}</td>
                          <td className="px-4 py-2.5 text-right text-xs">{formatPrice(claim.claim_amount || 0)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white ${CLAIM_STATUS_COLOR[claim.status] || "bg-muted"}`}>
                              {claim.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              {claim.status === "submitted" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1"
                                    disabled={saving}
                                    onClick={() => updateClaimStatus(claim, "approved")}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => setFollowUpClaim(claim)}
                                  >
                                    <Clock className="h-3.5 w-3.5" /> Follow up
                                  </Button>
                                </>
                              )}
                              {claim.status === "approved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1"
                                  disabled={saving}
                                  onClick={() => updateClaimStatus(claim, "paid")}
                                >
                                  <DollarSign className="h-3.5 w-3.5" /> Mark paid
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reports ── */}
        <TabsContent value="reports" className="mt-4">
          <ReportCenter hospital={hospital} userRole="finance_manager" />
        </TabsContent>
      </Tabs>

      {/* Follow-up dialog */}
      <Dialog open={!!followUpClaim} onOpenChange={() => { setFollowUpClaim(null); setFollowUpNote(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Follow up — {followUpClaim?.patient_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {followUpClaim?.insurance_provider} · {formatPrice(followUpClaim?.claim_amount || 0)}
            </p>
            <Textarea
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              placeholder="Follow-up note (e.g. called insurer, awaiting documents)…"
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => updateClaimStatus(followUpClaim, "rejected", followUpNote || "Rejected after follow-up")}
            >
              <AlertTriangle className="h-4 w-4 mr-1.5" /> Reject
            </Button>
            <Button disabled={saving} onClick={() => updateClaimStatus(followUpClaim, "approved")}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
