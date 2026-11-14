import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Bug-free gate 2026-11-14 (advertising traffic landing): every defect below
// was PROVEN live with a QA-user JWT against production PostgREST before
// the fix (400 PGRST200 / 403 42501 / 500 42P17), and re-probed 200 after.
// These tests pin the fixed code + migrations so the defects cannot regress
// silently. Live behaviour is proven by the scripted PostgREST replay.

const readSrc = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('Gate 2026-11-14 · broken PostgREST embeds (400 PGRST200)', () => {
  it('StaffRoster: no profile:user_id embed (user_id -> auth.users, not profiles); profiles fetched separately', () => {
    const src = readSrc('src/components/hospital/StaffRoster.tsx');
    expect(src).not.toContain(".select('*, profile:user_id");
    expect(src).toContain(".from('profiles').select('id, first_name, last_name')");
  });

  it('RefillRequestsQueue: FK migration exists so the prescription embed resolves', () => {
    const mig = 'supabase/migrations/20261114_refill_requests_prescription_fk.sql';
    expect(existsSync(resolve(process.cwd(), mig))).toBe(true);
    const sql = readSrc(mig);
    expect(sql).toContain('prescription_refill_requests_prescription_id_fkey');
    expect(sql).toContain('REFERENCES public.comprehensive_prescriptions(id)');
    // The client embed itself is unchanged and now valid.
    expect(readSrc('src/components/provider/RefillRequestsQueue.tsx')).toContain(
      'prescription:prescription_id'
    );
  });

  it('ARTModule: no staff:staff_id embed (staff_id -> auth.users); only staff_id is rendered', () => {
    const src = readSrc('src/components/hospital/ARTModule.tsx');
    expect(src).not.toContain('.select("*, staff:staff_id');
    expect(src).toContain('.select("*").eq("cycle_id", cycle.id)');
  });

  it('LiveDeliveryTracker: no courier:couriers!delivery_tracking_driver_id_fkey embed; couriers fetched by user_id', () => {
    const src = readSrc('src/components/pharmacy/LiveDeliveryTracker.tsx');
    expect(src).not.toContain('courier:couriers!delivery_tracking_driver_id_fkey');
    expect(src).toContain('.from("couriers")');
    expect(src).toContain('.eq("user_id", data.driver_id)');
  });

  it('PatientFlowManagement: stage embed names its FK; patient names come from profiles, not an embed', () => {
    const src = readSrc('src/pages/PatientFlowManagement.tsx');
    expect(src).toContain('current_stage:patient_flow_stages!patient_flow_tracking_current_stage_id_fkey(*)');
    expect(src).not.toContain('patient:profiles!patient_id(first_name, last_name)');
    expect(src).not.toContain('current_stage:patient_flow_stages(*)');
    expect(src).toContain(".from(\"profiles\")");
  });

  it('EnhancedInventory: purchase orders embed procurement_suppliers(supplier_name), not suppliers(name)', () => {
    const src = readSrc('src/pages/EnhancedInventory.tsx');
    expect(src).not.toContain('supplier:suppliers(name)');
    expect(src).toContain('supplier:procurement_suppliers(supplier_name)');
    expect(src).toContain('order.supplier?.supplier_name');
  });
});

