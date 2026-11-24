import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DRUG_CATEGORIES } from "@/components/hospital/MedicineQuickCreateDialog";
import {
  createMedicationInventoryItem,
  createPharmacyInventoryItem,
  type InventoryItemOption,
  type InventoryTable,
} from "@/components/pharmacy/pharmacyStockService";
import { friendlyErrorMessage } from "@/utils/friendly-error";

/** Live medication_inventory.medication_type enum values. */
const MEDICATION_TYPES: Array<{ value: string; label: string }> = [
  { value: "tablet", label: "Tablet" },
  { value: "capsule", label: "Capsule" },
  { value: "liquid", label: "Liquid / syrup" },
  { value: "injection", label: "Injection" },
  { value: "cream", label: "Cream" },
  { value: "ointment", label: "Ointment" },
  { value: "drops", label: "Drops" },
  { value: "inhaler", label: "Inhaler" },
  { value: "powder", label: "Powder" },
  { value: "other", label: "Other" },
];

interface CreateStockItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
  /** Which catalogue to create in first; the user can switch inside. */
  defaultTable?: InventoryTable;
  /** Prefill the item name (e.g. what the user searched for). */
  initialName?: string;
  /** Called with the created item so the caller can select / refresh. */
  onCreated: (item: InventoryItemOption) => void;
}

/**
 * Create-on-missing for dispensary stock items (CEO rule, 2026-10-29):
 * the stock-control surface previously offered only "Receive batch"
 * against items that already existed, so an empty catalogue was a dead
 * end. This dialog adds the item itself — to either live catalogue —
 * and hands it back to the calling flow (e.g. receive-batch) with the
 * batch details the user already typed left untouched.
 */
export function CreateStockItemDialog({
  open,
  onOpenChange,
  institutionId,
  defaultTable = "pharmacy_inventory",
  initialName = "",
  onCreated,
}: CreateStockItemDialogProps) {
  const [table, setTable] = useState<InventoryTable>(defaultTable);
  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [dosage, setDosage] = useState("");
  const [medicationType, setMedicationType] = useState("tablet");
  const [category, setCategory] = useState("medication");
  const [manufacturer, setManufacturer] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [reorderLevel, setReorderLevel] = useState("10");
  const [expiryDate, setExpiryDate] = useState("");

  useEffect(() => {
    if (open) {
      setTable(defaultTable);
      setName(initialName.trim());
      setGenericName("");
      setDosage("");
      setMedicationType("tablet");
      setCategory("medication");
      setManufacturer("");
      setUnitPrice("");
      setCostPrice("");
      setReorderLevel("10");
      setExpiryDate("");
    }
  }, [open, defaultTable, initialName]);

  const mutation = useMutation({
    mutationFn: async (): Promise<InventoryItemOption> => {
      const priceRaw = unitPrice.trim();
      const price = priceRaw === "" ? undefined : Number(priceRaw);
      if (table === "pharmacy_inventory") {
        if (price === undefined || !Number.isFinite(price) || price < 0) {
          throw new Error("Enter the selling price for this item");
        }
        const costRaw = costPrice.trim();
        const cost = costRaw === "" ? undefined : Number(costRaw);
        if (cost !== undefined && (!Number.isFinite(cost) || cost < 0)) {
          throw new Error("Cost price must be 0 or more");
        }
        const reorder = Number(reorderLevel);
        return createPharmacyInventoryItem(institutionId, {
          product_name: name,
          category,
          unit_price: price,
          cost_price: cost,
          manufacturer: manufacturer || undefined,
          reorder_level: Number.isFinite(reorder) && reorder >= 0 ? reorder : 10,
        });
      }
      if (!dosage.trim()) {
        throw new Error("Enter the strength, for example 500mg");
      }
      if (!expiryDate) {
        throw new Error("Enter the expiry date of the first stock");
      }
      if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
        throw new Error("Unit price must be 0 or more");
      }
      const reorder = Number(reorderLevel);
      return createMedicationInventoryItem(institutionId, {
        medication_name: name,
        generic_name: genericName || undefined,
        dosage,
        medication_type: medicationType,
        manufacturer: manufacturer || undefined,
        unit_price: price,
        minimum_stock_level: Number.isFinite(reorder) && reorder >= 0 ? reorder : 10,
        expiry_date: expiryDate,
      });
    },
    onSuccess: (item) => {
      toast.success(`"${item.name}" added — you can now receive stock for it`);
      onOpenChange(false);
      onCreated(item);
    },
    onError: (error: Error) => {
      toast.error(
        friendlyErrorMessage(
          error,
          "That item could not be added. Only this facility's pharmacy team can change stock — ask a pharmacist or admin to add it."
        )
      );
    },
  });

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Give the item a name");
      return;
    }
    mutation.mutate();
  }

  const isPharmacy = table === "pharmacy_inventory";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5" /> Add item
          </DialogTitle>
          <DialogDescription>
            Add a new medicine or stock item to this facility's catalogue. Stock
            itself arrives when you receive a batch against the item.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="new-item-catalogue">Catalogue</Label>
            <Select value={table} onValueChange={(v) => setTable(v as InventoryTable)}>
              <SelectTrigger id="new-item-catalogue">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pharmacy_inventory">
                  Dispensary items (sold at the counter)
                </SelectItem>
                <SelectItem value="medication_inventory">
                  Medication catalogue (ward / clinical stock)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-item-name">{isPharmacy ? "Product name *" : "Medication name *"}</Label>
            <Input
              id="new-item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isPharmacy ? "e.g. Paracetamol 500mg tablets" : "e.g. Paracetamol"}
            />
          </div>

          {!isPharmacy && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="new-item-generic">Generic name</Label>
                  <Input
                    id="new-item-generic"
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                    placeholder="e.g. Acetaminophen"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-item-dosage">Strength *</Label>
                  <Input
                    id="new-item-dosage"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 500mg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="new-item-type">Form *</Label>
                  <Select value={medicationType} onValueChange={setMedicationType}>
                    <SelectTrigger id="new-item-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDICATION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-item-expiry">Expiry of first stock *</Label>
                  <Input
                    id="new-item-expiry"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {isPharmacy && (
            <div className="grid gap-2">
              <Label htmlFor="new-item-category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="new-item-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRUG_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="new-item-manufacturer">Manufacturer</Label>
              <Input
                id="new-item-manufacturer"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-item-reorder">Reorder level</Label>
              <Input
                id="new-item-reorder"
                type="number"
                min={0}
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="new-item-price">{isPharmacy ? "Selling price *" : "Unit price"}</Label>
              <Input
                id="new-item-price"
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
            {isPharmacy && (
              <div className="grid gap-2">
                <Label htmlFor="new-item-cost">Cost price</Label>
                <Input
                  id="new-item-cost"
                  type="number"
                  min={0}
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Adding..." : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
