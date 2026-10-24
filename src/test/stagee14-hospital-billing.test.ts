import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// The REAL payload builders the client sends — not mirrors.
import {
  buildHospitalBillLines,
  chargePreviewTotal,
  matchServiceOrdered,
  selectedChargesTotal,
  unpricedCharges,
  type AssembledCharge,
} from '@/lib/hospitalBilling';
import type { PricedService } from '@/lib/invoicePricing';

const readSrc = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

const MIGRATION = 'supabase/migrations/20261025_stagee14_hospital_billing_server_pricing.sql';

const services: PricedService[] = [
  { id: 'svc-consult', service_code: 'CONSULT', service_label: 'General Consultation', base_price: 150, category: 'opd', institution_id: 'inst-a' },
  { id: 'svc-lab', service_code: 'LAB-FBC', service_label: 'Full Blood Count', base_price: 100, category: 'lab', institution_id: null },
  { id: 'svc-bed-gen', service_code: 'WARD-GEN', service_label: 'General Ward Bed (per day)', base_price: 200, category: 'ward', institution_id: 'inst-a' },
  { id: 'svc-bed-semi', service_code: 'WARD-SEMI', service_label: 'Semi-Private Room (per day)', base_price: 450, category: 'ward', institution_id: 'inst-a' },
];

const charge = (over: Partial<AssembledCharge>): AssembledCharge => ({
  key: 'k',
  category: 'Test',
  description: 'charge',
  quantity: 1,
  selected: true,
  ...over,
});

describe('E-14 · bill payload carries ids + quantities + sources only', () => {
  it('strips every price/total/percentage field a charge object may carry', () => {
    const payload = buildHospitalBillLines([
      charge({
        service: services[0],
        source_kind: 'appointment',
        source_id: 'appt-1',
        // hostile extras a tampered client might attach
        ...({ unit_price: 0.01, amount: 0.01, total: 0.01, coverage_percentage: 100 } as any),
      }),
      charge({ service: services[1], quantity: 2 }),
    ]);
    expect(payload).toEqual([
      { service_pricing_id: 'svc-consult', quantity: 1, source_kind: 'appointment', source_id: 'appt-1' },
      { service_pricing_id: 'svc-lab', quantity: 2 },
    ]);
    for (const line of payload) {
      for (const key of Object.keys(line)) {
        expect(['service_pricing_id', 'quantity', 'source_kind', 'source_id']).toContain(key);
      }
    }
  });

  it('excludes unselected and unmatched (not-on-price-list) charges', () => {
    const payload = buildHospitalBillLines([
      charge({ service: services[0], selected: false }),
      charge({ service: undefined }),
      charge({ service: services[1] }),
    ]);
    expect(payload).toEqual([{ service_pricing_id: 'svc-lab', quantity: 1 }]);
  });

  it('clamps quantities to whole units of at least 1', () => {
    expect(buildHospitalBillLines([charge({ service: services[0], quantity: 0 })])).toEqual([
      { service_pricing_id: 'svc-consult', quantity: 1 },
    ]);
    expect(buildHospitalBillLines([charge({ service: services[0], quantity: 3.6 })])).toEqual([
      { service_pricing_id: 'svc-consult', quantity: 4 },
    ]);
  });
});

describe('E-14 · preview prices come from the catalogue and ADD UP', () => {
  it('line preview = quantity × catalogue base_price', () => {
    expect(chargePreviewTotal(charge({ service: services[3], quantity: 3 }))).toBe(1350);
    expect(chargePreviewTotal(charge({ service: undefined, quantity: 3 }))).toBe(0);
  });

  it('selected total sums individually priced services (CEO billing rule)', () => {
    const total = selectedChargesTotal([
      charge({ service: services[0] }),                    // 150
      charge({ service: services[1], quantity: 2 }),       // 200
      charge({ service: services[3], selected: false }),   // excluded
      charge({ service: undefined }),                       // unmatched — never priced
    ]);
    expect(total).toBe(350);
  });

  it('ordered matching prefers the specific bed type over the generic ward row', () => {
    const hit = matchServiceOrdered(services, 'semi-private', 'semi private', 'ward', 'bed');
    expect(hit?.id).toBe('svc-bed-semi');
  });

  it('unpricedCharges reports exactly the unmatched charges', () => {
    const list = [charge({ service: services[0] }), charge({ service: undefined, description: 'Mystery charge' })];
    expect(unpricedCharges(list).map((c) => c.description)).toEqual(['Mystery charge']);
  });
});

