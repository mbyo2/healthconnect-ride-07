import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

// pharmacy_inventory.category is a stock TYPE, constrained by a live
// CHECK to exactly these values (proven 2026-10-29: the old clinical
// groupings — 'Analgesics', 'Antibiotics', … — violate the CHECK, so
// every UI stock insert failed). Keep this list equal to the CHECK.
export const DRUG_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'medication', label: 'Medication' },
  { value: 'supplement', label: 'Supplement' },
  { value: 'medical_supply', label: 'Medical supply' },
  { value: 'personal_care', label: 'Personal care' },
  { value: 'equipment', label: 'Equipment' },
];

/** Stock code from a product name (product_code is NOT NULL, no default). */
export const toProductCode = (name: string) =>
  (name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "MED") +
  "-" +
  Math.random().toString(36).slice(2, 7).toUpperCase();

export interface StockedMedicine {
  id: string;
  product_name: string;
  category: string | null;
  quantity: number;
  unit_price: number;
}

interface Props {
  /** The dispensary/pharmacy institution id (pharmacy_inventory.pharmacy_id). */
  pharmacyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill from the search text the user typed (the missing medicine). */
  initialName?: string;
  /** Called with the created stock row so the caller can select it. */
  onCreated: (item: StockedMedicine) => void;
}

/**
 * Create-on-missing for medicines (CEO Odoo rule, Patient Unity W4):
 * when a prescription or dispensing flow needs a medicine that is not
 * in stock, the dispensary team adds it inline — modal over the current
 * workflow — and the flow resumes with the new item selected. Writes
 * follow the pharmacy_inventory RLS policy (institution admin or staff
 * member of the dispensary); callers only offer this dialog to them.
 */
export const MedicineQuickCreateDialog = ({
  pharmacyId,
  open,
  onOpenChange,
  initialName = "",
  onCreated,
}: Props) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("medication");
  const [quantity, setQuantity] = useState("100");
  const [unitPrice, setUnitPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName.trim());
      setCategory("medication");
      setQuantity("100");
      setUnitPrice("");
      setCostPrice("");
      setBatchNumber("");
      setExpiryDate("");
    }
  }, [open, initialName]);

  const handleSave = async () => {
    const product = name.trim();
    if (!product) {
      toast.error("Give the medicine a name");
      return;
    }
    const price = parseFloat(unitPrice);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter the selling price for this medicine");
      return;
    }
    setSaving(true);
    try {
      // No read-back (.select()): the inventory SELECT policy only
      // covers institutions the caller admin-owns, so a staff member's
      // insert would succeed but its RETURNING would be refused. The id
      // is generated here and the created row is assembled locally.
      const item: StockedMedicine = {
        id: crypto.randomUUID(),
        product_name: product,
        category,
        quantity: Math.max(0, parseInt(quantity) || 0),
        unit_price: price,
      };
      const { error } = await (supabase.from('pharmacy_inventory' as any) as any)
        .insert({
          id: item.id,
          pharmacy_id: pharmacyId,
          product_name: product,
          product_code: toProductCode(product),
          category,
          quantity: item.quantity,
          unit_price: price,
          cost_price: costPrice === "" ? Math.round(price * 0.6 * 100) / 100 : parseFloat(costPrice) || 0,
          batch_number: batchNumber.trim() || null,
          expiry_date: expiryDate || null,
          reorder_level: 20,
        });
      if (error) throw error;
      toast.success(`“${product}” added to stock and selected`);
      onOpenChange(false);
      onCreated(item);
    } catch (e: any) {
      toast.error(
        "That medicine could not be added. Only this facility's pharmacy team can change stock — ask a pharmacist or admin to add it."
      );
      console.error("MedicineQuickCreate failed", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" /> Add medicine to stock
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            This medicine is not in the dispensary's stock yet. Add it now and the
            prescription continues with it — no need to leave this workflow.
          </p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="med-name">Medicine name *</Label>
            <Input
              id="med-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amoxicillin 500mg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRUG_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-qty">Stock quantity</Label>
              <Input
                id="med-qty"
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="med-price">Selling price (K) *</Label>
              <Input
                id="med-price"
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-cost">Cost price (K)</Label>
              <Input
                id="med-cost"
                type="number"
                min={0}
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="med-batch">Batch number</Label>
              <Input
                id="med-batch"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="BATCH-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-expiry">Expiry date</Label>
              <Input
                id="med-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Pill className="h-4 w-4 mr-1" />
            {saving ? "Adding…" : "Add & select"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MedicineQuickCreateDialog;
