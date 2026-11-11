/**
 * Audit-trail hardening pins (2026-11-11): D2, D3, D4, D5 from the
 * audit-trail verification's report-only list.
 *
 * Source pins: the fixes must stay in the tree — a future edit that
 * re-opens the security_events ALL policy, drops the grant revokes or
 * immutability triggers, removes the pricing audit triggers, or reverts
 * the client logger to the RLS-dead direct insert fails here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const migration = read('supabase/migrations/20261111_audit_trail_hardening.sql');

// ── D3: security_events narrowed to SELECT + UPDATE for admins ──────
describe('D3 · security_events policy narrowing', () => {
  it('drops the ALL policy', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Admins can manage security events" ON public.security_events');
  });

  it('grants admins SELECT and UPDATE (resolution) only — no ALL, no DELETE policy', () => {
    expect(migration).toContain('"Admins can view all security events" ON public.security_events');
    expect(migration).toContain('FOR SELECT TO public');
    expect(migration).toContain('"Admins can resolve security events" ON public.security_events');
    expect(migration).toContain('FOR UPDATE TO public');
    expect(migration).not.toMatch(/CREATE POLICY[^;]*ON public\.security_events[^;]*FOR (ALL|DELETE|INSERT)/);
  });
});

// ── D2: grant revokes + role-scoped immutability ────────────────────
describe('D2 · audit-table defence in depth', () => {
  it('revokes UPDATE/DELETE on audit_logs and security_audit_log, keeping client INSERT', () => {
    expect(migration).toContain('REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated');
    expect(migration).toContain('REVOKE UPDATE, DELETE ON public.security_audit_log FROM authenticated');
    expect(migration).not.toContain('REVOKE INSERT, UPDATE, DELETE ON public.audit_logs');
    expect(migration).not.toContain('REVOKE INSERT, UPDATE, DELETE ON public.security_audit_log');
  });

  it('revokes INSERT/UPDATE/DELETE on medical_record_audit and patient_access_audit', () => {
    expect(migration).toContain('REVOKE INSERT, UPDATE, DELETE ON public.medical_record_audit FROM authenticated');
    expect(migration).toContain('REVOKE INSERT, UPDATE, DELETE ON public.patient_access_audit FROM authenticated');
  });

  it('immutability triggers exist and are scoped to API roles (service/SQL paths stay open)', () => {
    expect(migration).toContain('trg_block_security_audit_log_mutation');
    expect(migration).toContain('trg_block_medical_record_audit_mutation');
    expect(migration).toContain("current_user IN ('anon', 'authenticated')");
    expect(migration).toContain('Audit records are immutable');
  });
});

// ── D5: pricing / fee / config change logging ───────────────────────
describe('D5 · pricing audit triggers', () => {
  it('audits all three pricing tables into security_audit_log with old/new payloads', () => {
    for (const tbl of ['commission_settings', 'service_pricing', 'institution_procedure_pricing']) {
      expect(migration).toContain(`ON public.${tbl}`);
      expect(migration).toContain(`'${tbl}_changed'`);
    }
    expect(migration).toContain("'old', CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END");
    expect(migration).toContain("'new', CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END");
  });
});

// ── D4: failed-sign-in capture ──────────────────────────────────────
describe('D4 · record_security_event RPC and client rewire', () => {
  it('migration defines an insert-only SECURITY DEFINER RPC granted to anon + authenticated, never PUBLIC', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.record_security_event(');
    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain('REVOKE EXECUTE ON FUNCTION public.record_security_event(text, jsonb, text, text) FROM PUBLIC');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.record_security_event(text, jsonb, text, text) TO anon, authenticated');
    expect(migration).toContain("'login_failure'");
  });

  it('security-service logs through the RPC — no direct insert, no session early-return', () => {
    const src = read('src/utils/security-service.ts');
    expect(src).toContain("rpc('record_security_event'");
    expect(src).not.toContain(".from('security_audit_log')");
    // Scope the session check to logSecurityEvent itself: other helpers in
    // the file (validateResourceAccess) legitimately bail without a session.
    const fnStart = src.indexOf('export const logSecurityEvent');
    const fnBody = src.slice(fnStart, src.indexOf('};', fnStart));
    expect(fnBody).not.toContain('getSession');
    expect(fnBody).not.toContain('if (!session)');
    expect(fnBody).toContain('p_event_type: action');
  });

  it('AuthForm logs LOGIN_FAILURE on a rejected sign-in', () => {
    const src = read('src/components/auth/AuthForm.tsx');
    expect(src).toContain('logSecurityEvent(SecurityEvents.LOGIN_FAILURE');
  });
});
