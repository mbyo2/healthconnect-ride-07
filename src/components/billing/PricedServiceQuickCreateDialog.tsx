import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import type { PricedService } from "@/lib/invoicePricing";

/** Categories used by the hospital charge matcher (HospitalBilling). */
export const PRICED_SERVICE_CATEGORIES = [
  "Consultations",
  "Laboratory",
  "Pharmacy",
  "Clinical Procedures",
  "Radiology & Imaging",
  "Ward & Bed Charges",
  "Maternal & Child Health",
  "Other",
];

export const toServiceCode = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "service";

interface Props {
  institutionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill from the search text the user typed (the missing service). */
  initialLabel?: string;
  initialCategory?: string;
  /** Called with the created price-list row so the caller can select it. */
  onCreated: (service: PricedService) => void;
}

/**
 * Create-on-missing for priced services (CEO Odoo rule, Patient Unity
 * W4): opened in a modal over the billing workflow when a needed service
 * is not on the institution's price list. Saving adds the service to
 * service_pricing for THIS institution and the caller resumes with it
 * selected — the old dead-end ("add services on the pricing screen
 * first") is gone. Writes are gated by the service_pricing RLS policy
 * (institution admins / platform admins); callers only offer this
 * dialog to those roles.
 */
export const PricedServiceQuickCreateDialog = ({
  institutionId,
  open,
  onOpenChange,
  initialLabel = "",
  initialCategory,
  onCreated,
}: Props) => {
  const [label, setLabel] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Other");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(initialLabel.trim());
      setPrice("");
      setCategory(initialCategory || "Other");
    }
  }, [open, initialLabel, initialCategory]);

  const handleSave = async () => {
    const name = label.trim();
    const amount = parseFloat(price);
    if (!name) {
      toast.error("Give the service a name");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter the price for this service");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from("service_pricing")
        .insert({
          institution_id: institutionId,
          service_code: toServiceCode(name),
          service_label: name,
          base_price: amount,
          currency: "ZMW",
          category,
          is_active: true,
        })
        .select("id, service_code, service_label, base_price, category, institution_id")
        .single();
      if (error) throw error;
      const service = data as PricedService;
      toast.success(`“${name}” added to the price list and selected`);
      onOpenChange(false);
      onCreated(service);
    } catch (e: any) {
      toast.error(
        "That service could not be added. Only an institution admin can change the price list — ask your admin to add it."
      );
      console.error("PricedServiceQuickCreate failed", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Add priced service
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            This service is not on the facility's price list yet. Add it now and the
            charge continues with it — no need to leave this workflow.
          </p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ps-label">Service name *</Label>
            <Input
              id="ps-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Full Blood Count"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ps-price">Price (ZMW) *</Label>
              <Input
                id="ps-price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICED_SERVICE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Plus className="h-4 w-4 mr-1" />
            {saving ? "Adding…" : "Add & select"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PricedServiceQuickCreateDialog;
