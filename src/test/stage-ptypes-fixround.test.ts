import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isPatientRecordAccessible } from '../utils/patientRecordAccess';

// Provider-types fix round (2026-10-25, rendered-sampling follow-up).
// Three rendered-observed defects:
//  1. Specialty modules that WORK were still labelled "COMING SOON" in
//     My Practice Modules — the label is provider_module_charter.status;
//     the fix is a data migration flipping the proven specialty modules.
//  2. The Diet Plan Builder (and the midwife ANC form) rendered the raw
//     patient UUID in the patient selector: both read
//     `p.full_name || p.email || p.id` off useHospitalPatients results,
//     whose contract is { id, name, source } — so the label always fell
//     through to the raw id.
//  3. "My Patients" (PatientRecords) showed "No patient records yet" for
//     every provider: it filtered through checkProviderAccess and read a
//     non-existent `.allowed` property, and the util's institution layer
//     requires patient_institution_links rows (zero platform-wide).

const readSrc = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

describe('fix 2 · patient selectors show the patient name, never a raw UUID', () => {
  const broken = '{p.full_name || p.email || p.id}';

  it('NutritionistWorkflow diet-plan selector renders the hook name field', () => {
    const src = readSrc('src/components/workflows/NutritionistWorkflow.tsx');
    expect(src).not.toContain(broken);
    expect(src).toContain('<option key={p.id} value={p.id}>{p.name}</option>');
  });

  it('MidwifeWorkflow ANC selector renders the hook name field', () => {
    const src = readSrc('src/components/workflows/MidwifeWorkflow.tsx');
    expect(src).not.toContain(broken);
    expect(src).toContain('<option key={p.id} value={p.id}>{p.name}</option>');
  });

  it('the shared hook contract is { id, name, source } resolved from profiles', () => {
    const hook = readSrc('src/hooks/useHospitalPatients.ts');
    expect(hook).toContain('name: nameMap[id]');
    expect(hook).toContain("from('profiles' as any)");
  });
});

describe('fix 3 · My Patients display gate (patientRecordAccess)', () => {
  it('a care relationship alone is enough (the nutritionist case)', () => {
    expect(isPatientRecordAccessible({
      hasRelationship: true, hasActiveGrant: false, hasOwnRecord: false,
    })).toBe(true);
  });

  it('an active break-the-glass grant alone is enough', () => {
    expect(isPatientRecordAccessible({
      hasRelationship: false, hasActiveGrant: true, hasOwnRecord: false,
    })).toBe(true);
  });

  it('authorship of a visible record alone is enough (the doctor case)', () => {
    expect(isPatientRecordAccessible({
      hasRelationship: false, hasActiveGrant: false, hasOwnRecord: true,
    })).toBe(true);
  });

  it('no link at all stays out — the gate still gates', () => {
    expect(isPatientRecordAccessible({
      hasRelationship: false, hasActiveGrant: false, hasOwnRecord: false,
    })).toBe(false);
  });

  it('PatientRecords is wired to the gate, not the broken util property', () => {
    const src = readSrc('src/components/provider/PatientRecords.tsx');
    expect(src).not.toContain('provider-patient-access');
    expect(src).not.toContain('await checkProviderAccess');
    expect(src).not.toContain('access.allowed');
    expect(src).toContain('isPatientRecordAccessible');
    expect(src).toContain("rpc('has_patient_relationship'");
    // provider_id must be selected or the authorship signal can never fire
    expect(src).toContain('provider_id,');
  });
});

describe('fix 1 · charter label migration flips exactly the proven specialty modules', () => {
  const migration = readSrc('supabase/migrations/20261025_stageptypes_fixround_charter_labels.sql');
  const inList = migration.slice(migration.indexOf('AND (provider_type, module_key) IN ('));

  const flips: Array<[string, string]> = [
    ['dentist', 'dental_chart'],
    ['dental_therapist', 'dental_chart'],
    ['nutritionist', 'nutrition_plans'],
    ['optometrist', 'vision_tests'],
    ['optician', 'optical_dispensing'],
    ['midwife', 'anc_register'],
    ['nurse', 'vitals'],
    ['registered_nurse', 'vitals'],
    ['enrolled_nurse', 'vitals'],
    ['radiographer', 'imaging_queue'],
    ['radiologist', 'imaging_queue'],
    ['physiotherapist', 'rehab_plans'],
  ];

  it.each(flips)('flips %s / %s to live', (providerType, moduleKey) => {
    expect(inList).toContain(`('${providerType}', '${moduleKey}')`);
  });

  it('only flips rows still marked planned (idempotent, no live row rewritten)', () => {
    expect(migration).toContain("WHERE status = 'planned'");
    expect(migration).toContain("SET status = 'live'");
  });

  it('leaves genuinely-unbuilt modules planned', () => {
    // No UI writer / institution-mediated only — flipping these would be
    // a new false label.
    expect(inList).not.toContain('referrals');
    expect(inList).not.toContain('reports');
    expect(inList).not.toContain('ward_rounds');
    expect(inList).not.toContain('field_visits');
    expect(inList).not.toContain("('psychologist', 'therapy_notes')");
    expect(inList).not.toContain("('occupational_therapist', 'rehab_plans')");
  });

  it('does not flip vitals for professions with no vitals-capture writer', () => {
    expect(inList).not.toContain("('doctor', 'vitals')");
    expect(inList).not.toContain("('specialist', 'vitals')");
    expect(inList).not.toContain("('clinical_officer', 'vitals')");
    expect(inList).not.toContain("('medical_licentiate', 'vitals')");
    expect(inList).not.toContain("('midwife', 'vitals')");
  });
});
