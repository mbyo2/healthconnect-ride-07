import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// The REAL payload builders the clients send — not mirrors.
import { buildPosSaleItemsPayload, POS_DISCOUNT_BANDS } from '@/lib/posSale';
import {
  buildInvoiceLinesPayload,
  serviceLineTotal,
  serviceLinesSubtotal,
  matchService,
  type PricedService,
} from '@/lib/invoicePricing';

const readSrc = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

const MIGRATION = 'supabase/migrations/20261025_stagep126_server_priced_sales_invoices.sql';

const services: PricedService[] = [
  { id: 'svc-consult', service_code: 'CONSULT', service_label: 'General Consultation', base_price: 150, category: 'opd', institution_id: 'inst-a' },
  { id: 'svc-lab', service_code: 'LAB-FBC', service_label: 'Full Blood Count', base_price: 85.5, category: 'lab', institution_id: 'inst-a' },
  { id: 'svc-platform', service_code: 'TELE', service_label: 'Teleconsultation', base_price: 100, category: 'opd', institution_id: null },
];

describe('P1-26 · POS payload carries no prices (create_pos_sale)', () => {
  it('strips unit_price/total/discount from cart lines, keeps id + quantity', () => {
    const payload = buildPosSaleItemsPayload([
      { medication_inventory_id: 'med-1', quantity: 2, unit_price: 0.01, total: 0.02, discount: 0 } as any,
      { medication_inventory_id: 'med-2', quantity: 1, unit_price: 9999, total: 9999 } as any,
    ]);
    expect(payload).toEqual([
      { medication_inventory_id: 'med-1', quantity: 2 },
      { medication_inventory_id: 'med-2', quantity: 1 },
    ]);
    for (const line of payload) {
      expect(Object.keys(line).sort()).toEqual(['medication_inventory_id', 'quantity']);
    }
  });

  it('quantities are clamped to whole units of at least 1', () => {
    expect(buildPosSaleItemsPayload([{ medication_inventory_id: 'm', quantity: 0 }])).toEqual([
      { medication_inventory_id: 'm', quantity: 1 },
    ]);
    expect(buildPosSaleItemsPayload([{ medication_inventory_id: 'm', quantity: 2.6 }])).toEqual([
      { medication_inventory_id: 'm', quantity: 3 },
    ]);
  });

  it('discount bands offered by the till match the server cap (0–15)', () => {
    expect([...POS_DISCOUNT_BANDS]).toEqual([0, 5, 10, 15]);
    expect(Math.max(...POS_DISCOUNT_BANDS)).toBeLessThanOrEqual(15);
  });
});

describe('P1-26 · invoice lines price from the catalogue and ADD UP', () => {
  it('line totals come from service_pricing.base_price, not the line', () => {
    const line = { service_pricing_id: 'svc-lab', quantity: 2, unit_price: 1 } as any;
    expect(serviceLineTotal(line, services)).toBe(171);
  });

  it('subtotal is the sum of individually priced services (CEO billing rule)', () => {
    const subtotal = serviceLinesSubtotal(
      [
        { service_pricing_id: 'svc-consult', quantity: 1 },
        { service_pricing_id: 'svc-lab', quantity: 2 },
        { service_pricing_id: 'svc-platform', quantity: 1 },
      ],
      services,
    );
    expect(subtotal).toBe(150 + 171 + 100);
  });

  it('payload sends ids + quantities only, and drops unchosen lines', () => {
    const payload = buildInvoiceLinesPayload([
      { service_pricing_id: 'svc-consult', quantity: 1 },
      { service_pricing_id: '', quantity: 5 },
      { service_pricing_id: 'svc-lab', quantity: 3 },
    ]);
    expect(payload).toEqual([
      { service_pricing_id: 'svc-consult', quantity: 1 },
      { service_pricing_id: 'svc-lab', quantity: 3 },
    ]);
  });

  it('matchService finds listed services and refuses unlisted charges', () => {
    expect(matchService(services, 'full blood')?.id).toBe('svc-lab');
    expect(matchService(services, 'consultation')?.id).toBe('svc-consult');
    expect(matchService(services, 'heart transplant')?.id).toBeUndefined();
  });
});

describe('P1-26 · server pricing migration is the only creation path', () => {
  const sql = readSrc(MIGRATION);

  it('defines both server-priced RPCs as SECURITY DEFINER with pinned search_path', () => {
    for (const fn of ['create_pos_sale', 'create_manual_invoice']) {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION public.${fn}(`);
    }
    expect(sql.match(/SECURITY DEFINER/g)?.length).toBeGreaterThanOrEqual(2);
    expect(sql.match(/SET search_path TO 'public'/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('never accepts a client price or total (no fallback parameters)', () => {
    expect(sql).not.toMatch(/p_unit_price|p_total|p_subtotal|p_amount/);
    expect(sql).toContain('medication_inventory');
    expect(sql).toContain('service_pricing');
  });

  it('revokes PUBLIC/anon execute and drops the client INSERT policies', () => {
    expect(sql).toContain('FROM PUBLIC, anon');
    expect(sql).toContain('DROP POLICY IF EXISTS "Pharmacy staff can create sales" ON public.pos_sales');
    expect(sql).toContain('DROP POLICY IF EXISTS "Pharmacy staff can create sale items" ON public.pos_sale_items');
    expect(sql).toContain('DROP POLICY IF EXISTS "Finance staff can create invoices" ON public.billing_invoices');
  });

  it('clients call the RPCs and no longer insert into the ledger tables', () => {
    const pos = readSrc('src/components/pharmacy/PharmacyPOS.tsx');
    expect(pos).toContain('create_pos_sale');
    expect(pos).not.toMatch(/from\("pos_sales"\)\.insert/);
    expect(pos).not.toMatch(/from\("pos_sale_items"\)\.insert/);
    expect(pos).not.toContain('addCustomItem');

    const billing = readSrc('src/pages/Billing.tsx');
    expect(billing).toContain('create_manual_invoice');
    expect(billing).not.toMatch(/from\("billing_invoices"\)\.insert/);

    const hook = readSrc('src/hooks/useBillingModule.ts');
    expect(hook).toContain('create_manual_invoice');
    expect(hook).not.toMatch(/from\('billing_invoices'\)\s*\n?\s*\.insert/);
  });
});
