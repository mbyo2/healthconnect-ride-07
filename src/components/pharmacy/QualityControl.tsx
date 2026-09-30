import * as React from "react";
import { useMemo, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { useCurrency } from "@/hooks/use-currency";
import {
  listBatches,
  setQaStatus,
  type MedicineBatch,
  type QaStatus,
} from "./pharmacyStockService";
import { format } from "date-fns";

type QaDecision = Exclude<QaStatus, "pending">;

type QaAction = QaDecision | "release";

interface QaDialogState {
  batch: MedicineBatch;
  action: QaAction;
}

const DECISION_META: Record<
  QaDecision,
  { label: string; badgeLabel: string; pastTense: string; badgeClass: string }
> = {
  approved: {
    label: "Approve",
    badgeLabel: "Approved",
    pastTense: "approved",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
  },
  quarantined: {
    label: "Quarantine",
    badgeLabel: "Quarantined",
    pastTense: "quarantined",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
  },
  rejected: {
    label: "Reject",
    badgeLabel: "Rejected",
    pastTense: "rejected",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
  },
};

const RELEASE_META = {
  label: "Release",
  pastTense: "released",
};

function getActionMeta(action: QaAction) {
  return action === "release" ? RELEASE_META : DECISION_META[action];
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy");
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy, HH:mm");
}

/**
 * Quality control review for received medicine batches.
 * Section A: batches awaiting a QA decision. Section B: recent QA decisions.
 */
export function QualityControl() {
  const { institutionId } = useInstitutionContext();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  const [dialogState, setDialogState] = useState<QaDialogState | null>(null);
  const [notes, setNotes] = useState("");

  const pendingQuery = useQuery({
    queryKey: ["qa-pending", institutionId],
    queryFn: () => listBatches(institutionId as string, { qaStatus: "pending" }),
    enabled: !!institutionId,
  });

  const historyQuery = useQuery({
    queryKey: ["qa-history", institutionId],
    queryFn: () => listBatches(institutionId as string, {}),
    enabled: !!institutionId,
  });

  const history = useMemo(() => {
    const all = historyQuery.data ?? [];
    return all
      .filter((b) => b.qa_status !== "pending")
      .sort((a, b) =>
        (b.qa_checked_at ?? "").localeCompare(a.qa_checked_at ?? "")
      )
      .slice(0, 30);
  }, [historyQuery.data]);

  const qaMutation = useMutation({
    mutationFn: (input: { batchId: string; status: QaStatus; notes?: string; isRelease?: boolean }) =>
      setQaStatus(input.batchId, input.status, input.notes),
    onSuccess: (_data, vars) => {
      const pastTense = vars.isRelease ? "released" : DECISION_META[vars.status as QaDecision].pastTense;
      toast.success(
        vars.isRelease
          ? `Batch released back to pending QA.`
          : `Batch ${pastTense}.`
      );
      queryClient.invalidateQueries({
        queryKey: ["qa-pending", institutionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["qa-history", institutionId],
      });
      // QA decisions change available stock — refresh inventory lists,
      // batch views, and dashboard summary cards.
      queryClient.invalidateQueries({
        queryKey: ["batches", institutionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["pharmacy-stock", institutionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["pharmacy-summary", institutionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory", institutionId],
      });
      setDialogState(null);
      setNotes("");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update QA status."
      );
    },
  });

  const openDialog = (batch: MedicineBatch, action: QaAction) => {
    setNotes("");
    setDialogState({ batch, action });
  };

  const notesRequired =
    dialogState?.action === "quarantined" || dialogState?.action === "rejected";

  const confirmDisabled =
    !dialogState ||
    qaMutation.isPending ||
    (notesRequired && notes.trim().length === 0);

  const handleConfirm = () => {
    if (!dialogState || confirmDisabled) return;
    const isRelease = dialogState.action === "release";
    qaMutation.mutate({
      batchId: dialogState.batch.id,
      status: isRelease ? "pending" : (dialogState.action as QaStatus),
      notes: notes.trim() ? notes.trim() : undefined,
      isRelease,
    });
  };

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No institution selected.</p>;
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------ Section A --- */}
      <Card>
        <CardHeader>
          <CardTitle>Pending QA queue</CardTitle>
          <CardDescription>
            Received batches waiting for a quality-control decision before they
            are released into stock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading pending batches…
            </p>
          ) : pendingQuery.isError ? (
            <p className="text-sm text-red-600">
              Failed to load pending batches.
            </p>
          ) : (pendingQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No batches are waiting for QA. All received stock has been
              reviewed.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(pendingQuery.data ?? []).map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {batch.product_name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {batch.batch_number}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(batch.received_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(batch.expiry_date)}
                      </TableCell>
                      <TableCell className="text-right">
                        {batch.quantity_remaining.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatPrice(batch.unit_cost)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog(batch, "approved")}
                            className="text-green-700 border-green-200 hover:bg-green-50"
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog(batch, "quarantined")}
                            className="text-orange-700 border-orange-200 hover:bg-orange-50"
                          >
                            <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                            Quarantine
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog(batch, "rejected")}
                            className="text-red-700 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------ Section B --- */}
      <Card>
        <CardHeader>
          <CardTitle>Recent QA decisions</CardTitle>
          <CardDescription>
            The last 30 batches that were approved, quarantined, or rejected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading QA history…
            </p>
          ) : historyQuery.isError ? (
            <p className="text-sm text-red-600">
              Failed to load QA history.
            </p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No QA decisions have been recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Checked</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((batch) => {
                    const decision = batch.qa_status as QaDecision;
                    const meta = DECISION_META[decision];
                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {batch.product_name}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {batch.batch_number}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={meta.badgeClass}>
                            {meta.badgeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(batch.qa_checked_at)}
                        </TableCell>
                        <TableCell
                          className="max-w-[240px] truncate text-muted-foreground"
                          title={batch.qa_notes ?? ""}
                        >
                          {batch.qa_notes ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {decision === "quarantined" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDialog(batch, "release")}
                              className="text-blue-700 border-blue-200 hover:bg-blue-50"
                            >
                              Release
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --------------------------------------------- QA decision dialog --- */}
      <Dialog
        open={!!dialogState}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState(null);
            setNotes("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogState
                ? `${getActionMeta(dialogState.action).label} batch ${dialogState.batch.batch_number}`
                : "QA decision"}
            </DialogTitle>
            <DialogDescription>
              {dialogState
                ? dialogState.action === "release"
                  ? `${dialogState.batch.product_name} — ${dialogState.batch.quantity_remaining.toLocaleString()} units. Releasing returns the batch to the Pending QA queue for re-evaluation.`
                  : `${dialogState.batch.product_name} — ${dialogState.batch.quantity_remaining.toLocaleString()} units received on ${formatDate(dialogState.batch.received_at)}.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="qa-notes">
              QA notes{" "}
              {notesRequired ? (
                <span className="text-red-600">(required)</span>
              ) : (
                <span className="text-muted-foreground">(optional)</span>
              )}
            </Label>
            <Textarea
              id="qa-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                notesRequired
                  ? "Explain why this batch is being quarantined or rejected…"
                  : "Optional inspection notes…"
              }
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogState(null);
                setNotes("");
              }}
              disabled={qaMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={confirmDisabled}>
              {qaMutation.isPending
                ? "Saving…"
                : dialogState
                  ? `Confirm ${getActionMeta(dialogState.action).label.toLowerCase()}`
                  : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
