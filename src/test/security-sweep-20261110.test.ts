/**
 * Security-sweep fix pins (2026-11-10): H-1, M-4, M-5, L-1, L-5, L-6 + deps.
 *
 * Two kinds of pins here:
 *  - behavioural unit tests (de-identifier; settle.ts platform-only path
 *    against a fake admin whose rpc() emulates the live RPC semantics),
 *  - source pins (the fix must stay in the file — a future edit that
 *    drops the rate-limit call or re-introduces raw error text fails).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deidentifyText, deidentifyScribeInput } from '../../supabase/functions/_shared/deidentify';
import { settlePayment } from '../../supabase/functions/_shared/settle';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

// ── M-4: de-identification ──────────────────────────────────────────

describe('deidentifyText (M-4)', () => {
  it('scrubs email, phone, NRC, labelled name and addresses', () => {
    const { text, redactions } = deidentifyText(
      'Patient: Jane Banda called on 0971234567, email jane@example.com, ' +
      'NRC 123456/12/1, lives at 12 Independence Avenue, Plot 456.',
    );
    expect(text).not.toContain('Jane Banda');
    expect(text).not.toContain('0971234567');
    expect(text).not.toContain('jane@example.com');
    expect(text).not.toContain('123456/12/1');
    expect(text).not.toContain('12 Independence Avenue');
    expect(text).not.toContain('Plot 456');
    expect(text).toContain('Patient: [NAME]');
    expect(text).toContain('[PHONE]');
    expect(text).toContain('[EMAIL]');
    expect(text).toContain('[NRC]');
    expect(text).toContain('[ADDRESS]');
    expect(redactions).toBeGreaterThanOrEqual(6);
  });

  it('scrubs "my name is", honorifics and DOB', () => {
    const { text } = deidentifyText(
      'Hello, my name is Chanda Mwila. Mr Banda brought me. DOB 12/03/1980. Dr. Jane Mwila examined me.',
    );
    expect(text).not.toContain('Chanda Mwila');
    expect(text).not.toContain('Mr Banda');
    expect(text).not.toContain('12/03/1980');
    expect(text).not.toContain('Jane Mwila');
    expect(text).toContain('my name is [NAME]');
    expect(text).toContain('[DOB]');
  });

  it('scrubs +260 international numbers and leaves vitals alone', () => {
    const { text, redactions } = deidentifyText(
      'Reach me on +260 97 123 4567. BP 120/80, temperature 37.5, pulse 72, takes 500mg twice daily.',
    );
    expect(text).not.toContain('+260');
    expect(text).not.toContain('97 123 4567');
    expect(text).toContain('BP 120/80');
    expect(text).toContain('temperature 37.5');
    expect(text).toContain('pulse 72');
    expect(text).toContain('500mg');
    expect(redactions).toBe(1);
  });

  it('leaves clean clinical text untouched', () => {
    const { text, redactions } = deidentifyText(
      'Patient reports headache for 3 days, fever, cough. Prescribed paracetamol 500mg.',
    );
    expect(redactions).toBe(0);
    expect(text).toContain('headache for 3 days');
    expect(text).toContain('paracetamol 500mg');
  });

  it('deidentifyScribeInput scrubs transcript and context together', () => {
    const out = deidentifyScribeInput({
      transcript: 'Patient: John Phiri has a cough. Call 0961111111.',
      patient_context: 'Guardian Mary Phiri, mary@example.com',
    });
    expect(out.transcript).not.toContain('John Phiri');
    expect(out.transcript).not.toContain('0961111111');
    expect(out.patient_context).not.toContain('Mary Phiri');
    expect(out.patient_context).not.toContain('mary@example.com');
    expect(out.redactions).toBeGreaterThanOrEqual(4);
  });
});

describe('ambient-scribe wiring (M-4)', () => {
  it('scrubs before the upstream call and never echoes raw model output', () => {
    const s = read('supabase/functions/ambient-scribe/index.ts');
    expect(s).toContain('deidentifyScribeInput');
    expect(s).toContain('scrubbed.transcript');
    expect(s).toContain('scrubbed.patient_context');
    // The raw transcript must never be interpolated into the AI message.
    expect(s).not.toContain('TRANSCRIPT:\\n${transcript}');
    expect(s).not.toContain("${patient_context || 'Not provided'}");
    expect(s).not.toContain('raw: text');
    expect(s).not.toMatch(/console\.log\([^)]*transcript/);
    // The catch returns crafted text, never the provider/system message.
    expect(s).not.toContain("error: e?.message");
    expect(s).toContain('Could not generate notes');
  });
});

// ── M-5: rate limiting on the Lenco trio ───────────────────────────

describe('Lenco rate limiting (M-5)', () => {
  it.each([
    ['lenco-create-payment', 10],
    ['lenco-verify-payment', 30],
    ['lenco-process-payout', 10],
  ])('%s calls the shared limiter', (fn, limit) => {
    const s = read(`supabase/functions/${fn}/index.ts`);
    expect(s).toMatch(/from ['"]\.\.\/_shared\/rate-limit\.ts['"]/);
    expect(s).toContain('aiRateLimitResponse');
    expect(s).toContain(`'${fn}', ${limit}`);
  });
});

// ── L-1: crafted generic errors ─────────────────────────────────────

describe('crafted error messages (L-1)', () => {
  it('lenco-create-payment never returns provider or system text', () => {
    const s = read('supabase/functions/lenco-create-payment/index.ts');
    expect(s).not.toContain('message: e?.message');
    expect(s).not.toContain('String((e as any)?.message');
    expect(s).toContain('Could not start the mobile money payment');
    expect(s).toContain('Could not start the payment');
  });

  it('lenco-verify-payment catch is generic', () => {
    const s = read('supabase/functions/lenco-verify-payment/index.ts');
    expect(s).not.toContain('String((e as any)?.message');
    expect(s).toContain('Could not check the payment status');
  });

  it('lenco-webhook catch is generic', () => {
    const s = read('supabase/functions/lenco-webhook/index.ts');
    expect(s).not.toContain('String((e as any)?.message');
    expect(s).toContain('Webhook processing failed');
  });

  it('lenco-process-payout only returns crafted operator messages', () => {
    const s = read('supabase/functions/lenco-process-payout/index.ts');
    expect(s).not.toContain('error: err.message');
    expect(s).not.toContain('ledgerError.message');
    expect(s).not.toContain('Transfer failed: ${result.error}');
    expect(s).toContain('Could not process the payout');
  });

  it('admin-delete-user only returns OpError diagnostics or a generic message', () => {
    const s = read('supabase/functions/admin-delete-user/index.ts');
    expect(s).not.toContain('discErr.message');
    expect(s).not.toContain('countErr.message');
    expect(s).not.toContain('execErr.message');
    expect(s).not.toContain('error: e.message');
    expect(s).toContain('class OpError');
    expect(s).toContain('Deletion failed. Please try again or contact support.');
  });

  it('admin-delete-user topological sort dedupes multi-column FKs (live-proven 2026-11-10)', () => {
    // A child with two FK columns to the same parent (ward_transfers ->
    // ward_beds twice) counted the parent's indegree twice but decremented
    // once, so every deletion was refused with a phantom "FK cycle".
    // Both the counting loop and the decrement loop must dedupe by parent.
    const s = read('supabase/functions/admin-delete-user/index.ts');
    const counting = s.slice(s.indexOf('const indegree = new Map'), s.indexOf('const ordered: string[]'));
    expect(counting).toContain('seenParents');
    expect(counting).toContain('!seenParents.has(pk)');
  });

  it('admin_delete_user_execute never deletes storage.objects directly (live-proven 2026-11-10)', () => {
    // storage.protect_delete() raises 42501 on any DELETE FROM
    // storage.objects, which failed EVERY user deletion. The RPC must
    // count + report retained objects instead, and must sweep the
    // trigger-inserted audit rows before deleting auth.users.
    const s = read('supabase/migrations/20261110_admin_delete_user_storage_fix.sql');
    // No executable DELETE FROM storage.objects (comments may mention it).
    expect(s).not.toMatch(/^\s*DELETE FROM storage\.objects/m);
    expect(s).toContain('retained — delete via Storage API');
    expect(s).toContain('deleted (final sweep)');
    expect(s).toContain('DELETE FROM public.security_audit_log WHERE user_id = p_target');
  });
});

// ── L-5: platform-only revenue through the locking RPC ─────────────

describe('settle.ts platform-only path (L-5)', () => {
  it('no longer does a read-modify-write on app_owner_wallet', () => {
    const s = read('supabase/functions/_shared/settle.ts');
    expect(s).not.toContain("from('app_owner_wallet')");
    expect(s).not.toContain('Number(wallet.balance');
    expect(s).toContain("rpc('settle_platform_revenue'");
  });

  it('the migration creates the locking RPC with an idempotent ledger', () => {
    const s = read('supabase/migrations/20261110_platform_revenue_credit.sql');
    expect(s).toContain('settle_platform_revenue');
    expect(s).toContain('FOR UPDATE');
    expect(s).toContain('balance = balance + p_amount');
    expect(s).toContain('app_owner_wallet_credits');
    expect(s).toContain('UNIQUE (external_ref)');
    expect(s).toContain('REVOKE EXECUTE');
    expect(s).toContain('TO service_role');
  });

  it('credits exactly once: second settle of the same reference is a no-op', async () => {
    // Fake admin whose rpc() emulates the LIVE settle_platform_revenue
    // semantics: row lock aside, ledger insert (UNIQUE external_ref) +
    // atomic increment in one transaction.
    const db = {
      payments: [] as any[],
      app_owner_wallet: [{ id: 'w1', balance: 100 }] as any[],
      credits: [] as any[],
    };
    const rpcCalls: string[] = [];
    const tableUpdates: string[] = [];
    const admin: any = {
      from: (t: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
            maybeSingle: async () => ({ data: null, error: null }),
          }),
          maybeSingle: async () => ({ data: null, error: null }),
          limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }),
        update: (obj: any) => {
          tableUpdates.push(t);
          return { eq: () => ({}) };
        },
      }),
      rpc: async (fn: string, args: any) => {
        rpcCalls.push(fn);
        expect(fn).toBe('settle_platform_revenue');
        if (db.credits.some((c: any) => c.external_ref === args.p_external_ref)) {
          return { data: { settled: true, already: true, new_balance: db.app_owner_wallet[0].balance }, error: null };
        }
        db.credits.push({ external_ref: args.p_external_ref, amount: args.p_amount });
        db.app_owner_wallet[0].balance += args.p_amount;
        return { data: { settled: true, already: false, new_balance: db.app_owner_wallet[0].balance }, error: null };
      },
    };

    const input = {
      gateway: 'lenco' as const,
      externalRef: 'D0C-TEST-001',
      payerId: '11111111-1111-1111-1111-111111111111',
      amount: 10,
      currency: 'ZMW',
      referenceType: 'subscription',
      referenceId: null,
      description: 'HMS fee',
    };
    const first = await settlePayment(admin, input);
    expect(first.settled).toBe(true);
    expect(first.already).toBe(false);
    expect(first.payeeType).toBe('app_owner');
    expect(db.app_owner_wallet[0].balance).toBe(110);
    expect(db.credits).toHaveLength(1);

    const second = await settlePayment(admin, input);
    expect(second.settled).toBe(true);
    expect(second.already).toBe(true);
    expect(db.app_owner_wallet[0].balance).toBe(110);
    expect(db.credits).toHaveLength(1);

    // The balance moved ONLY through the RPC — no direct table update.
    expect(tableUpdates).not.toContain('app_owner_wallet');
    expect(rpcCalls).toEqual(['settle_platform_revenue', 'settle_platform_revenue']);
  });
});

// ── L-6: pay-on-behalf is documented, not an ownership check ───────

describe('lenco-create-payment pay-on-behalf (L-6)', () => {
  it('documents the intended semantics in a code comment', () => {
    const s = read('supabase/functions/lenco-create-payment/index.ts');
    expect(s).toContain('pay on behalf');
    expect(s).toContain('L-6');
    expect(s).toContain('family paying');
    // No ownership check was smuggled in: the reference owner is not
    // compared to the caller anywhere in this function.
    expect(s).not.toMatch(/reference.*owner|owner.*reference/i);
  });
});

// ── H-1: the unauditable function stays undeployed ──────────────────

describe('process-mobile-money undeploy (H-1)', () => {
  it('has no source, no call site, and no deploy instruction left', () => {
    expect(() => read('supabase/functions/process-mobile-money/index.ts')).toThrow();
    const guide = read('DEPLOY_GUIDE.md');
    expect(guide).not.toContain('process-mobile-money');
    const create = read('supabase/functions/lenco-create-payment/index.ts');
    expect(create).not.toContain('process-mobile-money');
  });
});

// ── Deps: dompurify pinned past the GHSA range ──────────────────────

describe('dompurify bump (deps M2)', () => {
  it('package.json requires ^3.4.17 and bun.lock resolves 3.4.17', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.dependencies.dompurify).toBe('^3.4.17');
    const lock = read('bun.lock');
    expect(lock).toContain('dompurify@3.4.17');
  });

  it('safePrint still uses neither flagged DOMPurify option', () => {
    const s = read('src/utils/safePrint.ts');
    expect(s).not.toContain('SAFE_FOR_TEMPLATES');
    expect(s).not.toContain('IN_PLACE');
  });
});
