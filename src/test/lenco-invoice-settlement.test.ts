import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Lenco invoice settlement (live-proven broken 2026-11-16, docswarm
// billing): a K10 invoice collection reported 'paid' at Lenco, but
// settlement returned { settled: false, reason: 'payment_row_failed' } —
// no wallet was credited, the invoice stayed 'sent', and the user was
// told their wallet had been credited. Root causes, both in the shared
// settle helper:
//   1. payments.provider_id FKs to profiles(id), but institution payees
//      stored the INSTITUTION id there (23503 on insert).
//   2. process_payment_with_splits inserts a 'health_personnel' split row
//      with p_provider_id unconditionally (recipient_id NOT NULL), so a
//      null provider id would fail the split too.
//   3. Nothing ever booked a settled payment against its
//      billing_invoices row, so even a successful split left the invoice
//      'sent' with its full balance.
// These tests pin the fixes the way the billing-accumulation tests pin
// the bill engine; behaviour is proven live by JWT replay.

const readSrc = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

const SETTLE = 'supabase/functions/_shared/settle.ts';
const VERIFY = 'supabase/functions/lenco-verify-payment/index.ts';
const MIGRATION = 'supabase/migrations/20261116_fix_invoice_number_uniqueness.sql';

describe('Invoice settlement · payments row carries a real profile', () => {
  const src = readSrc(SETTLE);

  it('never stores an institution id in payments.provider_id', () => {
    expect(src).not.toContain('provider_id: payee.providerId ?? payee.institutionId');
    expect(src).toContain('resolvePaymentsProviderId');
    expect(src).toContain("select('admin_id')");
    expect(src).toContain("from('healthcare_institutions')");
  });

  it('fails closed when no profile resolves as the payments provider', () => {
    expect(src).toContain("reason: 'payee_admin_unresolved'");
  });

  it('passes the resolved profile id to the split RPC (its personnel split row is NOT NULL)', () => {
    expect(src).toContain('p_provider_id: paymentsProviderId');
  });
});

describe('Invoice settlement · the invoice actually closes', () => {
  const src = readSrc(SETTLE);

  it('books settled invoice payments into billing_payments, keyed by gateway reference', () => {
    expect(src).toContain('applyInvoicePayment');
    expect(src).toContain("from('billing_payments')");
    expect(src).toContain("eq('reference_number', args.externalRef)");
  });

  it('applies the booking on the settle-now path and on already-settled replays', () => {
    const hits = src.split('applyInvoicePayment(admin').length - 1;
    expect(hits).toBeGreaterThanOrEqual(3);
  });
});

describe('Invoice settlement · the user is never told of a credit that did not happen', () => {
  const src = readSrc(VERIFY);

  it('reports a failed settlement plainly instead of claiming a credit', () => {
    expect(src).toContain('settlementFailed');
    expect(src).toContain('booking it failed');
    expect(src).not.toContain("message: status === 'paid'\n        ? 'Payment confirmed. Your wallet has been credited.'");
  });

  it('tells invoice payers the invoice was marked paid, not the wallet credited', () => {
    expect(src).toContain('The invoice has been marked paid.');
  });
});

describe('Invoice numbers · unique platform-wide per day', () => {
  const sql = readSrc(MIGRATION);

  it('serializes number assignment and counts across all institutions', () => {
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.generate_invoice_number()');
    expect(sql).not.toContain('institution_id = NEW.institution_id');
  });

  it('keeps the INV-YYYYMMDD-NNNN format', () => {
    expect(sql).toContain("'INV-'");
    expect(sql).toContain("TO_CHAR(NOW(), 'YYYYMMDD')");
  });
});