describe('Gate 2026-11-14 · second embed sweep (400 PGRST200, found by full-src audit)', () => {
  it('AppointmentReminders: FK migration exists so the appointments embed resolves', () => {
    const mig = 'supabase/migrations/20261114_appointment_reminders_fk.sql';
    expect(existsSync(resolve(process.cwd(), mig))).toBe(true);
    const sql = readSrc(mig);
    expect(sql).toContain('appointment_reminders_appointment_id_fkey');
    expect(sql).toContain('REFERENCES public.appointments(id)');
    expect(readSrc('src/components/booking/AppointmentReminders.tsx')).toContain(
      'appointments ('
    );
  });

  it('PatientInstitutionManager: no profiles!… embed on patient_id; profiles merged as `profiles`', () => {
    const src = readSrc('src/components/institution/PatientInstitutionManager.tsx');
    expect(src).not.toContain('profiles!patient_institution_links_patient_id_fkey');
    expect(src).toContain(".from(\"profiles\")");
    expect(src).toContain('profiles: profMap[r.patient_id]');
  });

  it('LISRadiologySuite: no patient embed on radiology_requests; lab_tests embed kept (valid)', () => {
    const src = readSrc('src/components/laboratory/LISRadiologySuite.tsx');
    expect(src).not.toContain('patient:profiles!radiology_requests_patient_id_fkey');
    expect(src).toContain('patient:profiles!lab_tests_patient_id_fkey(first_name, last_name)');
    expect(src).toContain('radRows');
  });

  it('CareTeamManagement: no patient embed; staff + role embeds kept (valid)', () => {
    const src = readSrc('src/pages/CareTeamManagement.tsx');
    expect(src).not.toContain('patient:profiles!patient_id(first_name, last_name)');
    expect(src).toContain('staff:profiles!staff_id(first_name, last_name, specialty)');
    expect(src).toContain('role:care_team_roles(*)');
    expect(src).toContain('patient: profMap[a.patient_id]');
  });

  it('EnhancedDiagnostics: no patient embed; ordering_provider embed kept (valid)', () => {
    const src = readSrc('src/pages/EnhancedDiagnostics.tsx');
    expect(src).not.toContain('patient:profiles!patient_id(first_name, last_name)');
    expect(src).toContain('ordering_provider:profiles!ordering_provider_id(first_name, last_name)');
    expect(src).toContain('patient: profMap[o.patient_id]');
  });

  it('EnhancedTelemedicine: no patient embeds on workflows or orders', () => {
    const src = readSrc('src/pages/EnhancedTelemedicine.tsx');
    expect(src).not.toContain('patient:profiles!patient_id(first_name, last_name)');
    expect(src).toContain('mergePatients');
  });

  it('ProcedureManagement: no patient embed on executions; procedure embed kept (valid)', () => {
    const src = readSrc('src/pages/ProcedureManagement.tsx');
    expect(src).not.toContain('patient:profiles!patient_id(first_name, last_name)');
    expect(src).toContain('procedure:clinical_procedures(*)');
    expect(src).toContain('patient: profMap[e.patient_id]');
  });

  it('useConnections: no profiles!… embeds on user_connections or primary_provider_assignments', () => {
    const src = readSrc('src/hooks/useConnections.ts');
    expect(src).not.toContain('profiles!user_connections_patient_id_fkey');
    expect(src).not.toContain('profiles!user_connections_provider_id_fkey');
    expect(src).not.toContain('profiles!primary_provider_assignments_provider_id_fkey');
    expect(src).toContain('personMap[r.patient_id]');
    expect(src).toContain('personMap[r.provider_id]');
  });
});

describe('Gate 2026-11-14 · broken RLS policies (403 42501 / 500 42P17)', () => {
  it('RLS fix migration exists and drops the auth.users template + rebuilds on the helper', () => {
    const mig = 'supabase/migrations/20261114_fix_auth_users_rls_policies.sql';
    expect(existsSync(resolve(process.cwd(), mig))).toBe(true);
    const sql = readSrc(mig);
    const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(sql).toContain('user_affiliated_with_institution(institution_id)');
    expect(code).not.toContain('FROM auth.users');
    expect(sql).toContain('DROP POLICY IF EXISTS "Users can view asset records"');
    expect(sql).toContain('DROP POLICY IF EXISTS "Users can view shift assignments"');
    // paye_tax_slabs keeps its NULL-institution carve-out on SELECT.
    expect(sql).toContain('(institution_id IS NULL) OR public.user_affiliated_with_institution(institution_id)');
  });

  it('ART recursion migration exists and routes the three policies through can_access_art_cycle', () => {
    const mig = 'supabase/migrations/20261114_fix_art_cycle_rls_recursion.sql';
    expect(existsSync(resolve(process.cwd(), mig))).toBe(true);
    const sql = readSrc(mig);
    expect(sql).toContain('public.can_access_art_cycle(cycle_id)');
    expect(sql).toContain('public.can_access_art_cycle(id)');
    expect(sql).not.toContain('FROM art_cycles c');
    expect(sql).not.toContain('FROM art_cycle_staff s');
    expect(sql).not.toContain('FROM art_cycle_staff s2');
  });

  it('no policy body inlines an auth.users subquery (comment header aside)', () => {
    // Guardrail: the inline-auth.users template must not come back.
    const sql = readSrc('supabase/migrations/20261114_fix_auth_users_rls_policies.sql');
    const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(code.match(/auth\.users/g) || []).toHaveLength(0);
  });
});
