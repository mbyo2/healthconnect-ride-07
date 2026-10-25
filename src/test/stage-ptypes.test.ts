import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PRESCRIBING_ROLES } from '../config/roleConfig';

// Provider-types sweep (2026-10-25): all 27 professions exercised
// end-to-end with one QA patient. Four live defects were found and fixed;
// these pins keep the fixes from silently regressing. Each migration was
// applied live and proven behaviourally (see
// goals/doc0clock-clinic-launch/hidden_files/provider-types-matrix-2026-10-25.md).

const readSrc = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

describe('provider-types sweep · prescribing charter', () => {
  it('PRESCRIBING_ROLES is exactly the six-charter set', () => {
    expect([...PRESCRIBING_ROLES].sort()).toEqual([
      'clinical_officer', 'dentist', 'doctor', 'medical_licentiate', 'optometrist', 'specialist',
    ]);
  });

  it('prescriber helper ACL + profession check restored by migration', () => {
    const sql = readSrc('supabase/migrations/20261025_stageptypes_prescriber_acl_fix.sql');
    // Stage-C16 had revoked EXECUTE from authenticated, breaking every
    // prescription insert platform-wide (42501 inside the RLS policy).
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.is_verified_prescriber');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.asset_owner_institution');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.is_asset_shareable');
    // The helper itself now enforces the profession charter, not just
    // verification.
    for (const role of ['doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist', 'optometrist']) {
      expect(sql).toContain(role);
    }
  });

  it('prescription history policy covers optometrist; numbers cannot collide', () => {
    const sql = readSrc('supabase/migrations/20261025_stageptypes_rx_history_and_number_fix.sql');
    expect(sql).toContain('optometrist');
    expect(sql).toContain('random');
  });
});

describe('provider-types sweep · discovery + optical access', () => {
  it('provider_directory role list includes optician (the 27th profession)', () => {
    const sql = readSrc('supabase/migrations/20261025_stageptypes_directory_optician.sql');
    expect(sql).toContain("'optician'");
    expect(sql).toContain('provider_directory');
  });

  it('optometrists can manage optical records alongside opticians', () => {
    const sql = readSrc('supabase/migrations/20261025_stageptypes_optical_access_fix.sql');
    expect(sql).toContain('can_manage_optical');
    expect(sql).toContain('optometrist');
    expect(sql).toContain('eye_examinations');
  });
});

describe('provider-types sweep · dental charting persists', () => {
  it('dental_charts table + charter policies exist', () => {
    const sql = readSrc('supabase/migrations/20261025_stageptypes_dental_charts.sql');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.dental_charts');
    expect(sql).toContain('Dental providers manage own charts');
    expect(sql).toContain('Patients read own dental charts');
    expect(sql).toContain('dental_therapist');
  });

  it('DentistWorkflow saves charts to dental_charts against a chosen patient', () => {
    const src = readSrc('src/components/workflows/DentistWorkflow.tsx');
    expect(src).toContain('dental_charts');
    expect(src).toContain('Save Chart');
    expect(src).toContain('onConflict');
    // The prescriptions tile hides itself for non-prescribing charters
    // (dental therapists share this workflow).
    expect(src).toContain('canPrescribe');
  });

  it('dental therapists get the dental specialty tools', () => {
    const src = readSrc('src/pages/ProviderDashboard.tsx');
    expect(src).toContain("case 'dental_therapist': return <DentistWorkflow />");
    expect(src).toContain("'dental_therapist'");
  });
});

describe('provider-types sweep · late code-map findings', () => {
  it('NutritionistWorkflow saves diet plans in the live table shape', () => {
    const src = readSrc('src/components/workflows/NutritionistWorkflow.tsx');
    // Live diet_plans: diet_type is a lowercase CHECK domain and there are
    // no calories_per_day / meal_frequency / instructions / status
    // columns — the old payload ('Regular' + those columns) failed for
    // every nutritionist.
    expect(src).not.toContain("diet_type: 'Regular'");
    expect(src).toContain("diet_type: 'regular'");
    expect(src).toContain('notes: instructions');
    expect(src).not.toContain('calories_per_day:');
    expect(src).not.toContain("toast.error(e?.message");
  });

  it('HealthcareProfessionals mapper keeps role so Book can render', () => {
    const src = readSrc('src/pages/HealthcareProfessionals.tsx');
    expect(src).toContain('role: item.role');
  });
});
