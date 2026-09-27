import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { useCurrency } from "@/hooks/use-currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Eye, PackagePlus, PackageSearch } from "lucide-react";
import { format } from "date-fns";
import {
  EXPIRY_BAND_LABELS,
  daysToExpiry,
  expiryBandOf,
  getBatchMovements,
  listBatches,
  listInventoryItemOptions,
  receiveBatch,
  type BatchFilters,
  type ExpiryBand,
  type InventoryTable,
  type MedicineBatch,
  type QaStatus,
  type ReceiveBatchInput,
} from "./pharmacyStockService";

/* ------------------------------------------------------------------ */
/* Badge helpers                                                       */
/* ------------------------------------------------------------------ */

function ExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const band = expiryBandOf(expiryDate);
  const days = daysToExpiry(expiryDate);
  const label =
    days < 0
      ? `${format(new Date(expiryDate), "d MMM yyyy")} · expired`
      : `${format(new Date(expiryDate), "d MMM yyyy")} · ${days}d`;
  switch (band) {
    case "expired":
      return <Badge variant="destructive">{label}</Badge>;
    case "le30":
      return (
        <Badge className="border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100">
          {label}
        </Badge>
      );
    case "le90":
      return (
        <Badge className="border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-100">
          {label}
        </Badge>
      );
    default:
      return <Badge variant="success">{label}</Badge>;
  }
}

function QaBadge({ status }: { status: QaStatus }) {
  switch (status) {
    case "pending":
      return <Badge variant="warning">Pending</Badge>;
    case "approved":
      return <Badge variant="success">Approved</Badge>;
    case "quarantined":
      return (
        <Badge className="border-orange-200 bg-orange-100 text-orange-800 hover:bg-orange-100">
          Quarantined
        </Badge>
      );
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
  }
}

const QA_STATUS_OPTIONS: Array<QaStatus | "all"> = [
  "all",
  "pending",
  "approved",
  "quarantined",
  "rejected",
];

const EXPIRY_BAND_OPTIONS: Array<ExpiryBand> = ["all", "expired", "le30", "le90", "ok"];

const SOURCE_OPTIONS: Array<InventoryTable | "all"> = [
  "all",
  "pharmacy_inventory",
  "medication_inventory",
];

function sourceLabel(table: InventoryTable): string {
  return table === "pharmacy_inventory" ? "Pharmacy stock" : "Medication stock";
}

/* ------------------------------------------------------------------ */
/* Receive-batch dialog                                                */
/* ------------------------------------------------------------------ */

interface ReceiveBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
  pharmacyInventoryId: string | undefined;
  onReceived: () => void;
}

