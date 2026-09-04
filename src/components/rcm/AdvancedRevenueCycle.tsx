import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Calculator, FileText, AlertTriangle, CheckCircle2, XCircle, RefreshCw,
  Send, TrendingUp, DollarSign, Activity, ShieldCheck, Search, Plus, Trash2,
  Download, Eye, AlertCircle, Clock, ChevronRight, CreditCard, Banknote,
} from "lucide-react";
import {
  REGIONAL_PAYERS, adjudicateClaim, DENIAL_CODE_DICTIONARY,
  type InsurancePolicy, type BillingLineItem, type InsuranceClaim,
} from "@/utils/rcm-engine";
import { toast } from "sonner";

// ─── Demo Claims Pipeline ─────────────────────────────────────────────────────
const DEMO_CLAIMS: InsuranceClaim[] = [
  { id: "clm-001", claimNumber: "CLM-2024-001847", patientId: "pat-01", patientName: "Bwalya Chanda", memberPolicyNumber: "NHIMA-ZM-00234156", payerName: "NHIMA", providerNpi: "NPI-ZM-03491", dateOfService: "2024-08-15", totalBilled: 2400, patientPaid: 0, insuranceClaimed: 2400, status: "Adjudicated", eraCheckNumber: "ERA-20240820-001", adjudicatedAmount: 2400 },
  { id: "clm-002", claimNumber: "CLM-2024-001848", patientId: "pat-02", patientName: "Mutinta Nkosi", memberPolicyNumber: "MAD-ZM-PKG-09812", payerName: "Madison General Insurance (CarePlus)", providerNpi: "NPI-ZM-03491", dateOfService: "2024-08-17", totalBilled: 7850, patientPaid: 785, insuranceClaimed: 7065, status: "Submitted", preAuthToken: "AUTH-7234-B" },
  { id: "clm-003", claimNumber: "CLM-2024-001849", patientId: "pat-03", patientName: "Joseph Mwamba", memberPolicyNumber: "SAN-CORP-45991", payerName: "Sanlam Health Corporate Shield", providerNpi: "NPI-ZM-03491", dateOfService: "2024-08-18", totalBilled: 12600, patientPaid: 630, insuranceClaimed: 11970, status: "Denied", denialCode: "CO-197", denialReason: "Pre-authorization token missing for procedure CPT-43239." },
  { id: "clm-004", claimNumber: "CLM-2024-001850", patientId: "pat-04", patientName: "Naweza Phiri", memberPolicyNumber: "SES-ZM-EXP-0012", payerName: "Speciality Emergency Services", providerNpi: "NPI-ZM-03491", dateOfService: "2024-08-19", totalBilled: 5200, patientPaid: 780, insuranceClaimed: 4420, status: "Draft" },
  { id: "clm-005", claimNumber: "CLM-2024-001851", patientId: "pat-05", patientName: "Florence Tembo", memberPolicyNumber: "NHIMA-ZM-00167342", payerName: "NHIMA", providerNpi: "NPI-ZM-03491", dateOfService: "2024-08-20", totalBilled: 1850, patientPaid: 0, insuranceClaimed: 1850, status: "Remitted", eraCheckNumber: "ERA-20240825-002", adjudicatedAmount: 1850 },
  { id: "clm-006", claimNumber: "CLM-2024-001852", patientId: "pat-06", patientName: "Emmanuel Banda", memberPolicyNumber: "MAD-ZM-PKG-11024", payerName: "Madison General Insurance (CarePlus)", providerNpi: "NPI-ZM-03491", dateOfService: "2024-08-21", totalBilled: 3900, patientPaid: 390, insuranceClaimed: 3510, status: "Appealed", denialCode: "CO-16", denialReason: "Missing clinical documentation." },
];

const CPT_CATALOG = [
  { code: "CPT-99213", description: "Outpatient Visit – Level 3", defaultAmount: 850 },
  { code: "CPT-99232", description: "Subsequent Inpatient Care", defaultAmount: 1200 },
  { code: "CPT-43239", description: "Upper GI Endoscopy with Biopsy", defaultAmount: 4500 },
  { code: "CPT-27447", description: "Total Knee Replacement", defaultAmount: 18500 },
  { code: "CPT-71046", description: "Chest X-Ray (2 views)", defaultAmount: 380 },
  { code: "CPT-80053", description: "Comprehensive Metabolic Panel", defaultAmount: 620 },
  { code: "CPT-93000", description: "Electrocardiogram (ECG)", defaultAmount: 290 },
  { code: "CPT-70553", description: "MRI Brain with & without Contrast", defaultAmount: 3800 },
];

