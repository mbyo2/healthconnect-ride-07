import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// The REAL payload builders the clients send — not mirrors.
import { buildPosSaleItemsPayload } from '@/lib/posSale';
import {
  buildPharmacySaleItemsPayload,
  pharmacySalePreview,
  PHARMACY_SALE_TAX_RATE,
} from '@/lib/pharmacySale';

const readSrc = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

const MIGRATION = 'supabase/migrations/20261025_stagelegacy_create_pharmacy_sale.sql';

describe('Legacy pharmacy sales · pharmacy payload carries no prices (create_pharmacy_sale)', () => {
  it('strips unit_price/total/tax from cart lines, keeps id + quantity', () => {
    const payload = buildPharmacySaleItemsPayload([
      { pharmacy_inventory_id: 'inv-1', quantity: 2, unit_price: 0.01, total: 0.02, tax: 0 } as any,
      { pharmacy_inventory_id: 'inv-2', quantity: 1, unit_price: 9999, total_amount: 9999 } as any,
    ]);
    expect(payload).toEqual([
      { pharmacy_inventory_id: 'inv-1', quantity: 2 },
      { pharmacy_inventory_id: 'inv-2', quantity: 1 },
    ]);
    for (const line of payload) {
      expect(Object.keys(line).sort()).toEqual(['pharmacy_inventory_id', 'quantity']);
    }
  });

  it('quantities are clamped to whole units of at least 1', () => {
    expect(buildPharmacySaleItemsPayload([{ pharmacy_inventory_id: 'i', quantity: 0 }])).toEqual([
      { pharmacy_inventory_id: 'i', quantity: 1 },
    ]);
    expect(buildPharmacySaleItemsPayload([{ pharmacy_inventory_id: 'i', quantity: 2.6 }])).toEqual([
      { pharmacy_inventory_id: 'i', quantity: 3 },
    ]);
  });

  it('preview tax is 16% and matches the proven server figures (61.00 → 9.76 → 70.76)', () => {
    expect(PHARMACY_SALE_TAX_RATE).toBe(0.16);
    expect(pharmacySalePreview(61)).toEqual({ subtotal: 61, tax: 9.76, total: 70.76 });
    expect(pharmacySalePreview(2 * 25.5 + 1 * 10)).toEqual({ subtotal: 61, tax: 9.76, total: 70.76 });
  });
});

describe('Legacy pharmacy sales · create_pharmacy_sale migration', () => {
  const sql = readSrc(MIGRATION);

  it('defines the RPC as SECURITY DEFINER with pinned search_path', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.create_pharmacy_sale(');
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain("SET search_path TO 'public'");
  });

  it('never accepts a client price or total (no fallback parameters)', () => {
    expect(sql).not.toMatch(/p_unit_price|p_total|p_subtotal|p_tax|p_amount/);
    expect(sql).toContain('pharmacy_inventory');
  });

  it('computes the 16% tax server-side and FEFO-dispenses pharmacy_inventory in-transaction', () => {
    expect(sql).toContain('0.16');
    expect(sql).toContain('dispense_medicine_batches');
    expect(sql).toContain("'pharmacy_inventory'");
    expect(sql).toContain("'completed'");
  });

  it('gates on the pharmacy_inventory write-actor family and revokes PUBLIC/anon execute', () => {
    expect(sql).toContain('is_institution_staff_member(p_pharmacy_id)');
    expect(sql).toContain('is_institution_admin(p_pharmacy_id)');
    expect(sql).toContain('FROM PUBLIC, anon');
    expect(sql).toContain('TO authenticated, service_role');
  });

  it('adds a staff SELECT policy and NO client INSERT policy (RPC-only creation)', () => {
    expect(sql).toContain('CREATE POLICY "Pharmacy staff can view pharmacy sales" ON public.pharmacy_sales');
    expect(sql).toContain('FOR SELECT');
    expect(sql).not.toMatch(/CREATE POLICY[^;]*FOR INSERT/);
    expect(sql).not.toMatch(/DROP POLICY/);
  });
});

describe('Legacy pharmacy sales · client wiring', () => {
  it('DispensaryOperations completes via create_pos_sale and writes nothing directly', () => {
    const src = readSrc('src/components/specialized/DispensaryOperations.tsx');
    expect(src).toContain('create_pos_sale');
    expect(src).toContain('buildPosSaleItemsPayload');
    expect(src).not.toMatch(/from\("pharmacy_sales"/);
    expect(src).not.toMatch(/from\('pharmacy_sales'\)/);
    expect(src).not.toMatch(/\.from\("medication_inventory" as any\) as any\)\s*\.update/);
    expect(src).not.toContain('inventory_transactions');
    // Receipt comes from the RPC-returned sale, not a local receipt number.
    expect(src).toContain('receipt_number');
    expect(src).toContain('total_amount');
    expect(src).not.toContain('DSP-${');
  });

  it('PharmacyManagement completes via create_pharmacy_sale only — no insert, no delete-rollback', () => {
    const src = readSrc('src/pages/PharmacyManagement.tsx');
    expect(src).toContain('create_pharmacy_sale');
    expect(src).toContain('buildPharmacySaleItemsPayload');
    expect(src).not.toMatch(/from\("pharmacy_sales" as any\)\s*\.insert/);
    expect(src).not.toMatch(/\.from\("pharmacy_sales"[^)]*\)\s*\.delete/);
    expect(src).not.toContain('Sale rolled back');
    expect(src).not.toContain('dispenseLinesFEFO');
    expect(src).not.toContain('precheckDispenseLines');
  });

  it('the canonical till payload builder is shared by DispensaryOperations', () => {
    const payload = buildPosSaleItemsPayload([
      { medication_inventory_id: 'med-1', quantity: 2, unit_price: 0.01 } as any,
    ]);
    expect(payload).toEqual([{ medication_inventory_id: 'med-1', quantity: 2 }]);
  });
});
