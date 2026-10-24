import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// The REAL guard used by capture-paypal-payment (P2-22) — not a mirror.
import { evaluateCapture } from '../../supabase/functions/_shared/paypal-capture-guard';

const readFn = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

/**
 * Stage C2a Cluster A — money paths.
 * P2-22: capture-paypal-payment must compare captured vs ledger amount.
 * P2-28: process-payment wallet branch was a money sink; PayPal branch
 *        never persisted external_payment_id.
 */
describe('P2-22 · PayPal capture guard (evaluateCapture)', () => {
  it('(a) matching amount + currency settles the full ledger amount', () => {
    const d = evaluateCapture({
      ledgerAmount: 200, ledgerCurrency: 'ZMW',
      capturedAmount: 200, capturedCurrency: 'ZMW',
    });
    expect(d.action).toBe('settle');
    expect(d.settleAmount).toBe(200);
    expect(d.mismatch).toBeNull();
  });

  it('(a2) matching GATEWAY amount settles full ledger amount despite FX conversion', () => {
    // Order created for USD 7.40 against a K200 ledger row (ZMW->USD at creation).
    const d = evaluateCapture({
      ledgerAmount: 200, ledgerCurrency: 'ZMW',
      gatewayAmount: 7.4, gatewayCurrency: 'USD',
      capturedAmount: 7.4, capturedCurrency: 'USD',
    });
    expect(d.action).toBe('settle');
    expect(d.settleAmount).toBe(200);
    expect(d.mismatch).toBeNull();
  });

  it('(b) lesser captured amount does NOT credit the full ledger amount', () => {
    const d = evaluateCapture({
      ledgerAmount: 200, ledgerCurrency: 'ZMW',
      capturedAmount: 50, capturedCurrency: 'ZMW',
    });
    expect(d.action).toBe('settle_partial');
    expect(d.settleAmount).toBe(50);
    expect(d.mismatch?.kind).toBe('under_capture');
  });

  it('(b2) lesser GATEWAY capture scales back into ledger currency', () => {
    // Expected USD 7.40 for K200; only USD 3.70 captured -> settle K100.
    const d = evaluateCapture({
      ledgerAmount: 200, ledgerCurrency: 'ZMW',
      gatewayAmount: 7.4, gatewayCurrency: 'USD',
      capturedAmount: 3.7, capturedCurrency: 'USD',
    });
    expect(d.action).toBe('settle_partial');
    expect(d.settleAmount).toBe(100);
  });

  it('(c) currency mismatch is refused — nothing settles', () => {
    const d = evaluateCapture({
      ledgerAmount: 200, ledgerCurrency: 'ZMW',
      capturedAmount: 200, capturedCurrency: 'USD',
    });
    expect(d.action).toBe('refuse');
    expect(d.settleAmount).toBe(0);
    expect(d.mismatch?.kind).toBe('currency_mismatch');
  });

  it('over-capture never settles more than the ledger amount, but alerts', () => {
    const d = evaluateCapture({
      ledgerAmount: 200, ledgerCurrency: 'ZMW',
      capturedAmount: 999, capturedCurrency: 'ZMW',
    });
    expect(d.action).toBe('settle');
    expect(d.settleAmount).toBe(200);
    expect(d.mismatch?.kind).toBe('over_capture');
  });

  it('zero / invalid capture is refused', () => {
    const d = evaluateCapture({
      ledgerAmount: 200, ledgerCurrency: 'ZMW',
      capturedAmount: 0, capturedCurrency: 'ZMW',
    });
    expect(d.action).toBe('refuse');
  });

  it('capture-paypal-payment wires the guard in BEFORE settling', () => {
    const src = readFn('supabase/functions/capture-paypal-payment/index.ts');
    expect(src).toContain("from '../_shared/paypal-capture-guard.ts'");
    expect(src).toContain('evaluateCapture({');
    // Both settlement paths use the guarded amount, never the raw ledger amount.
    expect(src).toContain('p_amount: settleAmount');
    expect(src).toContain('p_total_amount: settleAmount');
    expect(src).not.toContain('p_total_amount: payment.amount');
    expect(src).not.toContain('p_amount: payment.amount');
    // Mismatches raise an alert row.
    expect(src).toContain("'paypal_capture_mismatch'");
    expect(src).toContain("from('security_audit_log')");
  });
});

describe('P2-28 · process-payment unsafe paths retired', () => {
  const src = readFn('supabase/functions/process-payment/index.ts');

  it('wallet branch refuses and points at the guarded function', () => {
    expect(src).toContain('Wallet payments are not accepted by process-payment');
    expect(src).toContain('process-wallet-payment');
  });

  it('wallet branch performs NO wallet debit anywhere in the function', () => {
    expect(src).not.toContain("p_transaction_type: 'debit'");
    expect(src).not.toContain('process_wallet_transaction');
  });

  it('PayPal branch persists external_payment_id from the PayPal order', () => {
    expect(src).toContain('external_payment_id: paypalOrder.id');
  });

  it('the guarded wallet function is the one the UI actually uses', () => {
    const hook = readFn('src/hooks/useWalletPayment.ts');
    expect(hook).toContain('process-wallet-payment');
    const guarded = readFn('supabase/functions/process-wallet-payment/index.ts');
    // The guarded path distributes splits after debiting.
    expect(guarded).toContain('process_payment_with_splits');
  });
});
