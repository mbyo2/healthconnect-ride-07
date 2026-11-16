import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Doc swarm clinical 2026-11-16 — ART cycle creation through the app's
// exact call shape (insert().select().single()) failed live with
// 403 42501 while insert-only succeeded (201). Root cause: PostgREST
// INSERT with return=representation re-checks the new row against the
// SELECT policy in the same statement, and the only SELECT policy routed
// through can_access_art_cycle(), whose self-table lookup runs under the
// statement snapshot and cannot see the row being inserted. Fixed by an
// additive creator-read SELECT policy evaluated directly on the RETURNING
// row (grants nothing new — the creator could already read via
// can_access_art_cycle). Live re-proof: app-shape insert returned 201
// with the row after the policy. These tests pin the fix.

const readSrc = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('Doc swarm clinical 2026-11-16 · ART cycle creator-read policy', () => {
  const mig = 'supabase/migrations/20261116_art_cycle_creator_read_policy.sql';

  it('migration exists and adds a creator-read SELECT policy on art_cycles', () => {
    expect(existsSync(resolve(process.cwd(), mig))).toBe(true);
    const sql = readSrc(mig);
    expect(sql).toContain('CREATE POLICY "ART cycle creator read"');
    expect(sql).toContain('ON public.art_cycles');
    expect(sql).toContain('FOR SELECT');
    expect(sql).toContain('(created_by = auth.uid())');
  });

  it('policy body does not inline a subquery against art_cycles (recursion fix intact)', () => {
    const sql = readSrc(mig);
    const code = sql
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n');
    expect(code).not.toContain('FROM art_cycles');
    expect(code).not.toContain('FROM art_cycle_staff');
    expect(code).not.toContain('can_access_art_cycle');
  });

  it('ARTModule still creates cycles with insert().select().single() — the shape the policy supports', () => {
    const src = readSrc('src/components/hospital/ARTModule.tsx');
    expect(src).toContain('.insert({');
    expect(src).toContain('}).select().single()');
  });

  it('strict function-based ART read policy is untouched', () => {
    const sql = readSrc('supabase/migrations/20261114_fix_art_cycle_rls_recursion.sql');
    expect(sql).toContain('public.can_access_art_cycle(id)');
  });

  it('patient "Active Prescriptions" counts comprehensive_prescriptions, not legacy pharmacy_prescriptions', () => {
    // Live-proven 2026-11-16: patient dashboard showed 0 while the patient
    // held 3 live prescriptions — every current writer (doctor
    // PrescriptionWriter, FHIR inbound) targets comprehensive_prescriptions;
    // pharmacy_prescriptions is only written by the legacy FHIRImportPanel.
    const src = readSrc('src/components/metrics/RoleMetricsDashboard.tsx');
    const start = src.indexOf('patient-comprehensive-prescription-count');
    expect(start).toBeGreaterThan(-1);
    const block = src.slice(start, start + 800);
    expect(block).toContain('.from("comprehensive_prescriptions"');
    expect(block).toContain('.in("status", ["pending", "filled", "partially_filled"])');
    expect(block).not.toContain('pharmacy_prescriptions');
  });

  it('patient vitals tile is labelled for what it counts (vital sign entries, not health records)', () => {
    const src = readSrc('src/components/metrics/RoleMetricsDashboard.tsx');
    expect(src).toContain('label="Vital Sign Entries"');
    expect(src).not.toContain('label="Health Records"');
  });
});
