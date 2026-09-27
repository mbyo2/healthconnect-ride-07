import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, Plus, XCircle } from "lucide-react";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { useCurrency } from "@/hooks/use-currency";
import {
  addBatchesToSession,
  approveSession,
  cancelSession,
  getAuditSession,
  listAuditSessions,
  listBatches,
  recordCount,
  startAuditSession,
  submitSession,
  type AuditScope,
  type AuditStatus,
  type StockAuditLine,
} from "./pharmacyStockService";
import { format } from "date-fns";

const SCOPE_META: Record<AuditScope, { label: string }> = {
  full: { label: "Full count" },
  partial: { label: "Partial" },
  cycle: { label: "Cycle count" },
};

const STATUS_BADGE_CLASS: Record<AuditStatus, string> = {
  open: "bg-blue-100 text-blue-800 border-blue-200",
  submitted: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy");
}

function parseCounted(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Physical stock-count sessions: start, count batches line by line,
 * submit for approval, and post inventory adjustments.
 */
export function StockAudit() {
  const { institutionId } = useInstitutionContext();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [startOpen, setStartOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<AuditScope>("full");
  const [startNotes, setStartNotes] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, string>>({});

  /* ------------------------------------------------------------ queries --- */
  const sessionsQuery = useQuery({
    queryKey: ["audit-sessions", institutionId],
    queryFn: () => listAuditSessions(institutionId as string),
    enabled: !!institutionId,
  });

  const detailQuery = useQuery({
    queryKey: ["audit-session", selectedSessionId],
    queryFn: () => getAuditSession(selectedSessionId as string),
    enabled: !!selectedSessionId,
  });

  const addBatchesQuery = useQuery({
    queryKey: ["audit-add-batches", institutionId],
    queryFn: () => listBatches(institutionId as string, {}),
    enabled: !!institutionId && addOpen,
  });

  const detail = detailQuery.data;
  const lines = detail?.lines ?? [];
  const session = detail?.session ?? null;
  const isOpen = session?.status === "open";
  const isSubmitted = session?.status === "submitted";

  /* ----------------------------- seed counted inputs from saved values --- */
  useEffect(() => {
    if (!detail) return;
    const seed: Record<string, string> = {};
    for (const line of detail.lines) {
      if (line.counted_quantity != null) seed[line.id] = String(line.counted_quantity);
    }
    setCounts(seed);
  }, [detail?.session.id, detail?.lines.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* --------------------------- batches available to add (not in session) --- */
  const addableBatches = useMemo(() => {
    const inSession = new Set(lines.map((l) => l.batch_id));
    return (addBatchesQuery.data ?? []).filter((b) => !inSession.has(b.id));
  }, [addBatchesQuery.data, lines]);

  useEffect(() => {
    if (addOpen && addBatchesQuery.data) {
      const seed: Record<string, boolean> = {};
      for (const b of addableBatches) seed[b.id] = true;
      setChecked(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOpen, addBatchesQuery.data]);

  /* ---------------------------------------------------------------- dirty --- */
  const dirtyLines = useMemo(() => {
    return lines.filter((line) => {
      const current = counts[line.id];
      const original =
        line.counted_quantity == null ? undefined : String(line.counted_quantity);
      return current !== undefined && current !== original;
    });
  }, [lines, counts]);

  const liveVarianceOf = (line: StockAuditLine): number | null => {
    const parsed = parseCounted(counts[line.id]);
    if (parsed !== null) return parsed - line.book_quantity;
    return line.variance;
  };

  const liveVarianceValueOf = (line: StockAuditLine): number | null => {
    const variance = liveVarianceOf(line);
    if (variance === null) return line.variance_value;
    const unitCost = line.medicine_batches?.unit_cost ?? 0;
    return variance * unitCost;
  };

  /* -------------------------------------------------------------- mutations --- */
  const invalidateSessionData = () => {
    queryClient.invalidateQueries({ queryKey: ["audit-sessions", institutionId] });
    if (selectedSessionId) {
      queryClient.invalidateQueries({
        queryKey: ["audit-session", selectedSessionId],
      });
    }
  };

  const startMutation = useMutation({
    mutationFn: () =>
      startAuditSession(institutionId as string, title.trim(), scope, startNotes.trim() || undefined),
    onSuccess: (newSession) => {
      toast.success("Audit session started.");
      setStartOpen(false);
      setTitle("");
      setScope("full");
      setStartNotes("");
      queryClient.invalidateQueries({
        queryKey: ["audit-sessions", institutionId],
      });
      setSelectedSessionId(newSession.id);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to start session."),
  });

  const [savingCounts, setSavingCounts] = useState(false);
  const handleSaveCounts = async () => {
    if (dirtyLines.length === 0 || savingCounts) return;
    const invalid = dirtyLines.filter(
      (line) => parseCounted(counts[line.id]) === null
    );
    if (invalid.length > 0) {
      toast.error("Enter a valid quantity (0 or more) for every edited row.");
      return;
    }
    setSavingCounts(true);
    try {
      for (const line of dirtyLines) {
        await recordCount(line.id, parseCounted(counts[line.id]) as number);
      }
      toast.success(`Saved ${dirtyLines.length} count${dirtyLines.length === 1 ? "" : "s"}.`);
      invalidateSessionData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save counts.");
    } finally {
      setSavingCounts(false);
    }
  };

  const addMutation = useMutation({
    mutationFn: () =>
      addBatchesToSession(
        selectedSessionId as string,
        addableBatches
          .filter((b) => checked[b.id])
          .map((b) => ({ id: b.id, quantity_remaining: b.quantity_remaining }))
      ),
    onSuccess: (_data, _vars) => {
      const n = addableBatches.filter((b) => checked[b.id]).length;
      toast.success(`Added ${n} batch${n === 1 ? "" : "es"} to the session.`);
      setAddOpen(false);
      invalidateSessionData();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to add batches."),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitSession(selectedSessionId as string),
    onSuccess: () => {
      toast.success("Session submitted for approval.");
      invalidateSessionData();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to submit session."),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelSession(selectedSessionId as string),
    onSuccess: () => {
      toast.success("Audit session cancelled.");
      invalidateSessionData();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to cancel session."),
  });

  const approveMutation = useMutation({
    mutationFn: () => approveSession(selectedSessionId as string),
    onSuccess: (result) => {
      toast.success(`Posted ${result.posted_adjustments} adjustment(s).`);
      invalidateSessionData();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to approve session."),
  });

  /* ------------------------------------------------------------- confirm ui --- */
  const [confirmAction, setConfirmAction] = useState<
    "submit" | "cancel" | "approve" | null
  >(null);

  const handleConfirmAction = () => {
    if (confirmAction === "submit") submitMutation.mutate();
    if (confirmAction === "cancel") cancelMutation.mutate();
    if (confirmAction === "approve") approveMutation.mutate();
    setConfirmAction(null);
  };

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No institution selected.</p>;
  }

  const selectedCount = addableBatches.filter((b) => checked[b.id]).length;
  const allChecked =
    addableBatches.length > 0 && selectedCount === addableBatches.length;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------ session list --- */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Stock audit sessions</CardTitle>
            <CardDescription>
              Start a session, count physical stock against book quantities, and
              post the adjustments.
            </CardDescription>
          </div>
          <Button onClick={() => setStartOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Start session
          </Button>
        </CardHeader>
        <CardContent>
          {sessionsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading sessions…</p>
          ) : sessionsQuery.isError ? (
            <p className="text-sm text-red-600">Failed to load audit sessions.</p>
          ) : (sessionsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No audit sessions yet. Start the first one to begin counting.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(sessionsQuery.data ?? []).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                    selectedSessionId === s.id
                      ? "border-primary ring-1 ring-primary"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate font-medium">{s.title}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="outline">{SCOPE_META[s.scope].label}</Badge>
                    <Badge variant="outline" className={STATUS_BADGE_CLASS[s.status]}>
                      {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Started {formatDate(s.started_at)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* --------------------------------------------------- session detail --- */}
      {selectedSessionId && (
        <Card>
          <CardHeader>
            {detailQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading session details…
              </p>
            ) : detailQuery.isError || !session ? (
              <p className="text-sm text-red-600">Failed to load session.</p>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{session.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {SCOPE_META[session.scope].label} · started{" "}
                    {formatDate(session.started_at)} · {lines.length} line
                    {lines.length === 1 ? "" : "s"}
                    {session.notes ? ` · ${session.notes}` : ""}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={STATUS_BADGE_CLASS[session.status]}
                  >
                    {session.status.charAt(0).toUpperCase() +
                      session.status.slice(1)}
                  </Badge>
                  {isOpen && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddOpen(true)}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add batches
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmAction("cancel")}
                        className="text-red-700 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => setConfirmAction("submit")}>
                        Submit for approval
                      </Button>
                    </>
                  )}
                  {isSubmitted && (
                    <Button
                      size="sm"
                      onClick={() => setConfirmAction("approve")}
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Approve &amp; post adjustments
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
          {detail && (
            <CardContent>
              {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No batches in this session yet.{" "}
                  {isOpen
                    ? "Use “Add batches” to include stock for counting."
                    : "This session has no counted lines."}
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Batch #</TableHead>
                          <TableHead>Expiry</TableHead>
                          <TableHead className="text-right">Book qty</TableHead>
                          <TableHead className="text-right">Counted qty</TableHead>
                          <TableHead className="text-right">Variance</TableHead>
                          <TableHead className="text-right">Variance value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line) => {
                          const variance = liveVarianceOf(line);
                          const varianceValue = liveVarianceValueOf(line);
                          const rowClass =
                            variance !== null && variance < 0
                              ? "bg-red-50"
                              : variance !== null && variance > 0
                                ? "bg-amber-50"
                                : "";
                          return (
                            <TableRow key={line.id} className={rowClass}>
                              <TableCell className="font-medium whitespace-nowrap">
                                {line.medicine_batches?.product_name ?? "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {line.medicine_batches?.batch_number ?? "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {formatDate(
                                  line.medicine_batches?.expiry_date ?? null
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {line.book_quantity.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {isOpen ? (
                                  <Input
                                    type="number"
                                    min={0}
                                    className="ml-auto w-24 text-right"
                                    value={counts[line.id] ?? ""}
                                    onChange={(e) =>
                                      setCounts((prev) => ({
                                        ...prev,
                                        [line.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="0"
                                    aria-label={`Counted quantity for ${line.medicine_batches?.product_name ?? "batch"}`}
                                  />
                                ) : (
                                  <span>
                                    {line.counted_quantity == null
                                      ? "—"
                                      : line.counted_quantity.toLocaleString()}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {variance === null
                                  ? "—"
                                  : variance > 0
                                    ? `+${variance.toLocaleString()}`
                                    : variance.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {varianceValue === null
                                  ? "—"
                                  : formatPrice(varianceValue)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {isOpen && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={handleSaveCounts}
                        disabled={dirtyLines.length === 0 || savingCounts}
                      >
                        {savingCounts
                          ? "Saving…"
                          : `Save counts${dirtyLines.length > 0 ? ` (${dirtyLines.length})` : ""}`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* --------------------------------------------------- start session dialog --- */}
      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start audit session</DialogTitle>
            <DialogDescription>
              Give the session a name and choose what to count.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="audit-title">
                Title <span className="text-red-600">(required)</span>
              </Label>
              <Input
                id="audit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. January full stock count"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audit-scope">Scope</Label>
              <Select
                value={scope}
                onValueChange={(v) => setScope(v as AuditScope)}
              >
                <SelectTrigger id="audit-scope">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full count</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="cycle">Cycle count</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="audit-notes">
                Notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="audit-notes"
                value={startNotes}
                onChange={(e) => setStartNotes(e.target.value)}
                placeholder="Any context for the counting team…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStartOpen(false)}
              disabled={startMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => startMutation.mutate()}
              disabled={!title.trim() || startMutation.isPending}
            >
              {startMutation.isPending ? "Starting…" : "Start session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --------------------------------------------------- add batches dialog --- */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setChecked({});
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add batches to session</DialogTitle>
            <DialogDescription>
              Select the batches to include in this count. Batches already in
              the session are hidden.
            </DialogDescription>
          </DialogHeader>
          {addBatchesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading batches…</p>
          ) : addBatchesQuery.isError ? (
            <p className="text-sm text-red-600">Failed to load batches.</p>
          ) : addableBatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every batch is already part of this session.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b pb-2">
                <Checkbox
                  id="select-all-batches"
                  checked={allChecked}
                  onCheckedChange={(v) => {
                    const next: Record<string, boolean> = {};
                    for (const b of addableBatches) next[b.id] = v === true;
                    setChecked(next);
                  }}
                />
                <Label htmlFor="select-all-batches" className="text-sm font-medium">
                  Select all ({addableBatches.length})
                </Label>
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {addableBatches.map((b) => (
                  <label
                    key={b.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={checked[b.id] === true}
                      onCheckedChange={(v) =>
                        setChecked((prev) => ({ ...prev, [b.id]: v === true }))
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {b.product_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Batch {b.batch_number} · expiry {formatDate(b.expiry_date)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-muted-foreground">
                      {b.quantity_remaining.toLocaleString()} units
                    </p>
                  </label>
                ))}
              </div>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={selectedCount === 0 || addMutation.isPending}
            >
              {addMutation.isPending
                ? "Adding…"
                : `Add ${selectedCount} batch${selectedCount === 1 ? "" : "es"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --------------------------------------------------- workflow confirmations --- */}
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "approve"
                ? "Approve and post adjustments?"
                : confirmAction === "cancel"
                  ? "Cancel this audit session?"
                  : "Submit for approval?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "approve" &&
                "Approving posts inventory adjustments based on the counted quantities. Book stock will be updated to match the physical count, and this cannot be undone from here."}
              {confirmAction === "cancel" &&
                "Cancelling closes this session without posting any adjustments. Any recorded counts will be discarded."}
              {confirmAction === "submit" &&
                "Submitting locks the session so no further counts can be entered. It will then wait for a manager to approve and post the adjustments."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {confirmAction === "approve"
                ? "Approve & post"
                : confirmAction === "cancel"
                  ? "Yes, cancel"
                  : "Yes, submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
