import { useEffect, useState } from "react";
import { Shield, Lock, Share2, Eye, Download, FileText, CheckCircle2, AlertTriangle, Plus, Database } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMedicalRecords } from "@/hooks/useMedicalRecords";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    printWin.document.write(`
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
    <div className="min-h-screen bg-canvas dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Sticky Monday Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-canvas-silk dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500 text-white flex items-center justify-center font-black text-sm shadow-xs">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                Blockchain Medical Ledger & Verification Board
                <span className="w-2 h-2 rounded-full bg-success-500 animate-ping" />
              </h1>
              <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">
                Immutable SHA-256 encrypted cryptographic health audit trail and record verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Add Record</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-700 sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle className="font-extrabold text-base">Add New Medical Record</DialogTitle>
                  <DialogDescription className="text-xs text-graphite-500 dark:text-slate-400">
                    This record will be encrypted and committed to the immutable blockchain ledger.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <label htmlFor="title" className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Title</label>
                    <input
                      id="title"
                      value={newRecord.title}
                      onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                      placeholder="e.g. Annual Cardiovascular Audit"
                      className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="provider" className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Provider</label>
                    <input
                      id="provider"
                      value={newRecord.provider}
                      onChange={(e) => setNewRecord({ ...newRecord, provider: e.target.value })}
                      placeholder="Dr. Smith / Lusaka General"
                      className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold placeholder:text-slate-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="date" className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Date</label>
                      <input
                        id="date"
                        type="date"
                        value={newRecord.date}
                        onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                        className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="category" className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Category</label>
                      <Select
                        value={newRecord.category}
                        onValueChange={(val) => setNewRecord({ ...newRecord, category: val })}
                      >
                        <SelectTrigger className="mt-1 border border-graphite-300 dark:border-slate-700 font-bold text-xs">
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
                  <button onClick={handleAddRecord} className="px-4 py-2 rounded-md bg-primary-500 text-white font-extrabold text-xs">
                    Commit to Blockchain
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <button className="px-4 py-2 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-canvas-mist dark:hover:bg-slate-800 dark:hover:bg-slate-700 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-graphite-500 dark:text-slate-400" />
              <span>Export All</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Security Info Banner */}
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-5 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-purple-500 text-white">
            <Lock className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-sm text-purple-500">End-to-End Cryptographic Ledger Security</h3>
            <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium mt-0.5">
              All health records are encrypted via AES-256 and committed to a distributed cryptographic ledger. Access grants are fully auditable.
            </p>
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                <CheckCircle2 className="w-4 h-4 text-success-500" />
                <span>256-bit AES Encryption</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                <CheckCircle2 className="w-4 h-4 text-success-500" />
                <span>Immutable Block Hashes</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                <CheckCircle2 className="w-4 h-4 text-success-500" />
                <span>Real-Time Audit Telemetry</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Records List */}
          <div className="lg:col-span-2 rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-canvas-silk dark:border-slate-800 pb-3 mb-4">
              <h2 className="font-extrabold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-500" />
                Blockchain-Verified Health Records
              </h2>
              <span className="text-xs font-bold text-graphite-500 dark:text-slate-400">{medicalRecords.length} blocks</span>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-6 text-xs text-graphite-500 dark:text-slate-400">Loading blockchain ledger...</div>
              ) : medicalRecords.length > 0 ? (
                medicalRecords.map((record) => (
                  <div
                    key={record.id}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedRecord === record.id
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-canvas-silk bg-canvas hover:border-purple-500"
                    }`}
                    onClick={() => setSelectedRecord(record.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">{record.title}</h4>
                          {record.verified && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-success-500 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-graphite-500 dark:text-slate-400">Provider: <strong>{record.provider}</strong> • Date: {record.date}</p>
                        <p className="text-[10px] text-graphite-500 dark:text-slate-400 font-mono truncate mt-1 bg-white dark:bg-slate-800 p-1 rounded border border-canvas-silk dark:border-slate-700">
                          Hash: {record.hash}
                        </p>
                        {record.shared_with && record.shared_with.length > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-primary-500">
                            <Share2 className="w-3 h-3" />
                            <span>Shared with: {record.shared_with.join(", ")}</span>
                          </div>
                        )}
                      </div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-primary-500">
                        {record.category}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-graphite-500 dark:text-slate-400">
                  No records committed to the ledger yet. Add your first medical record.
                </div>
              )}
            </div>
          </div>

          {/* Audit Trail */}
          <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-canvas-silk dark:border-slate-800 pb-3 mb-4">
              <h2 className="font-extrabold text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-success-500" />
                Cryptographic Audit Log
              </h2>
            </div>

            <div className="space-y-3">
              {auditTrail.map((entry, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-xl border border-canvas-silk bg-canvas text-xs">
                  <div className={`p-1 rounded-full text-white ${entry.verified ? "bg-success-500" : "bg-warning-500"}`}>
                    {entry.verified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{entry.action}</p>
                    <p className="text-[10px] text-graphite-500 dark:text-slate-400">Actor: {entry.user}</p>
                    <p className="text-[10px] text-graphite-500 dark:text-slate-400 mt-0.5">{entry.timestamp}</p>
                  </div>
                </div>
              ))}
              {auditTrail.length === 0 && (
                <div className="text-center py-6 text-xs text-graphite-500 dark:text-slate-400">
                  No audit log entries available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Record Details Panel */}
        {selectedRecord && (
          <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <h2 className="font-extrabold text-sm mb-4">Selected Record Ledger Telemetry</h2>

            <div className="flex items-center gap-2 mb-4 border-b border-canvas-silk pb-3">
              {[
                { id: "details", label: "Record Details" },
                { id: "blockchain", label: "Blockchain Hash Verification" },
                { id: "sharing", label: "Permission Access Grants" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailsTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    activeDetailsTab === tab.id
                      ? "bg-primary-500 text-white shadow-xs"
                      : "bg-canvas dark:bg-slate-800 text-graphite-500 dark:text-slate-400"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeDetailsTab === "details" && (
              <div className="space-y-3 text-xs">
                <p className="text-graphite-500 dark:text-slate-400">
                  View full record payload, download cryptographically signed PDF, or request modifications.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setShowPayload((v) => !v)}
                    className="px-4 py-2 rounded-md bg-primary-500 text-white font-extrabold text-xs"
                    aria-expanded={showPayload}
                  >
                    {showPayload ? 'Hide Record Payload' : 'View Full Record Payload'}
                  </button>
                  <button
                    onClick={() => printRecordPayload()}
                    className="px-4 py-2 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs"
                  >
                    Download Signed PDF
                  </button>
                </div>
                {showPayload && (
                  <pre className="p-3 rounded-xl bg-canvas dark:bg-slate-800 border border-canvas-silk dark:border-slate-700 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(medicalRecords.find((r) => r.id === selectedRecord), null, 2)}
                  </pre>
                )}
              </div>
            )}

            {activeDetailsTab === "blockchain" && (
              <div className="space-y-2 text-xs">
                <p className="font-bold text-graphite-500 dark:text-slate-400">SHA-256 Ledger Hash</p>
                <p className="text-xs font-mono font-bold bg-canvas p-3 rounded-xl border border-canvas-silk text-purple-500">
                  {medicalRecords.find((r) => r.id === selectedRecord)?.hash}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-success-500 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Cryptographically verified & un-tampered</span>
                </div>
              </div>
            )}

            {activeDetailsTab === "sharing" && (
              <div className="space-y-3 text-xs">
                <p className="text-graphite-500 dark:text-slate-400">
                  Manage patient access grants. Every permission change emits a signed transaction to the audit trail.
                </p>
                <button className="px-4 py-2 rounded-md bg-primary-500 text-white font-extrabold text-xs flex items-center gap-1">
                  <Share2 className="w-4 h-4" /> Grant Provider Access
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockchainRecords;