const STATUS_COLORS: Record<InsuranceClaim["status"], string> = {
  Draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  Scrubbed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Submitted: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Adjudicated: "bg-green-500/20 text-green-300 border-green-500/30",
  Remitted: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Denied: "bg-red-500/20 text-red-300 border-red-500/30",
  Appealed: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

function ClaimStatusBadge({ status }: { status: InsuranceClaim["status"] }) {
  return (
    <Badge className={`text-xs border ${STATUS_COLORS[status]}`}>{status}</Badge>
  );
}

// ─── Adjudication Simulator Tab ───────────────────────────────────────────────
function AdjudicationSimulator() {
  const [selectedPayerId, setSelectedPayerId] = useState<string>(REGIONAL_PAYERS[0].id);
  const [lineItems, setLineItems] = useState<BillingLineItem[]>([
    { id: "li-1", cptCode: "CPT-99213", description: "Outpatient Visit – Level 3", grossAmount: 850, quantity: 1, isCovered: true, icd10DiagnosticCode: "J06.9" },
  ]);
  const [preAuthToken, setPreAuthToken] = useState("");
  const [result, setResult] = useState<ReturnType<typeof adjudicateClaim> | null>(null);

  const policy = REGIONAL_PAYERS.find((p) => p.id === selectedPayerId) || REGIONAL_PAYERS[0];

  const addLine = () => {
    const cat = CPT_CATALOG[lineItems.length % CPT_CATALOG.length];
    setLineItems((prev) => [
      ...prev,
      { id: `li-${Date.now()}`, cptCode: cat.code, description: cat.description, grossAmount: cat.defaultAmount, quantity: 1, isCovered: true, icd10DiagnosticCode: "" },
    ]);
  };

  const removeLine = (id: string) => setLineItems((prev) => prev.filter((l) => l.id !== id));

  const runAdjudication = () => {
    const res = adjudicateClaim(lineItems, policy, preAuthToken);
    setResult(res);
    if (res.isCleanClaim) {
      toast.success("Clean claim — ready for electronic submission.");
    } else {
      toast.warning(`${res.scrubberWarnings.length} scrubber warning(s) found.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Payer Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-300 mb-2 block">Insurance Payer</Label>
          <Select value={selectedPayerId} onValueChange={setSelectedPayerId}>
            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {REGIONAL_PAYERS.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-white hover:bg-slate-700">
                  {p.payerName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-slate-300 mb-2 block">Pre-Authorization Token (if required)</Label>
          <Input
            value={preAuthToken}
            onChange={(e) => setPreAuthToken(e.target.value)}
            placeholder="e.g. AUTH-7234-B"
            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Policy Preview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Tier", value: policy.tier },
          { label: "Annual Deductible", value: `ZMW ${policy.annualDeductible.toLocaleString()}` },
          { label: "Co-Pay", value: policy.coPayType === "flat" ? `ZMW ${policy.coPayValue}` : `${policy.coPayValue}%` },
          { label: "Pre-Auth Threshold", value: `ZMW ${policy.preAuthThreshold.toLocaleString()}` },
        ].map((m) => (
          <div key={m.label} className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
            <p className="text-xs text-slate-400">{m.label}</p>
            <p className="text-sm font-semibold text-white mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Deductible Progress */}
      <div className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/30">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-slate-300">Annual Deductible Progress</span>
          <span className="text-sm font-semibold text-emerald-400">
            ZMW {policy.deductibleMet.toLocaleString()} / {policy.annualDeductible.toLocaleString()}
          </span>
        </div>
        <Progress
          value={policy.annualDeductible > 0 ? (policy.deductibleMet / policy.annualDeductible) * 100 : 100}
          className="h-2 bg-slate-600"
        />
        <p className="text-xs text-slate-500 mt-1">
          {policy.annualDeductible > 0
            ? `ZMW ${Math.max(0, policy.annualDeductible - policy.deductibleMet).toLocaleString()} remaining before full coverage`
            : "No deductible — full statutory coverage"}
        </p>
      </div>

      {/* Line Items */}
      <div>
        <div className="flex justify-between mb-3">
          <Label className="text-slate-300">Billing Line Items</Label>
          <Button size="sm" onClick={addLine} className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Add Line
          </Button>
        </div>
        <div className="space-y-2">
          {lineItems.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-slate-700/20 rounded-lg p-3 border border-slate-600/20">
              <div className="col-span-3">
                <Input
                  value={item.cptCode}
                  onChange={(e) => setLineItems((prev) => prev.map((l) => l.id === item.id ? { ...l, cptCode: e.target.value } : l))}
                  placeholder="CPT Code"
                  className="bg-slate-800/50 border-slate-600 text-white text-xs h-8"
                />
              </div>
              <div className="col-span-4">
                <Input
                  value={item.description}
                  onChange={(e) => setLineItems((prev) => prev.map((l) => l.id === item.id ? { ...l, description: e.target.value } : l))}
                  placeholder="Description"
                  className="bg-slate-800/50 border-slate-600 text-white text-xs h-8"
                />
              </div>
              <div className="col-span-2">
                <Input
                  value={item.icd10DiagnosticCode}
                  onChange={(e) => setLineItems((prev) => prev.map((l) => l.id === item.id ? { ...l, icd10DiagnosticCode: e.target.value } : l))}
                  placeholder="ICD-10"
                  className="bg-slate-800/50 border-slate-600 text-white text-xs h-8"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  value={item.grossAmount}
                  onChange={(e) => setLineItems((prev) => prev.map((l) => l.id === item.id ? { ...l, grossAmount: parseFloat(e.target.value) || 0 } : l))}
                  className="bg-slate-800/50 border-slate-600 text-white text-xs h-8"
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button size="icon" variant="ghost" onClick={() => removeLine(item.id)} className="h-7 w-7 text-slate-400 hover:text-red-400">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={runAdjudication} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3">
        <Calculator className="h-4 w-4 mr-2" /> Run Dynamic Adjudication
      </Button>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Scrubber Warnings */}
          {result.scrubberWarnings.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-amber-300 font-semibold text-sm">Clean Claim Scrubber Warnings</span>
              </div>
              {result.scrubberWarnings.map((w, i) => (
                <p key={i} className="text-amber-200 text-xs mt-1">• {w}</p>
              ))}
            </div>
          )}

          {result.isCleanClaim && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-300 text-sm font-medium">Clean Claim — All scrubber rules passed. Ready for electronic submission.</span>
            </div>
          )}

          {/* Pre-Auth Status */}
          {result.requiresPreAuth && (
            <div className={`rounded-lg p-3 flex items-center gap-2 border ${result.preAuthStatus === "Approved" ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
              <ShieldCheck className={`h-4 w-4 ${result.preAuthStatus === "Approved" ? "text-green-400" : "text-red-400"}`} />
              <span className={`text-sm font-medium ${result.preAuthStatus === "Approved" ? "text-green-300" : "text-red-300"}`}>
                Pre-Auth Required: {result.preAuthStatus}
              </span>
            </div>
          )}

          {/* Financial Breakdown */}
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 bg-slate-700/30 border-b border-slate-700/50">
              <h4 className="font-semibold text-white">Adjudication Summary</h4>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: "Gross Billed Amount", value: result.grossTotal, color: "text-white" },
                { label: "Applied Deductible", value: result.appliedDeductible, color: "text-amber-400" },
                { label: "Patient Co-Pay (flat)", value: result.patientCoPay, color: "text-amber-400" },
                { label: `Patient Co-Insurance (${policy.coPayValue}%)`, value: result.patientCoInsurance, color: "text-amber-400" },
                { label: "Total Patient Responsibility", value: result.totalPatientResponsibility, color: "text-red-400", bold: true },
                { label: "Total Insurer Payable", value: result.totalInsurerPayable, color: "text-emerald-400", bold: true },
              ].map((row) => (
                <div key={row.label} className={`flex justify-between py-1.5 ${row.bold ? "border-t border-slate-700 mt-2 pt-3" : ""}`}>
                  <span className="text-slate-400 text-sm">{row.label}</span>
                  <span className={`font-${row.bold ? "bold" : "medium"} ${row.color} text-sm`}>
                    ZMW {row.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Regional Rules */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-blue-300 text-xs font-medium mb-1">Regional Billing Rules Applied</p>
            {result.regionalBillingRuleNotes.map((note, i) => (
              <p key={i} className="text-blue-200/70 text-xs">• {note}</p>
            ))}
          </div>

          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            <Send className="h-4 w-4 mr-2" /> Submit Electronic Claim (EDI 837P)
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Claims Pipeline Tab ──────────────────────────────────────────────────────
function ClaimsPipeline() {
  const [claims, setClaims] = useState<InsuranceClaim[]>(DEMO_CLAIMS);
  const [search, setSearch] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);

  const filtered = claims.filter(
    (c) =>
      c.patientName.toLowerCase().includes(search.toLowerCase()) ||
      c.claimNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.payerName.toLowerCase().includes(search.toLowerCase())
  );

  const pipelineStages: InsuranceClaim["status"][] = ["Draft", "Scrubbed", "Submitted", "Adjudicated", "Remitted"];

  const handleAction = (claim: InsuranceClaim, action: string) => {
    if (action === "appeal") {
      setClaims((prev) => prev.map((c) => c.id === claim.id ? { ...c, status: "Appealed" } : c));
      toast.success(`Appeal submitted for ${claim.claimNumber}`);
    } else if (action === "scrub") {
      setClaims((prev) => prev.map((c) => c.id === claim.id ? { ...c, status: "Scrubbed" } : c));
      toast.success(`Claim ${claim.claimNumber} scrubbed — clean.`);
    } else if (action === "submit") {
      setClaims((prev) => prev.map((c) => c.id === claim.id ? { ...c, status: "Submitted" } : c));
      toast.success(`Claim ${claim.claimNumber} submitted electronically.`);
    }
  };

  const deniedClaims = claims.filter((c) => c.status === "Denied").length;
  const totalBilled = claims.reduce((s, c) => s + c.totalBilled, 0);
  const totalRemitted = claims.filter((c) => c.status === "Remitted").reduce((s, c) => s + (c.adjudicatedAmount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Billed", value: `ZMW ${(totalBilled / 1000).toFixed(1)}K`, icon: DollarSign, color: "text-blue-400" },
          { label: "Remitted", value: `ZMW ${(totalRemitted / 1000).toFixed(1)}K`, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Denied Claims", value: String(deniedClaims), icon: XCircle, color: "text-red-400" },
          { label: "Collection Rate", value: `${totalBilled > 0 ? ((totalRemitted / totalBilled) * 100).toFixed(1) : 0}%`, icon: TrendingUp, color: "text-amber-400" },
        ].map((m) => (
          <div key={m.label} className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
            <m.icon className={`h-5 w-5 ${m.color} mb-2`} />
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Kanban Row */}
      <div className="grid grid-cols-5 gap-2 text-center">
        {pipelineStages.map((stage, i) => {
          const count = claims.filter((c) => c.status === stage).length;
          return (
            <div key={stage} className="bg-slate-700/20 rounded-lg p-2 border border-slate-600/20">
              <div className={`text-xs font-semibold mb-1 ${count > 0 ? "text-blue-300" : "text-slate-500"}`}>{stage}</div>
              <div className={`text-2xl font-bold ${count > 0 ? "text-white" : "text-slate-600"}`}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search claims by patient, claim #, or payer..."
          className="pl-9 bg-slate-700/50 border-slate-600 text-white"
        />
      </div>

      {/* Claims Table */}
      <div className="space-y-2">
        {filtered.map((claim) => {
          const denial = claim.denialCode ? DENIAL_CODE_DICTIONARY[claim.denialCode] : null;
          return (
            <div
              key={claim.id}
              onClick={() => setSelectedClaim(selectedClaim?.id === claim.id ? null : claim)}
              className="bg-slate-700/20 rounded-xl border border-slate-600/30 p-4 cursor-pointer hover:border-blue-500/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-white text-sm">{claim.patientName}</p>
                    <p className="text-xs text-slate-400">{claim.claimNumber} · {claim.payerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">ZMW {claim.totalBilled.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">{claim.dateOfService}</p>
                  </div>
                  <ClaimStatusBadge status={claim.status} />
                  <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${selectedClaim?.id === claim.id ? "rotate-90" : ""}`} />
                </div>
              </div>

              {/* Expanded Detail */}
              {selectedClaim?.id === claim.id && (
                <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                  {denial && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <p className="text-red-300 font-semibold text-sm">{claim.denialCode} — {denial.title}</p>
                      <p className="text-red-200/70 text-xs mt-1">{denial.description}</p>
                      <p className="text-amber-300 text-xs mt-2 font-medium">Recommended Action: {denial.recommendedAction}</p>
                    </div>
                  )}
                  {claim.eraCheckNumber && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                      <p className="text-emerald-300 text-sm font-medium">ERA 835 Reconciled</p>
                      <p className="text-emerald-200/70 text-xs">Check #{claim.eraCheckNumber} · Adjudicated: ZMW {claim.adjudicatedAmount?.toLocaleString()}</p>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {claim.status === "Draft" && (
                      <Button size="sm" onClick={() => handleAction(claim, "scrub")} className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs">
                        <Activity className="h-3 w-3 mr-1" /> Run Scrubber
                      </Button>
                    )}
                    {claim.status === "Scrubbed" && (
                      <Button size="sm" onClick={() => handleAction(claim, "submit")} className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs">
                        <Send className="h-3 w-3 mr-1" /> Submit EDI
                      </Button>
                    )}
                    {claim.status === "Denied" && (
                      <Button size="sm" onClick={() => handleAction(claim, "appeal")} className="bg-purple-600 hover:bg-purple-700 text-white h-7 text-xs">
                        <RefreshCw className="h-3 w-3 mr-1" /> Submit Appeal
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 h-7 text-xs">
                      <Eye className="h-3 w-3 mr-1" /> View Full Claim
                    </Button>
                    <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 h-7 text-xs">
                      <Download className="h-3 w-3 mr-1" /> Export PDF
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ERA Reconciliation Tab ───────────────────────────────────────────────────
function ERAReconciliation() {
  const ERA_DATA = [
    { checkNumber: "ERA-20240820-001", payerName: "NHIMA", totalPaid: 14250, claimsCount: 6, date: "2024-08-20", status: "Reconciled" },
    { checkNumber: "ERA-20240825-002", payerName: "Madison General", totalPaid: 22680, claimsCount: 9, date: "2024-08-25", status: "Reconciled" },
    { checkNumber: "ERA-20240828-003", payerName: "Sanlam Health", totalPaid: 45000, claimsCount: 3, date: "2024-08-28", status: "Pending Match" },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-300">
        <strong>ERA 835 Electronic Remittance Advice</strong> — Incoming EOB batch files from payers are parsed, matched to open claims, and auto-posted to the patient ledger.
      </div>
      {ERA_DATA.map((era) => (
        <div key={era.checkNumber} className="bg-slate-700/20 rounded-xl border border-slate-600/30 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-white">{era.checkNumber}</p>
            <p className="text-xs text-slate-400">{era.payerName} · {era.date} · {era.claimsCount} claims</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-lg font-bold text-emerald-400">ZMW {era.totalPaid.toLocaleString()}</p>
              <Badge className={era.status === "Reconciled" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs" : "bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs"}>
                {era.status}
              </Badge>
            </div>
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 h-7 text-xs">
              <Download className="h-3 w-3 mr-1" /> Export
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdvancedRevenueCycle() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg shadow-blue-900/30">
          <CreditCard className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Advanced Revenue Cycle Management</h2>
          <p className="text-slate-400 text-sm">Dynamic insurance adjudication, claim scrubbing, ERA reconciliation, and denial management</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">NHIMA Accredited</Badge>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">EDI 837P Ready</Badge>
        </div>
      </div>

      <Tabs defaultValue="adjudicate">
        <TabsList className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
          <TabsTrigger value="adjudicate" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 rounded-lg text-xs">
            <Calculator className="h-3 w-3 mr-1" /> Adjudication Simulator
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 rounded-lg text-xs">
            <FileText className="h-3 w-3 mr-1" /> Claims Pipeline
          </TabsTrigger>
          <TabsTrigger value="era" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 rounded-lg text-xs">
            <Banknote className="h-3 w-3 mr-1" /> ERA Reconciliation
          </TabsTrigger>
        </TabsList>
        <TabsContent value="adjudicate" className="mt-6"><AdjudicationSimulator /></TabsContent>
        <TabsContent value="pipeline" className="mt-6"><ClaimsPipeline /></TabsContent>
        <TabsContent value="era" className="mt-6"><ERAReconciliation /></TabsContent>
      </Tabs>
    </div>
  );
}
