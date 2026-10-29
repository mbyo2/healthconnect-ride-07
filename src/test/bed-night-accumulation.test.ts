import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Bed-night accumulation (CEO 2026-10-29): "If they charge for bed
// care per night and a person stays there for more than one night add
// all of them on the bill." Before this change the day count was
// computed in the browser (elapsed 24h periods, current bed only,
// still-admitted stays only) and the already-billed guard froze an
// interim-billed bed line at its first quantity. These tests pin the
// migration's shape; behaviour is proven live by the scripted
// PostgREST proof (exact figures) run with this change.

const readSrc = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

const MIGRATION = 'supabase/migrations/20261029_zz_bed_night_accumulation.sql';

describe('Bed nights · the segment ledger', () => {
  const sql = readSrc(MIGRATION);

  it('creates admission_bed_segments with RLS and scoped grants (Oct-30 rule)', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.admission_bed_segments');
    expect(sql).toContain('ALTER TABLE public.admission_bed_segments ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('GRANT SELECT ON public.admission_bed_segments TO authenticated');
    expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_bed_segments TO service_role');
    expect(sql).not.toContain('GRANT SELECT ON public.admission_bed_segments TO public');
    // One open segment per admission at most.
    expect(sql).toContain('uq_admission_bed_segments_open');
    expect(sql).toContain('WHERE segment_end IS NULL');
  });

  it('keeps the ledger exact with a trigger on every admission write path', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.sync_admission_bed_segment()');
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain('CREATE TRIGGER trg_sync_admission_bed_segment');
    expect(sql).toContain('AFTER INSERT OR UPDATE OF bed_id, discharge_date, status ON public.hospital_admissions');
  });

  it('backfills existing admissions and credits legacy admission-sourced nights', () => {
    expect(sql).toContain('INSERT INTO public.admission_bed_segments');
    expect(sql).toContain("it ->> 'source_kind' = 'admission'");
    expect(sql).toContain('SET nights_billed = (');
  });
});

describe('Bed nights · the one server-side night-count rule', () => {
  const sql = readSrc(MIGRATION);

  it('counts midnights crossed on Africa/Lusaka dates, minus nights already billed', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.admission_segment_nights_due(p_segment_id uuid)');
    expect(sql).toContain("AT TIME ZONE 'Africa/Lusaka')::date");
    expect(sql).toContain('RETURN greatest(v_nights - v_seg.nights_billed, 0);');
  });

  it('keeps the minimum-one-night rule for a completed stay that crossed no midnight', () => {
    expect(sql).toContain('v_adm.discharge_date IS NOT NULL AND v_nights = 0');
    expect(sql).toContain('v_nights := 1;');
  });

  it('is executable by the billing team but not the public', () => {
    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.admission_segment_nights_due(uuid) FROM PUBLIC, anon');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.admission_segment_nights_due(uuid) TO authenticated, service_role');
  });
});

describe('Bed nights · create_hospital_bill tops up instead of freezing', () => {
  const sql = readSrc(MIGRATION);

  it('keeps the E-14 contract: SECURITY DEFINER, no client money parameters, price-list pricing', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.create_hospital_bill');
    expect(sql).toContain('SECURITY DEFINER');
    const signature = sql.slice(sql.indexOf('FUNCTION public.create_hospital_bill'), sql.indexOf('RETURNS jsonb'));
    for (const forbidden of ['price', 'amount', 'total', 'percentage', 'portion', 'split']) {
      expect(signature.toLowerCase()).not.toContain(forbidden);
    }
    expect(sql).toContain('FROM public.service_pricing');
  });

  it('carries the till-guard branch too (this migration is the last word on the function)', () => {
    // Both this migration and 20261029_till_bill_double_charge_guard
    // replace create_hospital_bill; this copy was patched from the
    // live function after the guard deployed and must keep its
    // branch, or a replay would lose one of the two features.
    expect(sql).toContain('already_paid_at_till');
    expect(sql).toContain('v_already_paid');
  });

  it('validates bed_segment lines against the segment ledger', () => {
    expect(sql).toContain("ELSIF v_kind = 'bed_segment' THEN");
    expect(sql).toContain('FROM public.admission_bed_segments');
    expect(sql).toContain('That bed stay does not belong to this patient at this hospital.');
  });

  it('computes the quantity on the server and advances nights_billed in the same transaction', () => {
    expect(sql).toContain('v_delta := public.admission_segment_nights_due(v_ref);');
    expect(sql).toContain('v_qty := v_delta;');
    expect(sql).toContain('UPDATE public.admission_bed_segments');
    expect(sql).toContain('SET nights_billed = nights_billed + v_qty, updated_at = now()');
  });

  it('exempts bed lines from the already-billed guard but reports no-new-nights plainly', () => {
    expect(sql).toContain('IF NOT v_is_bed AND FOUND THEN');
    expect(sql).toContain("'reason', 'No new bed nights to charge for this stay yet.'");
  });

  it('stamps each bed line with its segment audit trail', () => {
    expect(sql).toContain("'nights_billed_before', v_bed_before");
    expect(sql).toContain("'nights_billed_total', v_bed_before + v_qty");
    expect(sql).toContain("'bed_type', v_seg.bed_type");
  });
});

describe('Bed nights · the billing assembly discovers segments, not browser day math', () => {
  const src = readSrc('src/components/hospital/HospitalBilling.tsx');

  it('discovers bed segments for the patient (admitted and discharged stays alike)', () => {
    expect(src).toContain('admission_bed_segments');
    expect(src).toContain('admission_segment_nights_due');
    expect(src).not.toContain('eq("status", "admitted")');
  });

  it('sends bed_segment lines keyed to the segment, never admission lines with browser-computed days', () => {
    expect(src).toContain('source_kind: "bed_segment"');
    expect(src).not.toContain('source_kind: "admission"');
    expect(src).not.toContain('86400000');
    expect(src).not.toContain('Math.ceil((Date.now()');
  });
});
