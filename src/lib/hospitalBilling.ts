// E-14: hospital bill assembly is priced server-side by
// create_hospital_bill. The client discovers the encounter's charges,
// matches each to a priced service on the hospital's service_pricing
// catalogue, and sends ids + quantities + clinical source references
// only — no prices, no totals, no insurance percentages. The helpers
// here shape that payload and price the on-screen preview from the
// same catalogue rows the server will use. The server re-derives
// every figure; nothing here is trusted.

import { matchService, type PricedService } from "@/lib/invoicePricing";

export type { PricedService };

/** One charge discovered from the patient's encounter. */
export interface AssembledCharge {
  key: string;
  category: string;
  /** Display text only — the server writes its own line descriptions
   *  from the price-list rows. */
  description: string;
  date?: string | null;
  quantity: number;
  /** The matched price-list service, or undefined when the charge is
   *  not on the price list (shown to staff, never billed). */
  service?: PricedService;
  source_kind?: string;
  source_id?: string;
  selected: boolean;
}

export interface HospitalBillLine {
  service_pricing_id: string;
  quantity: number;
  source_kind?: string;
  source_id?: string;
}

/**
 * Like matchService, but tries the keywords in order so a specific
 * name ("semi-private") wins over a generic one ("bed") regardless of
 * catalogue order.
 */
export function matchServiceOrdered(services: PricedService[], ...keywords: string[]): PricedService | undefined {
  for (const keyword of keywords) {
    const hit = matchService(services, keyword.replace(/_/g, " "));
    if (hit) return hit;
  }
  return undefined;
}

/** Preview total from catalogue rows — display only; the server total governs. */
export function chargePreviewTotal(charge: AssembledCharge): number {
  if (!charge.service) return 0;
  return Math.round(charge.quantity * Number(charge.service.base_price) * 100) / 100;
}

export function selectedChargesTotal(charges: AssembledCharge[]): number {
  return charges
    .filter((c) => c.service && c.selected !== false)
    .reduce((sum, c) => Math.round((sum + chargePreviewTotal(c)) * 100) / 100, 0);
}

/** Payload for create_hospital_bill: ids + quantities + sources only. */
export function buildHospitalBillLines(charges: AssembledCharge[]): HospitalBillLine[] {
  return charges
    .filter((c) => c.service && c.selected !== false)
    .map((c) => {
      const line: HospitalBillLine = {
        service_pricing_id: c.service!.id,
        quantity: Math.max(1, Math.round(c.quantity) || 1),
      };
      if (c.source_kind && c.source_id) {
        line.source_kind = c.source_kind;
        line.source_id = c.source_id;
      }
      return line;
    });
}

/** Charges that could not be matched to the price list. */
export function unpricedCharges(charges: AssembledCharge[]): AssembledCharge[] {
  return charges.filter((c) => !c.service);
}
