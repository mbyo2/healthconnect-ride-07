import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Billing completeness (CEO rule, 2026-10-29): EVERYTHING an
// institution charges for must be added to the patient's bill WITH
// its price. The sweep found the institution's managed price books
// (service_tariffs, institution_procedure_pricing) were invisible to
// the bill engine, and eight chargeable event families (theatre
// surgeries, emergency cases, deliveries, issued blood, day care,
// specialist sessions, eye exams, ambulance trips) had no path to
// the bill at all. These tests pin the fix's shape; behaviour is
// proven live by the scripted PostgREST proof run with this change.

const readSrc = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

const MIGRATION = 'supabase/migrations/20261030_billing_completeness.sql';
const BILLING = 'src/components/hospital/HospitalBilling.tsx';

describe('Completeness · the managed price books reach the bill engine', () => {
  const sql = readSrc(MIGRATION);

  it('mirrors service_tariffs into service_pricing on insert, update and delete', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.mirror_tariff_to_pricing()');
    expect(sql).toContain('CREATE TRIGGER trg_mirror_tariff_to_pricing');
    expect(sql).toContain('AFTER INSERT OR UPDATE OR DELETE ON public.service_tariffs');
    expect(sql).toContain('AND service_code = NEW.code');
  });

  it('mirrors institution procedure pricing under a PROC- code with the catalogue name', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.mirror_procedure_pricing_to_pricing()');
    expect(sql).toContain('CREATE TRIGGER trg_mirror_procedure_pricing');
    expect(sql).toContain("SELECT 'PROC-' || procedure_code, procedure_name, category");
  });

  it('mirror functions are SECURITY DEFINER with a pinned search_path and no public execute', () => {
    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.mirror_tariff_to_pricing() FROM PUBLIC, anon, authenticated');
    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.mirror_procedure_pricing_to_pricing() FROM PUBLIC, anon, authenticated');
    expect(sql.match(/SECURITY DEFINER/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('deleting a book row deactivates the mirror instead of hard-deleting history', () => {
    expect(sql).toContain("IF TG_OP = 'DELETE' THEN");
    expect(sql).toContain('SET is_active = false, updated_at = now()');
  });

  it('backfills both books into service_pricing idempotently', () => {
    expect(sql).toContain('FOR r IN SELECT * FROM public.service_tariffs LOOP');
    expect(sql).toContain('FROM public.institution_procedure_pricing ipp');
  });
});

describe('Completeness · ambulance trips gain a patient link', () => {
  const sql = readSrc(MIGRATION);

  it('adds patient_id to ambulance_dispatches', () => {
    expect(sql).toContain('ALTER TABLE public.ambulance_dispatches');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.profiles(id)');
  });

  it('the dispatch form links the trip to the roster patient and passes the id through', () => {
    const form = readSrc('src/components/workflows/AmbulanceStaffWorkflow.tsx');
    expect(form).toContain('InstitutionPatientPicker');
    expect(form).toContain('patient_id: pickedPatient?.id ?? null');
    const hook = readSrc('src/hooks/useAmbulanceDispatch.ts');
    expect(hook).toContain('patient_id: string | null;');
  });
});

describe('Completeness · create_hospital_bill validates the new charge sources', () => {
  const sql = readSrc(MIGRATION);

  it.each([
    ['ot_surgery', 'public.ot_surgeries', 'institution_id'],
    ['emergency_case', 'public.emergency_cases', 'hospital_id'],
    ['delivery', 'public.deliveries', 'institution_id'],
    ['blood_request', 'public.blood_bank_requests', 'hospital_id'],
    ['day_care_procedure', 'public.day_care_procedures', 'hospital_id'],
    ['specialist_session', 'public.specialist_sessions', 'institution_id'],
    ['eye_examination', 'public.eye_examinations', 'institution_id'],
    ['ambulance_dispatch', 'public.ambulance_dispatches', 'institution_id'],
  ])('validates %s against its table, patient and institution', (kind, table, instCol) => {
    expect(sql).toContain(`ELSIF v_kind = '${kind}' THEN`);
    expect(sql).toContain(`FROM ${table}`);
    expect(sql).toContain(`patient_id = p_patient_id AND ${instCol} = p_hospital_id`);
  });

  it('keeps the till/bill guard and the append path from the missions it builds on', () => {
    expect(sql).toContain('prescription_till_paid');
    expect(sql).toContain("'already_paid_at_till', v_already_paid");
    expect(sql).toContain("'appended', v_has_open");
  });

  it('keeps the bed-night segment ledger from the bed mission it rebased onto', () => {
    expect(sql).toContain("v_kind = 'bed_segment'");
    expect(sql).toContain('admission_bed_segments');
  });

  it('keeps the unpriced guarantee: unpriced lines are reported, never billed at 0', () => {
    expect(sql).toContain("'unpriced', v_unpriced");
    expect(sql).toContain('None of the selected charges have a price set yet');
  });
});

describe('Completeness · the billing assembly discovers every chargeable event', () => {
  const src = readSrc(BILLING);

  it.each([
    ['ot_surgeries', 'ot_surgery', '"completed"'],
    ['emergency_cases', 'emergency_case', '"discharged", "admitted"'],
    ['deliveries', 'delivery', 'delivery_type'],
    ['blood_bank_requests', 'blood_request', '"issued"'],
    ['day_care_procedures', 'day_care_procedure', '"completed"'],
    ['specialist_sessions', 'specialist_session', '"completed"'],
    ['eye_examinations', 'eye_examination', 'eye_examinations'],
    ['ambulance_dispatches', 'ambulance_dispatch', '"delivered", "completed"'],
  ])('discovers %s and bills it as %s', (table, kind, marker) => {
    expect(src).toContain(`from("${table}"`);
    expect(src).toContain(`source_kind: "${kind}"`);
    expect(src).toContain(marker);
  });

  it('prices blood per unit issued', () => {
    expect(src).toContain('quantity: Math.max(1, Number(b.units_required) || 1)');
    expect(src).toContain('matchServiceOrdered(services, "transfusion", "blood")');
  });

  it('prices ambulance trips from the price list', () => {
    expect(src).toContain('matchServiceOrdered(services, "ambulance")');
  });

  it('unmatched events still surface as not-on-the-price-list with the quick-create path', () => {
    expect(src).toContain('unpricedCharges(pendingPatientCharges)');
    expect(src).toContain('setPricingCharge');
    expect(src).toContain('are not on the price list and cannot be billed yet');
  });
});

describe('Completeness · theatre bookings carry the patient master id', () => {
  it('the OT schedule form picks from the roster and stores patient_id', () => {
    const ot = readSrc('src/components/hospital/OTManagement.tsx');
    expect(ot).toContain('InstitutionPatientPicker');
    expect(ot).toContain('patient_id: pickedPatient?.id ?? null');
  });
});
