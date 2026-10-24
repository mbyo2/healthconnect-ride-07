import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import {
  type PricedService,
  type InvoiceServiceLine,
  emptyServiceLine,
  serviceLineTotal,
} from "@/lib/invoicePricing";

/**
 * P1-26: the institution's priced services — its own service_pricing
 * rows plus the platform catalogue (institution_id IS NULL). Manual
 * invoice lines are chosen from this list; prices are never typed.
 */
export function useInstitutionServices(institutionId: string | null | undefined) {
  const [services, setServices] = useState<PricedService[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!institutionId) {
      setServices([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("service_pricing")
        .select("id, service_code, service_label, base_price, category, institution_id")
        .eq("is_active", true)
        .or(`institution_id.eq.${institutionId},institution_id.is.null`)
        .order("service_label");
      if (!cancelled) {
        setServices((data || []) as PricedService[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [institutionId]);

  return { services, loading };
}

interface Props {
  lines: InvoiceServiceLine[];
  services: PricedService[];
  onChange: (lines: InvoiceServiceLine[]) => void;
  formatPrice: (n: number) => string;
}

export const ServiceLineEditor = ({ lines, services, onChange, formatPrice }: Props) => {
  const update = (idx: number, patch: Partial<InvoiceServiceLine>) => {
    onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };
  const remove = (idx: number) => onChange(lines.filter((_, i) => i !== idx));
  const add = () => onChange([...lines, emptyServiceLine()]);

  return (
    <div>
      {lines.map((line, idx) => (
        <div key={idx} className="flex gap-2 mb-2 items-center">
          <div className="flex-1">
            <Select
              value={line.service_pricing_id || undefined}
              onValueChange={(v) => update(idx, { service_pricing_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a priced service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.service_label} — {formatPrice(Number(s.base_price))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            type="number"
            min={1}
            placeholder="Qty"
            value={line.quantity}
            onChange={(e) => update(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-20"
          />
          <div className="w-24 text-right font-bold text-sm">
            {line.service_pricing_id ? formatPrice(serviceLineTotal(line, services)) : "—"}
          </div>
          {lines.length > 1 && (
            <Button variant="outline" size="sm" onClick={() => remove(idx)} aria-label="Remove line">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
      {services.length === 0 && (
        <p className="text-xs text-muted-foreground mb-2">
          No priced services found for this institution yet. Add services and their prices to the
          price list first — invoice lines are priced from that list.
        </p>
      )}
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4 mr-1" /> Add Service
      </Button>
    </div>
  );
};

export default ServiceLineEditor;
