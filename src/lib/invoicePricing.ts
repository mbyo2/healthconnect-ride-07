// P1-26: manual-invoice lines are priced from the institution's
// service_pricing catalogue — never from prices typed into the form.
// These helpers shape the create_manual_invoice RPC payload and price
// the on-screen preview from the same catalogue rows the server will
// use. The server re-derives every price; nothing here is trusted.

export interface PricedService {
  id: string;
  service_code: string;
  service_label: string;
  base_price: number;
  category: string | null;
  institution_id: string | null;
}

export interface InvoiceServiceLine {
  service_pricing_id: string;
  quantity: number;
}

export const emptyServiceLine = (): InvoiceServiceLine => ({
  service_pricing_id: "",
  quantity: 1,
});

export function serviceById(services: PricedService[], id: string): PricedService | undefined {
  return services.find((s) => s.id === id);
}

export function serviceLineTotal(line: InvoiceServiceLine, services: PricedService[]): number {
  const svc = serviceById(services, line.service_pricing_id);
  if (!svc) return 0;
  return Math.round(line.quantity * Number(svc.base_price) * 100) / 100;
}

export function serviceLinesSubtotal(lines: InvoiceServiceLine[], services: PricedService[]): number {
  return lines.reduce((sum, line) => sum + serviceLineTotal(line, services), 0);
}

/** Payload for create_manual_invoice: ids + quantities only — no prices. */
export function buildInvoiceLinesPayload(lines: InvoiceServiceLine[]) {
  return lines
    .filter((l) => l.service_pricing_id)
    .map((l) => ({
      service_pricing_id: l.service_pricing_id,
      quantity: Math.max(1, Math.round(l.quantity) || 1),
    }));
}

/**
 * Best-effort match of a clinical charge (a lab test name, a medication
 * name, a consultation type) to a priced service on the catalogue.
 * Returns undefined when nothing on the price list plausibly matches —
 * the caller surfaces those charges as "not on the price list" instead
 * of inventing a price for them.
 */
export function matchService(services: PricedService[], ...keywords: string[]): PricedService | undefined {
  const needles = keywords.map((k) => (k || "").toLowerCase().trim()).filter(Boolean);
  if (needles.length === 0) return undefined;
  return services.find((s) => {
    const label = s.service_label.toLowerCase();
    const code = s.service_code.toLowerCase();
    return needles.some((n) => label.includes(n) || code.includes(n) || n.includes(label));
  });
}