describe('E-14 · migration moves all money server-side', () => {
  const sql = readSrc(MIGRATION);

  it('create_hospital_bill is SECURITY DEFINER with a pinned search_path', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.create_hospital_bill');
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain("SET search_path TO 'public'");
  });

  it('the RPC has no client money parameters (no price, no split channel)', () => {
    const signature = sql.slice(sql.indexOf('FUNCTION public.create_hospital_bill'), sql.indexOf('RETURNS jsonb'));
    for (const forbidden of ['price', 'amount', 'total', 'percentage', 'portion', 'split']) {
      expect(signature.toLowerCase()).not.toContain(forbidden);
    }
  });

  it('prices lines from service_pricing scoped to own + platform rows', () => {
    expect(sql).toContain('FROM public.service_pricing');
    expect(sql).toContain('institution_id = p_hospital_id OR institution_id IS NULL');
    expect(sql).toContain('is_active = true');
  });

  it('insurance split derives from the policy row + server-held terms', () => {
    expect(sql).toContain('FROM public.insurance_information');
    expect(sql).toContain('FROM public.insurance_coverage_terms');
    expect(sql).toContain('greatest(round(v_subtotal - v_insurer, 2), 0)');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.insurance_coverage_terms');
  });

  it('hospital_billing loses its client INSERT path but keeps read/update/delete', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "Institution admins manage hospital billing" ON public.hospital_billing');
    expect(sql).toContain('FOR SELECT TO authenticated');
    expect(sql).toContain('FOR UPDATE TO authenticated');
    expect(sql).toContain('FOR DELETE TO authenticated');
    expect(sql).not.toContain('ON public.hospital_billing FOR INSERT');
  });

  it('RPCs are not executable by PUBLIC or anon', () => {
    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.create_hospital_bill(uuid, uuid, jsonb, uuid, date) FROM PUBLIC, anon');
    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.list_patient_insurance(uuid, uuid) FROM PUBLIC, anon');
    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.ensure_hospital_billing_draft(uuid, uuid) FROM PUBLIC, anon');
  });
});

describe('E-14 · clients no longer write money into hospital_billing', () => {
  it('HospitalBilling calls create_hospital_bill and never inserts directly', () => {
    const src = readSrc('src/components/hospital/HospitalBilling.tsx');
    expect(src).toContain('create_hospital_bill');
    expect(src).toContain('list_patient_insurance');
    expect(src).not.toContain('from("hospital_billing" as any).insert');
    expect(src).not.toContain('from("insurance_claims")');
  });

  it('HospitalBilling has no tariff fallbacks or client insurance percentages', () => {
    const src = readSrc('src/components/hospital/HospitalBilling.tsx');
    expect(src).not.toContain('resolveTariffPrice');
    expect(src).not.toContain('fetchInstitutionTariffs');
    expect(src).not.toContain('institution_procedure_pricing');
    expect(src).not.toContain('coverage_percentage');
    expect(src).not.toContain('InstitutionInsuranceVerification');
  });

  it('discharge drafts go through the RPC, not a direct insert', () => {
    const src = readSrc('src/services/dischargeWorkflow.ts');
    expect(src).toContain('ensure_hospital_billing_draft');
    expect(src).not.toContain('.insert(');
  });
});
