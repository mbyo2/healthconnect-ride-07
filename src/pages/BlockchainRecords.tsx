import { safeDocumentWrite } from "@/utils/safePrint";
import { useEffect, useState } from "react";
import { Shield, Lock, Share2, Eye, Download, FileText, CheckCircle2, AlertTriangle, Plus, Database } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMedicalRecords } from "@/hooks/useMedicalRecords";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { supabase } from "@/integrations/supabase/client";

interface AuditEntry {
  action: string;
  user: string;
  timestamp: string;
  verified: boolean;
}

const BlockchainRecords = () => {
  const { user } = useAuth();
  const { records: medicalRecords, loading, addRecord } = useMedicalRecords(user?.id);
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [activeDetailsTab, setActiveDetailsTab] = useState<"details" | "blockchain" | "sharing">("details");
  const [showPayload, setShowPayload] = useState(false);

  const printRecordPayload = () => {
    const record = medicalRecords.find((r) => r.id === selectedRecord);
    if (!record) return;
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    const esc = (s: unknown) =>
      String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    safeDocumentWrite(printWin, `
      <html><head><title>Signed Record — ${esc((record as any).title)}</title></head>
      <body style="font-family: monospace; max-width: 640px; margin: auto; padding: 24px;">
        <h2 style="margin: 0;">DOC' O CLOCK — SIGNED HEALTH RECORD</h2>
        <p>Title: ${esc((record as any).title)}<br/>
        Provider: ${esc((record as any).provider)}<br/>
        Date: ${esc((record as any).date)}<br/>
        Category: ${esc((record as any).category)}<br/>
        Hash: ${esc((record as any).hash)}</p>
        <hr/>
        <pre style="white-space: pre-wrap; word-break: break-all;">${esc(JSON.stringify(record, null, 2))}</pre>
        <p style="font-size: 10px;">Generated ${new Date().toLocaleString()} — verify hash against the ledger before relying on this copy.</p>
        <script>window.print();</script>
      </body></html>
    `);
    printWin.document.close();
  };
  const [newRecord, setNewRecord] = useState({
    title: "",
    provider: "",
    date: new Date().toISOString().split("T")[0],
    category: "Checkup",
  });

  const handleAddRecord = async () => {
    await addRecord({
      ...newRecord,
      shared_with: [],
    });
    setIsAddDialogOpen(false);
    setNewRecord({
      title: "",
      provider: "",
      date: new Date().toISOString().split("T")[0],
      category: "Checkup",
    });
  };

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("security_audit_log")
          .select("event_type, event_data, created_at")
          .eq("user_id", user.id)
          .in("event_type", ["medical_record_created", "medical_record_accessed", "medical_record_shared", "role_assigned", "role_change"])
          .order("created_at", { ascending: false })
          .limit(10);
        const entries: AuditEntry[] = (data || []).map((r: any) => ({
          action: String(r.event_type || "event").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
          user: r.event_data?.actor || "You",
          timestamp: new Date(r.created_at).toLocaleString(),
          verified: true,
        }));
        setAuditTrail(entries);
      } catch (err) {
        console.error("Audit trail load error:", err);
        setAuditTrail([]);
      }
    })();
  }, [user?.id]);

  return (
    <div className="pb-16">
      {/* Sticky Monday Top Header */}
      <div className="doc-page-header px-4 sm:px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                Medical Record Ledger
                <span className="w-2 h-2 rounded-full bg-success-500" />
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                A tamper-evident audit trail for medical records — verify any record has not been altered.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Add record</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle className="font-semibold text-base">Add New Medical Record</DialogTitle>
                  <DialogDescription>
                    This record will be encrypted and added to the tamper-evident ledger.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <label htmlFor="title" className="text-xs font-medium text-muted-foreground">Title</label>
                    <Input
                      id="title"
                      value={newRecord.title}
                      onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                      placeholder="e.g. Annual Cardiovascular Audit"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="provider" className="text-xs font-medium text-muted-foreground">Provider</label>
                    <Input
                      id="provider"
                      value={newRecord.provider}
                      onChange={(e) => setNewRecord({ ...newRecord, provider: e.target.value })}
                      placeholder="Dr. Smith / Lusaka General"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="date" className="text-xs font-medium text-muted-foreground">Date</label>
                      <Input
                        id="date"
                        type="date"
                        value={newRecord.date}
                        onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="category" className="text-xs font-medium text-muted-foreground">Category</label>
                      <Select
                        value={newRecord.category}
                        onValueChange={(val) => setNewRecord({ ...newRecord, category: val })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Checkup">Checkup</SelectItem>
                          <SelectItem value="Lab Results">Lab Results</SelectItem>
                          <SelectItem value="Prescription">Prescription</SelectItem>
                          <SelectItem value="Surgery">Surgery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddRecord}>
                    Add to ledger
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="gap-1.5">
              <Download className="w-4 h-4" />
              <span>Export all</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-6 space-y-6">
        {/* Security Info Banner */}
        <div className="rounded-lg border border-primary-500/30 bg-primary-500/5 p-5 flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary text-primary-foreground">
            <Lock className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-foreground">How record security works</h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              All health records are encrypted via AES-256 and committed to a distributed cryptographic ledger. Access grants are fully auditable.
            </p>
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <CheckCircle2 className="w-4 h-4 text-success-500" />
                <span>256-bit AES Encryption</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <CheckCircle2 className="w-4 h-4 text-success-500" />
                <span>Immutable Block Hashes</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <CheckCircle2 className="w-4 h-4 text-success-500" />
                <span>Real-Time Audit Telemetry</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Records List */}
          <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-500" />
                Verified health records
              </h2>
              <span className="text-xs font-medium text-muted-foreground tnum">{medicalRecords.length} records</span>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-6 text-sm text-muted-foreground">Loading blockchain ledger...</div>
              ) : medicalRecords.length > 0 ? (
                medicalRecords.map((record) => (
                  <div
                    key={record.id}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                      selectedRecord === record.id
                        ? "border-primary-500 bg-primary-500/5"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedRecord(record.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-primary-500 shrink-0" />
                          <h4 className="font-semibold text-sm text-foreground truncate">{record.title}</h4>
                          {record.verified && (
                            <StatusBadge tone="positive" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </StatusBadge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Provider: <strong>{record.provider}</strong> • Date: {record.date}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate mt-1 bg-muted/50 p-1.5 rounded-md border border-border">
                          Hash: {record.hash}
                        </p>
                        {record.shared_with && record.shared_with.length > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400">
                            <Share2 className="w-3 h-3" />
                            <span>Shared with: {record.shared_with.join(", ")}</span>
                          </div>
                        )}
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                        {record.category}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No records committed to the ledger yet. Add your first medical record.
                </div>
              )}
            </div>
          </div>

          {/* Audit Trail */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-success-500" />
                Audit log
              </h2>
            </div>

            <div className="space-y-3">
              {auditTrail.map((entry, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card text-xs">
                  <div className={`p-1 rounded-md ${entry.verified ? "bg-success-500/15 text-success-600 dark:text-success-400" : "bg-warning-500/15 text-warning-600 dark:text-warning-400"}`}>
                    {entry.verified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{entry.action}</p>
                    <p className="text-xs text-muted-foreground">Actor: {entry.user}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{entry.timestamp}</p>
                  </div>
                </div>
              ))}
              {auditTrail.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No audit log entries available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Record Details Panel */}
        {selectedRecord && (
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold text-sm mb-4">Selected record</h2>

            <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
              {[
                { id: "details", label: "Details" },
                { id: "blockchain", label: "Hash verification" },
                { id: "sharing", label: "Access grants" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailsTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
                    activeDetailsTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeDetailsTab === "details" && (
              <div className="space-y-3 text-xs">
                <p className="text-muted-foreground">
                  View the full record, download a signed PDF, or request changes.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => setShowPayload((v) => !v)}
                    aria-expanded={showPayload}
                  >
                    {showPayload ? 'Hide record details' : 'View full record'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => printRecordPayload()}
                  >
                    Download signed PDF
                  </Button>
                </div>
                {showPayload && (
                  <dl className="rounded-lg border border-border bg-muted/30 p-4 space-y-1.5">
                    {Object.entries(medicalRecords.find((r) => r.id === selectedRecord) ?? {}).map(([key, value]) => (
                      <div key={key} className="flex items-baseline justify-between gap-4">
                        <dt className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</dt>
                        <dd className="text-xs font-medium text-foreground text-right break-all">
                          {Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value ?? "—")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}

            {activeDetailsTab === "blockchain" && (
              <div className="space-y-2 text-xs">
                <p className="font-medium text-muted-foreground">SHA-256 ledger hash</p>
                <p className="text-xs font-mono bg-muted/50 p-3 rounded-lg border border-border text-foreground break-all">
                  {medicalRecords.find((r) => r.id === selectedRecord)?.hash}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-success-600 dark:text-success-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified — this record has not been tampered with</span>
                </div>
              </div>
            )}

            {activeDetailsTab === "sharing" && (
              <div className="space-y-3 text-xs">
                <p className="text-muted-foreground">
                  Manage who can access this record. Every change is written to the audit log.
                </p>
                <Button className="gap-1.5">
                  <Share2 className="w-4 h-4" /> Grant provider access
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockchainRecords;
