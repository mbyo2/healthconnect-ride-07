import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Building2, ShieldCheck, Activity, Globe, Users, DollarSign, TrendingUp, TrendingDown,
  Lock, Download, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Eye, Server,
  Network, Cpu, HardDrive, Zap, ArrowRightLeft, MapPin, BarChart3, FileCheck,
  ChevronDown, ChevronUp, Search, Hash, Terminal, Clock,
} from "lucide-react";
import {
  generateDemoAuditEntries, verifyAuditChain, generateForensicAuditReport,
  type FinancialAuditEntry, type AuditAction,
} from "@/utils/audit-crypto";
import { toast } from "sonner";

// ─── Multi-Center Branch Data ─────────────────────────────────────────────────
const BRANCH_NETWORK = [
  { id: "br-hq", name: "HQ Medical Group – Lusaka", type: "Headquarters", location: "Lusaka, ZM", revenue: 182400, target: 200000, staff: 312, beds: 180, occupancy: 78, status: "Operational", color: "#0073ea" },
  { id: "br-ndola", name: "Northern Branch – Ndola", type: "Regional Hospital", location: "Ndola, ZM", revenue: 94500, target: 100000, staff: 148, beds: 80, occupancy: 65, status: "Operational", color: "#00d4aa" },
  { id: "br-chipata", name: "Eastern Wing – Chipata", type: "Clinic", location: "Chipata, ZM", revenue: 42300, target: 50000, staff: 74, beds: 40, occupancy: 82, status: "Operational", color: "#ff7043" },
  { id: "br-livingstone", name: "Southern Clinic – Livingstone", type: "Specialty Center", location: "Livingstone, ZM", revenue: 61800, target: 65000, staff: 96, beds: 55, occupancy: 70, status: "Maintenance Window", color: "#ab47bc" },
  { id: "br-kabwe", name: "Central Satellite – Kabwe", type: "Dispensary", location: "Kabwe, ZM", revenue: 18200, target: 22000, staff: 28, beds: 12, occupancy: 55, status: "Operational", color: "#ffa726" },
];

const INTER_BRANCH_SETTLEMENTS = [
  { id: "ibs-001", from: "HQ Medical Group – Lusaka", to: "Northern Branch – Ndola", amount: 12400, purpose: "Specialist Referral Fee Distribution", date: "2024-08-28", status: "Settled" },
  { id: "ibs-002", from: "Eastern Wing – Chipata", to: "HQ Medical Group – Lusaka", amount: 5800, purpose: "Lab Processing & Pathology Services", date: "2024-08-29", status: "Pending" },
  { id: "ibs-003", from: "HQ Medical Group – Lusaka", to: "Southern Clinic – Livingstone", amount: 8200, purpose: "Medical Equipment Lease Allocation", date: "2024-08-30", status: "Settled" },
];

