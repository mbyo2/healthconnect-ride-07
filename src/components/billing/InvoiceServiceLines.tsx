import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { EntitySelect, type EntityOption } from "@/components/ui/EntitySelect";
import { PricedServiceQuickCreateDialog } from "./PricedServiceQuickCreateDialog";
import {
  type PricedService,
  type InvoiceServiceLine,
  emptyServiceLine,
  serviceLineTotal,
  serviceById,
} from "@/lib/invoicePricing";

/**
 * P1-26: the institution's priced services — its own service_pricing
 * rows plus the platform catalogue (institution_id IS NULL). Manual
 * invoice lines are chosen from this list; prices are never typed.
 */
export function useInstitutionServices(institutionId: string | null | undefined) {
  const [services, setServices] = useState<PricedService[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!institutionId) {
      setServices([]);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("service_pricing")
      .select("id, service_code, service_label, base_price, category, institution_id")
      .eq("is_active", true)
      .or(`institution_id.eq.${institutionId},institution_id.is.null`)
      .order("service_label");
    setServices((data || []) as PricedService[]);
    setLoading(false);
  }, [institutionId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { services, loading, refresh: load };
}

interface Props {
  lines: InvoiceServiceLine[];
  services: PricedService[];
  onChange: (lines: InvoiceServiceLine[]) => void;
  formatPrice: (n: number) => string;
  /** Enables create-on-missing for priced services (Patient Unity W4). */
  institutionId?: string | null;
  /** Only roles allowed to change the price list see the create prompt. */
  canCreateService?: boolean;
  /** Called after a service is created inline (refresh the catalogue). */
  onServiceCreated?: (service: PricedService) => void;
}

export const ServiceLineEditor = ({
  lines,
  services,
  onChange,
  formatPrice,
  institutionId,
  canCreateService = false,
  onServiceCreated,
}: Props) => {
  const update = (idx: number, patch: Partial<InvoiceServiceLine>) => {
    onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };
  const remove = (idx: number) => onChange(lines.filter((_, i) => i !== idx));
  const add = () => onChange([...lines, emptyServiceLine()]);

  const toOption = (s: PricedService): EntityOption => ({
    id: s.id,
    label: s.service_label,
    sublabel: `${formatPrice(Number(s.base_price))}${s.category ? ` · ${s.category}` : ""}`,
  });

  const searchServices = async (term: string): Promise<EntityOption[]> => {
    const t = term.trim().toLowerCase();
    const matches = !t
      ? services
      : services.filter(
          (s) =>
            s.service_label.toLowerCase().includes(t) ||
            s.service_code.toLowerCase().includes(t) ||
            (s.category || "").toLowerCase().includes(t)
        );
    return matches.slice(0, 25).map(toOption);
  };

  return (
    <div>
      {lines.map((line, idx) => {
        const selected = line.service_pricing_id
          ? serviceById(services, line.service_pricing_id)
          : undefined;
        return (
          <div key={idx} className="flex gap-2 mb-2 items-start">
            <div className="flex-1">
              <EntitySelect
                entityName="priced service"
                placeholder="Search the price list…"
                value={selected ? toOption(selected) : null}
                onChange={(opt) => update(idx, { service_pricing_id: opt?.id ?? "" })}
                search={searchServices}
                renderCreateDialog={
                  institutionId && canCreateService
                    ? (ctx) => (
                        <PricedServiceQuickCreateDialog
                          institutionId={institutionId}
                          open={ctx.open}
                          onOpenChange={ctx.onOpenChange}
                          initialLabel={ctx.initialTerm}
                          onCreated={(svc) => {
                            onServiceCreated?.(svc);
                            ctx.onCreated(toOption(svc));
                          }}
                        />
                      )
                    : undefined
                }
                createUnavailableNote={
                  institutionId && !canCreateService
                    ? "Only an institution admin can add a new service to the price list — ask your admin to add it, then it will appear here."
                    : undefined
                }
              />
            </div>
            <Input
              type="number"
              min={1}
              placeholder="Qty"
              value={line.quantity}
              onChange={(e) => update(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-20 mt-0"
            />
            <div className="w-24 text-right font-bold text-sm pt-2">
              {line.service_pricing_id ? formatPrice(serviceLineTotal(line, services)) : "—"}
            </div>
            {lines.length > 1 && (
              <Button variant="outline" size="sm" onClick={() => remove(idx)} aria-label="Remove line">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      })}
      {services.length === 0 && (
        <p className="text-xs text-muted-foreground mb-2">
          {canCreateService
            ? "No priced services on this facility's price list yet — search above and choose “Create priced service” to add the first one without leaving this invoice."
            : "No priced services found for this institution yet. An institution admin can add services and prices to the price list — invoice lines are priced from that list."}
        </p>
      )}
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4 mr-1" /> Add line
      </Button>
    </div>
  );
};

export default ServiceLineEditor;
