import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Payments audit 2026-11-24 (CEO: "payments aren't all working"). Every
// defect below was proven live against the sandbox project with QA users
// before it was fixed; these tests pin the fixes so they cannot regress
// silently.
//
//   1. Wallet-paid video consultations always failed: the client passes a
//      service CODE ('video_consultation_general') and process-wallet-
//      payment stored it in payments.service_id — a UUID FK. The insert
//      blew up and the payment rolled back with "Wallet transaction
//      failed".
//   2. Wallet-paid pharmacy orders debited the patient, confirmed the
//      order and credited NOBODY: the split was called with a null
//      provider id (the split RPC's personnel row is NOT NULL) and the
//      error was swallowed with a comment.
//   3. Gateway-paid pharmacy orders never left 'pending' — no fulfilment,
//      and the order stayed payable (double-charge risk).
//   4. Billing.tsx recorded a second billing_payments row after every
//      Lenco invoice payment (paid_amount 200 on a K100 invoice).
//   5. resolve_payment_amount('invoice') returned the invoice TOTAL, so
//      part-paid invoices could never be settled via a gateway.
//   6. Subscriptions: no INSERT policy for users (subscribe always
//      42501'd), activation depended on the browser coming back, and the
//      UPDATE policy let users flip their own plan to 'active'.
//   7. Refunds were record-only — 'completed' refunds moved no money.

const readSrc = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

const WALLET_FN = 'supabase/functions/process-wallet-payment/index.ts';
const SETTLE = 'supabase/functions/_shared/settle.ts';
const BILLING = 'src/pages/Billing.tsx';
const PRICING = 'src/components/subscription/PricingPage.tsx';
const MIGRATION = 'supabase/migrations/20261124_payments_audit_fixes.sql';
const MIGRATION2 = 'supabase/migrations/20261124_payments_audit_fixes_2.sql';

describe('Payments audit · wallet payments', () => {
  const src = readSrc(WALLET_FN);

  it('never stores a service code in the UUID payments.service_id', () => {
    expect(src).toContain('serviceIdForDb');
    expect(src).toContain("from('healthcare_services')");
    expect(src).toContain('service_code: serviceId');
    expect(src).not.toContain('const serviceIdForDb = orderId ? null : serviceId;');
  });

  it('keeps a real profile id on pharmacy splits (personnel recipient is NOT NULL)', () => {
    expect(src).not.toContain('splitProviderId = null;');
    expect(src).toContain('p_provider_id: splitProviderId');
  });

  it('rolls the debit back when the split fails — money never vanishes', () => {
    expect(src).toContain('rolling back debit');
    expect(src).toContain("status: 'failed'");
    expect(src).not.toContain("Don't fail the whole payment");
  });

  it('confirms the order only after the split succeeds', () => {
    const splitIdx = src.indexOf('process_payment_with_splits');
    const confirmIdx = src.indexOf("status: 'confirmed'");
    expect(splitIdx).toBeGreaterThan(-1);
    expect(confirmIdx).toBeGreaterThan(splitIdx);
  });
});

describe('Payments audit · settlement side effects', () => {
  const src = readSrc(SETTLE);

  it('confirms paid pharmacy orders server-side', () => {
    expect(src).toContain('markOrderConfirmed');
    expect(src).toContain("eq('status', 'pending')");
  });

  it('activates settled subscriptions server-side', () => {
    expect(src).toContain('activateSubscription');
    expect(src).toContain("from('user_subscriptions')");
  });

  it('maps the split RPC result fields that actually exist', () => {
    expect(src).toContain('split?.app_amount');
    expect(src).not.toContain('split?.platform_fee');
  });
});

describe('Payments audit · invoice payments never double-book', () => {
  const src = readSrc(BILLING);

  it('the Lenco verify path does not record a second billing_payments row', () => {
    const verifyBlock = src.slice(src.indexOf('const checkLencoStatus'), src.indexOf('const handleRefund'));
    expect(verifyBlock).not.toContain('handleMarkPaid');
    expect(verifyBlock).toContain('fetchInvoices()');
  });

  it('manual mark-paid still exists for cash/card recording', () => {
    expect(src).toContain('const handleMarkPaid');
  });
});

describe('Payments audit · pricing page never self-activates', () => {
  const src = readSrc(PRICING);

  it('does not update the subscription status from the browser', () => {
    const finish = src.slice(src.indexOf('const finishPaid'), src.indexOf('const sendPrompt'));
    expect(finish).not.toContain(".update({ status: 'active' })");
    expect(finish).toContain('being activated');
  });
});

describe('Payments audit · DB fixes (migration)', () => {
  const sql = readSrc(MIGRATION);

  it('invoice price resolution returns the outstanding balance', () => {
    expect(sql).toContain('GREATEST(total_amount - COALESCE(paid_amount, 0), 0)');
  });

  it('users can create own pending subscriptions but cannot self-activate', () => {
    expect(sql).toContain('Users can create own subscriptions');
    expect(sql).toContain("status IN ('pending', 'trialing')");
    expect(sql).toContain("status <> 'active' OR public.has_admin_scope(auth.uid())");
  });

  it('refunds reverse the splits and credit the patient', () => {
    expect(sql).toContain('reverse_payment_splits');
    expect(sql).toContain("'refund'");
    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.reverse_payment_splits');
  });

  it("the status CHECK admits 'pending' (the subscribe flow's pre-payment state)", () => {
    const sql2 = readSrc(MIGRATION2);
    expect(sql2).toContain('user_subscriptions_status_check');
    expect(sql2).toContain("'pending'");
    expect(sql2).toContain("'trialing'");
  });
});