// ─── Branch Network Map ───────────────────────────────────────────────────────
function BranchNetworkMap({ selectedBranchId, onSelect }: { selectedBranchId: string; onSelect: (id: string) => void }) {
  const totalRevenue = BRANCH_NETWORK.reduce((s, b) => s + b.revenue, 0);
  const totalTarget = BRANCH_NETWORK.reduce((s, b) => s + b.target, 0);

  return (
    <div className="space-y-4">
      {/* Group KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Group Revenue (MTD)", value: `ZMW ${(totalRevenue / 1000).toFixed(0)}K`, icon: DollarSign, color: "text-blue-400" },
          { label: "Target Attainment", value: `${((totalRevenue / totalTarget) * 100).toFixed(1)}%`, icon: TrendingUp, color: "text-emerald-400" },
          { label: "Active Branches", value: String(BRANCH_NETWORK.filter((b) => b.status === "Operational").length), icon: Building2, color: "text-indigo-400" },
          { label: "Total Staff (Group)", value: String(BRANCH_NETWORK.reduce((s, b) => s + b.staff, 0)), icon: Users, color: "text-amber-400" },
        ].map((m) => (
          <div key={m.label} className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
            <m.icon className={`h-5 w-5 ${m.color} mb-2`} />
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Branch List */}
      <div className="space-y-3">
        {BRANCH_NETWORK.map((branch) => {
          const pct = Math.round((branch.revenue / branch.target) * 100);
          const isSelected = selectedBranchId === branch.id;
          return (
            <div
              key={branch.id}
              onClick={() => onSelect(branch.id)}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${isSelected ? "border-blue-500/60 bg-blue-500/10" : "border-slate-600/30 bg-slate-700/20 hover:border-slate-500/40"}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: `${branch.color}20` }}>
                    <Building2 className="h-5 w-5" style={{ color: branch.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{branch.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-500" />
                      <span className="text-xs text-slate-400">{branch.location} · {branch.type}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">ZMW {branch.revenue.toLocaleString()}</p>
                  <Badge className={branch.status === "Operational" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs" : "bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs"}>
                    {branch.status}
                  </Badge>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Revenue vs Target</span>
                  <span>{pct}%</span>
                </div>
                <Progress value={pct} className="h-1.5 bg-slate-700" />
              </div>
              <div className="flex gap-4 mt-3 text-xs text-slate-400">
                <span>🛏 {branch.beds} beds · {branch.occupancy}% occ.</span>
                <span>👥 {branch.staff} staff</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inter-Branch Settlements */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-blue-400" /> Inter-Branch Settlements
        </h3>
        <div className="space-y-2">
          {INTER_BRANCH_SETTLEMENTS.map((s) => (
            <div key={s.id} className="bg-slate-700/20 rounded-lg p-3 border border-slate-600/20 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-300">{s.from} <span className="text-blue-400 mx-1">→</span> {s.to}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.purpose} · {s.date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">ZMW {s.amount.toLocaleString()}</p>
                <Badge className={s.status === "Settled" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs" : "bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs"}>
                  {s.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Cryptographic Audit Trail ────────────────────────────────────────────────
const ACTION_COLORS: Record<string, string> = {
  PAYMENT_RECEIVED: "text-emerald-400",
  INVOICE_CREATED: "text-blue-400",
  CLAIM_SUBMITTED: "text-indigo-400",
  CLAIM_ADJUDICATED: "text-cyan-400",
  CLAIM_DENIED: "text-red-400",
  WRITE_OFF_APPROVED: "text-amber-400",
  REFUND_ISSUED: "text-orange-400",
  INTER_BRANCH_TRANSFER: "text-purple-400",
  ERA_RECONCILED: "text-teal-400",
  COPAY_COLLECTED: "text-green-400",
  DEDUCTIBLE_APPLIED: "text-yellow-400",
  APPEAL_SUBMITTED: "text-pink-400",
};

function CryptoAuditTrail() {
  const [entries, setEntries] = useState<FinancialAuditEntry[]>([]);
  const [verificationResults, setVerificationResults] = useState<{ index: number; entryId: string; isValid: boolean }[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [chainIntegrityRun, setChainIntegrityRun] = useState(false);

  useEffect(() => {
    setEntries(generateDemoAuditEntries(30));
  }, []);

  const runChainVerification = useCallback(async () => {
    setVerifying(true);
    setChainIntegrityRun(false);
    // Simulate async SHA-256 computation delay
    await new Promise((r) => setTimeout(r, 1200));
    const results = await verifyAuditChain(entries);
    setVerificationResults(results);
    setChainIntegrityRun(true);
    setVerifying(false);
    const tamperedCount = results.filter((r) => !r.isValid).length;
    if (tamperedCount === 0) {
      toast.success(`All ${results.length} audit entries verified — chain integrity confirmed.`);
    } else {
      toast.error(`${tamperedCount} tampered entries detected in audit chain!`);
    }
  }, [entries]);

  const handleExport = () => {
    const report = generateForensicAuditReport(entries, verificationResults, "HQ Medical Group – Lusaka");
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ForensicAuditCertificate_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Forensic audit certificate exported.");
  };

  const filtered = entries.filter(
    (e) =>
      e.actorName.toLowerCase().includes(search.toLowerCase()) ||
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.entityRef.toLowerCase().includes(search.toLowerCase()) ||
      e.branchName.toLowerCase().includes(search.toLowerCase())
  );

  const verifiedCount = verificationResults.filter((r) => r.isValid).length;

  return (
    <div className="space-y-5">
      {/* Chain Integrity Banner */}
      <div className="flex items-center justify-between bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-700/50 rounded-lg">
            <Hash className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">SHA-256 Hash-Chained Financial Ledger</p>
            <p className="text-xs text-slate-400">
              {chainIntegrityRun ? (
                <span className={verifiedCount === entries.length ? "text-emerald-400" : "text-red-400"}>
                  {verifiedCount} / {entries.length} entries verified — {verifiedCount === entries.length ? "Chain INTACT" : "TAMPERED ENTRIES DETECTED"}
                </span>
              ) : (
                "Run verification to confirm cryptographic chain integrity"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={runChainVerification}
            disabled={verifying}
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs gap-1"
          >
            {verifying ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
            {verifying ? "Verifying..." : "Verify Chain"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8 text-xs gap-1">
            <Download className="h-3 w-3" /> Export Certificate
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Entries", value: String(entries.length), color: "text-blue-400" },
          { label: "Unique Actors", value: String(new Set(entries.map((e) => e.actorId)).size), color: "text-indigo-400" },
          { label: "Branches Covered", value: String(new Set(entries.map((e) => e.branchId)).size), color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="bg-slate-700/20 rounded-lg p-3 border border-slate-600/20 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by actor, action, entity, or branch..." className="pl-9 bg-slate-700/50 border-slate-600 text-white" />
      </div>

      {/* Audit Entries */}
      <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
        {filtered.map((entry) => {
          const isVerified = verificationResults.find((r) => r.entryId === entry.id);
          const isExpanded = expandedId === entry.id;
          return (
            <div
              key={entry.id}
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              className={`rounded-lg border p-3 cursor-pointer transition-all ${isVerified?.isValid === false ? "border-red-500/40 bg-red-500/5" : "border-slate-600/30 bg-slate-700/10 hover:border-slate-500/40"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold font-mono ${ACTION_COLORS[entry.action] || "text-slate-300"}`}>
                        {entry.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-400 font-mono">{entry.entityRef}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {entry.actorName} ({entry.actorRole}) · {entry.branchName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">ZMW {entry.amount.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleString()}</p>
                  </div>
                  {chainIntegrityRun && (
                    isVerified?.isValid
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      : <XCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-700/40 grid grid-cols-2 gap-2 text-xs animate-fade-in" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <p className="text-slate-500 mb-0.5">Actor IP Address</p>
                    <p className="text-slate-300 font-mono">{entry.ipAddress}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-0.5">Device Terminal</p>
                    <p className="text-slate-300 font-mono">{entry.deviceTerminal}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-0.5">Prev Hash (first 32 chars)</p>
                    <p className="text-slate-300 font-mono break-all">{entry.prevHash.substring(0, 32)}…</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-0.5">Current Hash (first 32 chars)</p>
                    <p className="text-blue-300 font-mono break-all">{entry.currentHash.substring(0, 32)}…</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500 mb-0.5">Notes</p>
                    <p className="text-slate-300">{entry.notes}</p>
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

// ─── Deployment & Commercial Licensing Tab ────────────────────────────────────
function DeploymentManager() {
  const [deployMode, setDeployMode] = useState<"saas" | "onpremise">("saas");

  const SAAS_METRICS = [
    { label: "Cluster Health", value: "99.98%", icon: Zap, color: "text-emerald-400" },
    { label: "Active Nodes", value: "6 / 6", icon: Cpu, color: "text-blue-400" },
    { label: "Storage Used", value: "2.4 TB", icon: HardDrive, color: "text-indigo-400" },
    { label: "API Requests (24h)", value: "1.8M", icon: Activity, color: "text-amber-400" },
  ];

  const LICENSE_SEATS = [
    { role: "Physician / Provider", licensed: 48, used: 43 },
    { role: "Nurse / Clinical Staff", licensed: 120, used: 118 },
    { role: "Billing Officer", licensed: 20, used: 17 },
    { role: "Finance Manager", licensed: 8, used: 6 },
    { role: "Pharmacist", licensed: 14, used: 12 },
    { role: "Laboratory Scientist", licensed: 10, used: 9 },
  ];

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl border border-slate-700/50 p-4">
        <Globe className="h-5 w-5 text-blue-400" />
        <div>
          <p className="font-semibold text-white text-sm">Commercial Deployment Mode</p>
          <p className="text-xs text-slate-400">Switch between Enterprise Cloud SaaS and Air-Gapped On-Premise Appliance</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            onClick={() => setDeployMode("saas")}
            className={`h-8 text-xs ${deployMode === "saas" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-300"}`}
          >
            ☁️ Cloud SaaS
          </Button>
          <Button
            size="sm"
            onClick={() => setDeployMode("onpremise")}
            className={`h-8 text-xs ${deployMode === "onpremise" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-300"}`}
          >
            🖥️ On-Premise
          </Button>
        </div>
      </div>

      {deployMode === "saas" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SAAS_METRICS.map((m) => (
              <div key={m.label} className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
                <m.icon className={`h-5 w-5 ${m.color} mb-2`} />
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-300 font-semibold text-sm">Cloud SaaS – Fully Operational</span>
            </div>
            <p className="text-xs text-emerald-200/60">
              HealthConnect Enterprise Edition running on multi-region cloud infrastructure with auto-scaling, geo-redundant backups (RPO 15 min), and 99.9% SLA uptime guarantee. HIPAA BAA and GDPR DPA signed.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-400" />
            <span className="text-indigo-300 font-semibold text-sm">Air-Gapped On-Premise Appliance Mode</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Appliance Model", "HealthConnect HPE DL380 Gen11"],
              ["OS", "Ubuntu Server 22.04 LTS (FIPS 140-2)"],
              ["Database", "PostgreSQL 16 (encrypted at rest AES-256)"],
              ["Network Mode", "Air-Gapped VLAN — No External Egress"],
              ["Last Sync", "2024-08-30 00:00 UTC (Offline Delta Sync)"],
              ["License Expiry", "2025-12-31"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-slate-500 text-xs">{label}</p>
                <p className="text-indigo-200 text-xs font-mono">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* License Seat Manager */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Enterprise License Seat Manager</h3>
        <div className="space-y-3">
          {LICENSE_SEATS.map((seat) => {
            const pct = Math.round((seat.used / seat.licensed) * 100);
            return (
              <div key={seat.role} className="bg-slate-700/20 rounded-lg p-3 border border-slate-600/20">
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm text-slate-300">{seat.role}</span>
                  <span className={`text-sm font-semibold ${pct >= 90 ? "text-amber-400" : "text-slate-300"}`}>
                    {seat.used} / {seat.licensed} seats
                  </span>
                </div>
                <Progress value={pct} className={`h-1.5 ${pct >= 90 ? "bg-amber-900" : "bg-slate-700"}`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MultiCenterAuditSuite() {
  const [selectedBranchId, setSelectedBranchId] = useState("br-hq");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg shadow-indigo-900/30">
          <Network className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Multi-Center Enterprise Governance</h2>
          <p className="text-slate-400 text-sm">Hospital group network, SHA-256 immutable financial audit trails, and commercial deployment licensing</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Enterprise SaaS</Badge>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">FIPS 140-2 Compliant</Badge>
        </div>
      </div>

      <Tabs defaultValue="network">
        <TabsList className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
          <TabsTrigger value="network" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 rounded-lg text-xs">
            <Network className="h-3 w-3 mr-1" /> Branch Network
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 rounded-lg text-xs">
            <Hash className="h-3 w-3 mr-1" /> Cryptographic Audit
          </TabsTrigger>
          <TabsTrigger value="deployment" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 rounded-lg text-xs">
            <Server className="h-3 w-3 mr-1" /> Deployment & Licensing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="network" className="mt-6">
          <BranchNetworkMap selectedBranchId={selectedBranchId} onSelect={setSelectedBranchId} />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <CryptoAuditTrail />
        </TabsContent>
        <TabsContent value="deployment" className="mt-6">
          <DeploymentManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
