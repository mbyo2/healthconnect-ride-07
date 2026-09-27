import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle2, Plus, XCircle } from "lucide-react";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { useCurrency } from "@/hooks/use-currency";
import {
  approveWriteOff,
  listBatches,
  listWriteOffs,
  postWriteOff,
  rejectWriteOff,
  requestWriteOff,
  type MedicineBatch,
  type StockWriteOff,
  type WriteOffReason,
  type WriteOffStatus,
} from "./pharmacyStockService";

const REASONS: { value: WriteOffReason; label: string }[] = [
  { value: "expired", label: "Expired" },
  { value: "damaged", label: "Damaged" },
  { value: "broken", label: "Broken" },
  { value: "temperature", label: "Temperature excursion" },
  { value: "stolen", label: "Stolen / missing" },
  { value: "other", label: "Other" },
];

function reasonLabel(reason: WriteOffReason): string {
  return REASONS.find((r) => r.value === reason)?.label ?? reason;
}

function StatusBadge({ status }: { status: WriteOffStatus }) {
  const styles: Record<WriteOffStatus, string> = {
    posted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    pending_approval: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  };
  const labels: Record<WriteOffStatus, string> = {
    posted: "Posted",
    rejected: "Rejected",
    approved: "Approved",
    pending_approval: "Pending approval",
  };
  return <Badge className={styles[status]}>{labels[status]}</Badge>;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return format(new Date(value), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

const WRITEOFFS_KEY = "stock-writeoffs";

export function WriteOffs() {
  const { institutionId } = useInstitutionContext();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<WriteOffReason>("expired");
  const [notes, setNotes] = useState("");

  const [rejectTarget, setRejectTarget] = useState<StockWriteOff | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approveTarget, setApproveTarget] = useState<StockWriteOff | null>(null);
  const [postTarget, setPostTarget] = useState<StockWriteOff | null>(null);

  const batchesQuery = useQuery({
    queryKey: [WRITEOFFS_KEY, institutionId, "batches"],
    queryFn: () => listBatches(institutionId as string, {}),
    enabled: !!institutionId,
  });

  const eligibleBatches = useMemo(
    () =>
      (batchesQuery.data ?? []).filter(
        (b) => b.is_active && b.quantity_remaining > 0
      ),
    [batchesQuery.data]
  );

  const selectedBatch: MedicineBatch | undefined = useMemo(
    () => eligibleBatches.find((b) => b.id === selectedBatchId),
    [eligibleBatches, selectedBatchId]
  );

  const pendingQuery = useQuery({
    queryKey: [WRITEOFFS_KEY, institutionId, "pending"],
    queryFn: () => listWriteOffs(institutionId as string, "pending_approval"),
    enabled: !!institutionId,
  });

  const approvedQuery = useQuery({
    queryKey: [WRITEOFFS_KEY, institutionId, "approved"],
    queryFn: () => listWriteOffs(institutionId as string, "approved"),
    enabled: !!institutionId,
  });

  const historyQuery = useQuery({
    queryKey: [WRITEOFFS_KEY, institutionId, "history"],
    queryFn: async () => {
      const all = await listWriteOffs(institutionId as string, "all");
      return all.filter((w) => w.status === "rejected" || w.status === "posted").slice(0, 50);
    },
    enabled: !!institutionId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [WRITEOFFS_KEY] });

  const requestMutation = useMutation({
    mutationFn: (vars: {
      batch: MedicineBatch;
      qty: number;
      reason: WriteOffReason;
      notes: string;
    }) =>
      requestWriteOff(institutionId as string, {
        inventory_table: vars.batch.inventory_table,
        inventory_item_id: vars.batch.inventory_item_id,
        product_name: vars.batch.product_name,
        batch_number: vars.batch.batch_number,
        batch_id: vars.batch.id,
        quantity_written_off: vars.qty,
        cost_per_unit: vars.batch.unit_cost,
        reason: vars.reason,
        notes: vars.notes || undefined,
      }),
    onSuccess: () => {
      toast.success("Write-off request submitted for approval.");
      setRequestOpen(false);
      setSelectedBatchId("");
      setQuantity("");
      setReason("expired");
      setNotes("");
      invalidate();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to submit write-off request.");
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveWriteOff(id),
    onSuccess: () => {
      toast.success("Write-off approved.");
      setApproveTarget(null);
      invalidate();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to approve write-off.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (vars: { id: string; rejectionReason: string }) =>
      rejectWriteOff(vars.id, vars.rejectionReason),
    onSuccess: () => {
      toast.success("Write-off rejected.");
      setRejectTarget(null);
      setRejectionReason("");
      invalidate();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to reject write-off.");
    },
  });

  const postMutation = useMutation({
    mutationFn: (id: string) => postWriteOff(id),
    onSuccess: () => {
      toast.success("Write-off posted. Stock has been decremented.");
      setPostTarget(null);
      invalidate();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to post write-off.");
    },
  });

  const qtyNumber = Number(quantity);
  const qtyValid =
    selectedBatch != null &&
    Number.isFinite(qtyNumber) &&
    qtyNumber >= 1 &&
    qtyNumber <= selectedBatch.quantity_remaining;

  const handleRequestSubmit = () => {
    if (!selectedBatch || !qtyValid) return;
    requestMutation.mutate({
      batch: selectedBatch,
      qty: Math.floor(qtyNumber),
      reason,
      notes: notes.trim(),
    });
  };

  if (!institutionId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Select an institution to manage stock write-offs.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Stock write-offs</h2>
          <p className="text-sm text-muted-foreground">
            Request, approve, and post inventory write-offs with a full audit trail.
          </p>
        </div>
        <Button onClick={() => setRequestOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Request write-off
        </Button>
      </div>

      {/* Pending approval */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending approval</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (pendingQuery.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No write-off requests are waiting for approval.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit cost</TableHead>
                    <TableHead className="text-right">Total loss</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(pendingQuery.data ?? []).map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.product_name}</TableCell>
                      <TableCell>{w.batch_number ?? "—"}</TableCell>
                      <TableCell className="text-right">{w.quantity_written_off}</TableCell>
                      <TableCell className="text-right">{formatPrice(Number(w.cost_per_unit))}</TableCell>
                      <TableCell className="text-right">{formatPrice(Number(w.total_loss))}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{reasonLabel(w.reason)}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(w.written_off_at)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setApproveTarget(w)}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectTarget(w)}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
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

      {/* Approved — ready to post */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approved — ready to post</CardTitle>
        </CardHeader>
        <CardContent>
          {approvedQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (approvedQuery.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No approved write-offs are waiting to be posted.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit cost</TableHead>
                    <TableHead className="text-right">Total loss</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(approvedQuery.data ?? []).map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.product_name}</TableCell>
                      <TableCell>{w.batch_number ?? "—"}</TableCell>
                      <TableCell className="text-right">{w.quantity_written_off}</TableCell>
                      <TableCell className="text-right">{formatPrice(Number(w.cost_per_unit))}</TableCell>
                      <TableCell className="text-right">{formatPrice(Number(w.total_loss))}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{reasonLabel(w.reason)}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(w.approved_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => setPostTarget(w)}>
                          Post
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (historyQuery.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No posted or rejected write-offs yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Total loss</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(historyQuery.data ?? []).map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.product_name}</TableCell>
                      <TableCell>{w.batch_number ?? "—"}</TableCell>
                      <TableCell className="text-right">{w.quantity_written_off}</TableCell>
                      <TableCell className="text-right">{formatPrice(Number(w.total_loss))}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{reasonLabel(w.reason)}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={w.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(w.approved_at ?? w.written_off_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request write-off dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request write-off</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="batch">Batch</Label>
              <Select
                value={selectedBatchId}
                onValueChange={setSelectedBatchId}
                disabled={batchesQuery.isLoading}
              >
                <SelectTrigger id="batch">
                  <SelectValue
                    placeholder={
                      batchesQuery.isLoading ? "Loading batches…" : "Select a batch"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {eligibleBatches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {`${b.product_name} — batch ${b.batch_number} (${b.quantity_remaining} left)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {eligibleBatches.length === 0 && !batchesQuery.isLoading && (
                <p className="text-xs text-muted-foreground">
                  No batches with remaining stock are available.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="qty">Quantity to write off</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={selectedBatch?.quantity_remaining}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
              {selectedBatch && (
                <p className="text-xs text-muted-foreground">
                  Available: {selectedBatch.quantity_remaining} units · unit cost{" "}
                  {formatPrice(Number(selectedBatch.unit_cost))}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Select
                value={reason}
                onValueChange={(v) => setReason(v as WriteOffReason)}
              >
                <SelectTrigger id="reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any supporting detail…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestSubmit}
              disabled={!qtyValid || requestMutation.isPending}
            >
              {requestMutation.isPending ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve confirmation */}
      <AlertDialog open={approveTarget !== null} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve write-off</AlertDialogTitle>
            <AlertDialogDescription>
              Approve the write-off of {approveTarget?.quantity_written_off} units of{" "}
              {approveTarget?.product_name} (batch {approveTarget?.batch_number ?? "—"}), a loss of{" "}
              {approveTarget ? formatPrice(Number(approveTarget.total_loss)) : "—"}? Note: the
              approver must be different from the person who requested it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveTarget && approveMutation.mutate(approveTarget.id)}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <Dialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject write-off</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Reject the write-off request for {rejectTarget?.product_name} (batch{" "}
              {rejectTarget?.batch_number ?? "—"}). A rejection reason is required.
            </p>
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection reason</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being rejected…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={rejectionReason.trim().length === 0 || rejectMutation.isPending}
              onClick={() =>
                rejectTarget &&
                rejectMutation.mutate({
                  id: rejectTarget.id,
                  rejectionReason: rejectionReason.trim(),
                })
              }
            >
              {rejectMutation.isPending ? "Rejecting…" : "Reject write-off"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post confirmation */}
      <AlertDialog open={postTarget !== null} onOpenChange={(open) => !open && setPostTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post write-off</AlertDialogTitle>
            <AlertDialogDescription>
              Posting will decrement stock for {postTarget?.product_name} (batch{" "}
              {postTarget?.batch_number ?? "—"}) by {postTarget?.quantity_written_off} units and
              record a loss of {postTarget ? formatPrice(Number(postTarget.total_loss)) : "—"}. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => postTarget && postMutation.mutate(postTarget.id)}
            >
              Post write-off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
