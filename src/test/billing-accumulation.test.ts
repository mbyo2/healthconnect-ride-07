import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Billing accumulation (CEO 2026-10-07/10-17/10-29): one patient, one
// institution, ONE bill — every service adds up on it, nothing is
// charged twice, and completing an appointment spawns no parallel
// bill. These tests pin the migration's shape the way the E-14 tests
// pin server-side pricing; behaviour is proven live by the scripted
// PostgREST proof (exact figures) run with this change.

const readSrc = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

const MIGRATION = 'supabase/migrations/20261029_billing_accumulation.sql';

describe('Accumulation · create_hospital_bill appends to the one open bill', () => {
  const sql = readSrc(MIGRATION);

  it('keeps the E-14 contract: SECURITY DEFINER, pinned search_path, no client money parameters', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.create_hospital_bill');
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain("SET search_path TO 'public'");
    const signature = sql.slice(sql.indexOf('FUNCTION public.create_hospital_bill'), sql.indexOf('RETURNS jsonb'));
    for (const forbidden of ['price', 'amount', 'total', 'percentage', 'portion', 'split']) {
      expect(signature.toLowerCase()).not.toContain(forbidden);
    }
    expect(sql).toContain('FROM public.service_pricing');
    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.create_hospital_bill(uuid, uuid, jsonb, uuid, date) FROM PUBLIC, anon');
  });

  it('finds the open bill (pending, nothing paid) and locks it before pricing', () => {
    expect(sql).toContain("AND payment_status = 'pending'");
    expect(sql).toContain('AND paid_amount = 0');
    expect(sql).toContain('FOR UPDATE');
  });

  it('merges lines onto the open bill and re-sums stored totals instead of replacing them', () => {
    expect(sql).toContain('v_merged_items');
    expect(sql).toContain('v_merged_subtotal');
    expect(sql).toContain('UPDATE public.hospital_billing');
    expect(sql).toContain("'appended', v_has_open");
  });

  it('recomputes the insurance split over the merged gross and syncs the filed claim', () => {
    expect(sql).toContain('round(v_merged_subtotal * v_pct / 100, 2)');
    expect(sql).toContain('SET claim_amount = v_insurer');
    // Append with no new policy reuses the open bill's provider terms.
    expect(sql).toContain('v_open.insurance_provider IS NOT NULL');
  });

  it('never charges the same clinical record twice (already-billed guard)', () => {
    expect(sql).toContain('v_already_billed');
    expect(sql).toContain("'source_kind', v_kind, 'source_id', v_ref_text");
    expect(sql).toContain('items @> jsonb_build_array');
    // Repeated inside one call is also billed once.
    expect(sql).toContain('v_key = ANY (v_seen_billed)');
  });

  it('flips billed labs out of the pending pool', () => {
    expect(sql).toContain("SET payment_status = 'billed'");
    expect(sql).toContain("AND payment_status = 'pending'");
  });

  it('drops the parallel appointment-completion bill (D3)', () => {
    expect(sql).toContain('DROP TRIGGER IF EXISTS trg_appointment_complete_billing ON public.appointments');
    expect(sql).toContain('DROP FUNCTION IF EXISTS public.create_billing_on_appointment_complete()');
  });
});

describe('Accumulation · clients discover medicine charges and surface the merge', () => {
  it('HospitalBilling discovers prescriptions by their real statuses, not the impossible "active"', () => {
    const src = readSrc('src/components/hospital/HospitalBilling.tsx');
    expect(src).not.toContain('eq("status", "active")');
    expect(src).toContain('in("status", ["pending", "filled", "partially_filled"])');
  });

  it('BillingStaffWorkflow discovers prescriptions by their real statuses too', () => {
    const src = readSrc('src/components/workflows/BillingStaffWorkflow.tsx');
    expect(src).not.toContain('eq("status", "active")');
    expect(src).toContain('in("status", ["pending", "filled", "partially_filled"])');
  });

  it('HospitalBilling reports appended bills and already-billed charges in plain language', () => {
    const src = readSrc('src/components/hospital/HospitalBilling.tsx');
    expect(src).toContain('already_billed');
    expect(src).toContain('not charged again');
    expect(src).toContain("the patient's bill now totals");
  });
});
