import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// WSB security audit 2026-11-15 (Workstream B: Data, RLS & grants).
// Live-proven before the fix, then re-probed after (probe ids D9/D10/D13/
// D21 in workspace/audit-wsb/probes/):
//  - lookup_user_id_by_email returned ANY user's UUID to a plain patient.
//  - get_user_role returned ANY user's role to a plain patient.
//  - get_institution_compliance_status had NO auth check at all.
//  - merge_patients passed its auth gate for an institution admin merging
//    patients with no link to their institution.
//  - hospital_billing DELETE let ANY active staff member delete any bill.
// Source pins: the migration is the fix; these assertions keep a later
// migration from silently dropping the guards.

const MIGRATION = 'supabase/migrations/20261115_wsb_data_rls_fixes.sql';
const sql = readFileSync(resolve(process.cwd(), MIGRATION), 'utf8');

describe('WSB 2026-11-15 · merge_patients is institution-scoped', () => {
  it('requires both patients to be linked to an institution the caller administers', () => {
    expect(sql).toContain('Only administrators can merge patients outside their institution');
    expect(sql).toContain('institution_patients ip WHERE ip.institution_id = hi.id AND ip.patient_id = p_survivor');
    expect(sql).toContain('institution_patients ip WHERE ip.institution_id = hi.id AND ip.patient_id = p_duplicate');
    expect(sql).toContain('hi.admin_id = auth.uid()');
  });

  it('keeps platform-wide merge for platform admins', () => {
    expect(sql).toContain("has_role(auth.uid(), 'admin'::public.app_role)");
    expect(sql).toContain("has_role(auth.uid(), 'super_admin'::public.app_role)");
  });
});

describe('WSB 2026-11-15 · email-to-UUID oracle is staff-only', () => {
  it('lookup_user_id_by_email refuses plain signed-in users', () => {
    expect(sql).toContain('Not authorized to look up users by email');
    expect(sql).toContain('institution_staff s WHERE s.provider_id = v_caller');
    expect(sql).toContain('institution_personnel ip WHERE ip.user_id = v_caller');
  });

  it('keeps the service-role path for the send-email edge function', () => {
    expect(sql).toContain("COALESCE(auth.role(), '') = 'service_role'");
  });
});

describe('WSB 2026-11-15 · role lookups are self-or-admin', () => {
  it('get_user_role refuses other users for non-admins', () => {
    // The migration escapes the apostrophe (user''s) inside the SQL string
    // literal, so assert on the apostrophe-free prefix.
    expect(sql).toContain("Not authorized to read another user");
    expect(sql).toContain('has_admin_scope(auth.uid())');
  });

  it('get_user_roles carries the same guard', () => {
    const occurrences = sql.split("Not authorized to read another user").length - 1;
    expect(occurrences).toBe(2);
  });
});

describe('WSB 2026-11-15 · compliance status requires membership', () => {
  it('get_institution_compliance_status checks the caller belongs to the institution', () => {
    expect(sql).toContain('Not authorized for this institution');
    expect(sql).toContain('is_institution_member(p_institution_id)');
  });
});

describe('WSB 2026-11-15 · hospital bills cannot be deleted by any staff', () => {
  it('replaces the staff-wide DELETE policy with an admin/finance one', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "Institution staff delete hospital billing"');
    expect(sql).toContain('CREATE POLICY "Institution billing delete"');
    expect(sql).toContain('is_institution_finance_staff(hospital_id)');
    expect(sql).toContain('is_institution_admin(hospital_id)');
  });
});