function ReceiveBatchDialog({
  open,
  onOpenChange,
  institutionId,
  pharmacyInventoryId,
  onReceived,
}: ReceiveBatchDialogProps) {
  const [selectedItemId, setSelectedItemId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [manufactureDate, setManufactureDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantityReceived, setQuantityReceived] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const { data: itemOptions = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["inventory-item-options", pharmacyInventoryId, institutionId],
    queryFn: () => listInventoryItemOptions(pharmacyInventoryId, institutionId),
    enabled: open,
  });

  const selectedOption = itemOptions.find((o) => o.id === selectedItemId);

  const mutation = useMutation({
    mutationFn: (input: ReceiveBatchInput) => receiveBatch(institutionId, input),
    onSuccess: () => {
      toast.success("Batch received successfully");
      resetForm();
      onReceived();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to receive batch");
    },
  });

  function resetForm() {
    setSelectedItemId("");
    setBatchNumber("");
    setManufacturer("");
    setManufactureDate("");
    setExpiryDate("");
    setQuantityReceived("");
    setUnitCost("");
    setUnitPrice("");
  }

  function handleSubmit() {
    if (!selectedOption) {
      toast.error("Please select an inventory item");
      return;
    }
    if (!batchNumber.trim()) {
      toast.error("Batch number is required");
      return;
    }
    if (!expiryDate) {
      toast.error("Expiry date is required");
      return;
    }
    const qty = Number(quantityReceived);
    if (!Number.isFinite(qty) || qty < 1) {
      toast.error("Quantity received must be at least 1");
      return;
    }
    const cost = Number(unitCost);
    if (!Number.isFinite(cost) || cost < 0) {
      toast.error("Unit cost must be 0 or more");
      return;
    }
    const priceRaw = unitPrice.trim();
    const price = priceRaw === "" ? undefined : Number(priceRaw);
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
      toast.error("Unit price must be 0 or more");
      return;
    }
    mutation.mutate({
      inventory_table: selectedOption.table,
      inventory_item_id: selectedOption.id,
      product_name: selectedOption.name,
      batch_number: batchNumber.trim(),
      manufacturer: manufacturer.trim() || undefined,
      manufacture_date: manufactureDate || undefined,
      expiry_date: expiryDate,
      quantity_received: qty,
      unit_cost: cost,
      unit_price: price,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Receive batch</DialogTitle>
          <DialogDescription>
            Record a new medicine batch received into inventory.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="receive-item">Inventory item</Label>
            <Select
              value={selectedItemId}
              onValueChange={setSelectedItemId}
              disabled={itemsLoading}
            >
              <SelectTrigger id="receive-item">
                <SelectValue
                  placeholder={itemsLoading ? "Loading items..." : "Select an item"}
                />
              </SelectTrigger>
              <SelectContent>
                {itemOptions.map((option) => (
                  <SelectItem key={`${option.table}:${option.id}`} value={option.id}>
                    {option.name} · {sourceLabel(option.table)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="receive-batch-number">Batch number *</Label>
            <Input
              id="receive-batch-number"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="e.g. B-2026-001"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="receive-manufacturer">Manufacturer</Label>
            <Input
              id="receive-manufacturer"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="e.g. Pharma Ltd"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="receive-mfg-date">Manufacture date</Label>
              <Input
                id="receive-mfg-date"
                type="date"
                value={manufactureDate}
                onChange={(e) => setManufactureDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receive-expiry-date">Expiry date *</Label>
              <Input
                id="receive-expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="receive-qty">Quantity received *</Label>
              <Input
                id="receive-qty"
                type="number"
                min={1}
                step={1}
                value={quantityReceived}
                onChange={(e) => setQuantityReceived(e.target.value)}
                placeholder="e.g. 100"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receive-cost">Unit cost *</Label>
              <Input
                id="receive-cost"
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="e.g. 12.50"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="receive-price">Unit price (optional)</Label>
            <Input
              id="receive-price"
              type="number"
              min={0}
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="e.g. 15.00"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Receiving..." : "Receive batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Batch details sheet                                                 */
/* ------------------------------------------------------------------ */

function BatchDetailsSheet({
  batch,
  onClose,
}: {
  batch: MedicineBatch | null;
  onClose: () => void;
}) {
  const { formatPrice } = useCurrency();
  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ["batch-movements", batch?.id],
    queryFn: () => getBatchMovements(batch!.id),
    enabled: !!batch,
  });

  return (
    <Sheet open={!!batch} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {batch && (
          <>
            <SheetHeader>
              <SheetTitle>{batch.product_name}</SheetTitle>
              <SheetDescription>Batch {batch.batch_number}</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Product</dt>
                  <dd className="font-medium">{batch.product_name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Batch number</dt>
                  <dd className="font-medium">{batch.batch_number}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Source</dt>
                  <dd className="font-medium">{sourceLabel(batch.inventory_table)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Manufacturer</dt>
                  <dd className="font-medium">{batch.manufacturer || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Manufacture date</dt>
                  <dd className="font-medium">
                    {batch.manufacture_date
                      ? format(new Date(batch.manufacture_date), "d MMM yyyy")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Expiry date</dt>
                  <dd>
                    <ExpiryBadge expiryDate={batch.expiry_date} />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Quantity received</dt>
                  <dd className="font-medium">{batch.quantity_received}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Quantity remaining</dt>
                  <dd className="font-medium">{batch.quantity_remaining}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Unit cost</dt>
                  <dd className="font-medium">{formatPrice(batch.unit_cost)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Unit price</dt>
                  <dd className="font-medium">
                    {batch.unit_price != null ? formatPrice(batch.unit_price) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">QA status</dt>
                  <dd>
                    <QaBadge status={batch.qa_status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Received at</dt>
                  <dd className="font-medium">
                    {format(new Date(batch.received_at), "d MMM yyyy HH:mm")}
                  </dd>
                </div>
              </dl>
              {batch.qa_notes && (
                <div className="text-sm">
                  <p className="text-muted-foreground">QA notes</p>
                  <p>{batch.qa_notes}</p>
                </div>
              )}
              <div>
                <h4 className="mb-2 text-sm font-semibold">Movement history</h4>
                {movementsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading movements...</p>
                ) : movements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No movements recorded for this batch.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Change</TableHead>
                          <TableHead className="text-right">After</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="whitespace-nowrap text-xs">
                              {format(new Date(m.created_at), "d MMM yyyy HH:mm")}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs">
                              {m.movement_type}
                            </TableCell>
                            <TableCell
                              className={`text-right text-xs font-medium ${
                                m.quantity_change >= 0
                                  ? "text-green-700"
                                  : "text-red-700"
                              }`}
                            >
                              {m.quantity_change >= 0 ? "+" : ""}
                              {m.quantity_change}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {m.quantity_after}
                            </TableCell>
                            <TableCell className="max-w-[180px] text-xs">
                              {m.notes || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function BatchInventory() {
  const { institution, institutionId } = useInstitutionContext();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [qaStatus, setQaStatus] = useState<QaStatus | "all">("all");
  const [expiryBand, setExpiryBand] = useState<ExpiryBand>("all");
  const [source, setSource] = useState<InventoryTable | "all">("all");
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<MedicineBatch | null>(null);

  const filters: BatchFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      qaStatus,
      expiryBand,
      inventoryTable: source,
    }),
    [search, qaStatus, expiryBand, source]
  );

  const {
    data: batches = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["medicine-batches", institutionId, filters],
    queryFn: () => listBatches(institutionId!, filters),
    enabled: !!institutionId,
  });

  function handleReceived() {
    queryClient.invalidateQueries({ queryKey: ["medicine-batches"] });
  }

  if (!institutionId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No institution selected. Please sign in with an institution account to manage
          batch inventory.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>Batch inventory</CardTitle>
        <Button onClick={() => setReceiveOpen(true)}>
          <PackagePlus className="mr-2 h-4 w-4" />
          Receive batch
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Search product or batch number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search batches"
          />
          <Select
            value={qaStatus}
            onValueChange={(v) => setQaStatus(v as QaStatus | "all")}
          >
            <SelectTrigger aria-label="Filter by QA status">
              <SelectValue placeholder="QA status" />
            </SelectTrigger>
            <SelectContent>
              {QA_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === "all"
                    ? "All QA statuses"
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={expiryBand}
            onValueChange={(v) => setExpiryBand(v as ExpiryBand)}
          >
            <SelectTrigger aria-label="Filter by expiry band">
              <SelectValue placeholder="Expiry band" />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_BAND_OPTIONS.map((band) => (
                <SelectItem key={band} value={band}>
                  {band === "all" ? "All expiry bands" : EXPIRY_BAND_LABELS[band]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={source}
            onValueChange={(v) => setSource(v as InventoryTable | "all")}
          >
            <SelectTrigger aria-label="Filter by source">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === "all" ? "All sources" : sourceLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Loading batches...
          </p>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-destructive">
            Failed to load batches. Please try again.
          </p>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <PackageSearch className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No batches found. Receive your first batch to start tracking stock.
            </p>
            <Button variant="outline" onClick={() => setReceiveOpen(true)}>
              <PackagePlus className="mr-2 h-4 w-4" />
              Receive batch
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Qty remaining</TableHead>
                  <TableHead className="text-right">Unit cost</TableHead>
                  <TableHead>QA status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.product_name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {batch.batch_number}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <ExpiryBadge expiryDate={batch.expiry_date} />
                    </TableCell>
                    <TableCell className="text-right">{batch.quantity_remaining}</TableCell>
                    <TableCell className="text-right">
                      {formatPrice(batch.unit_cost)}
                    </TableCell>
                    <TableCell>
                      <QaBadge status={batch.qa_status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedBatch(batch)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <ReceiveBatchDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        institutionId={institutionId}
        pharmacyInventoryId={institution?.id}
        onReceived={handleReceived}
      />
      <BatchDetailsSheet batch={selectedBatch} onClose={() => setSelectedBatch(null)} />
    </Card>
  );
}
