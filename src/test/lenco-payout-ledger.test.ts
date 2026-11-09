import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// lenco.ts reads Deno.env at module load — stub it before importing.
(globalThis as any).Deno = { env: { get: (_k: string) => 'test-secret' } };

let settleTransferByReference: typeof import('../../supabase/functions/_shared/lenco.ts').settleTransferByReference;

beforeAll(async () => {
  ({ settleTransferByReference } = await import('../../supabase/functions/_shared/lenco.ts'));
});

/**
 * Payout ledger pins (defect found 2026-11-09): settleTransferByReference
 * used to debit the wallet with a manual balance update plus a DIRECT
 * wallet_transactions insert naming a nonexistent user_id column, and it
 * ignored the insert error — the balance moved but the ledger row never
 * landed, so the ledger stopped reconciling with the balance.
 *
 * The fix routes the debit through the process_wallet_transaction RPC
 * (the same path settle.ts uses for collections): balance + ledger row in
 * one transaction, idempotent on gateway_ref `PAYOUT:<withdrawal_id>`.
 * These tests drive the REAL settler against a fake admin client whose
 * rpc() emulates the live RPC's semantics.
 */

const PROVIDER = '11111111-1111-1111-1111-111111111111';
const WID = '22222222-2222-2222-2222-222222222222';
const REF = 'WD-22222222';

function makeDb(walletBalance = 100) {
  return {
    lenco_payments: [
      {
        id: 'lp1', user_id: PROVIDER, amount: 10, currency: 'ZMW',
        status: 'processing', lenco_reference: REF, reference_type: 'payout',
        metadata: { withdrawal_id: WID },
      },
    ] as any[],
    withdrawal_requests: [
      { id: WID, provider_id: PROVIDER, amount: 10, currency: 'ZMW', status: 'processing', paid_at: null as any },
    ] as any[],
    user_wallets: [{ id: 'wallet1', user_id: PROVIDER, balance: walletBalance }] as any[],
    wallet_transactions: [] as any[],
  };
}

class QB {
  mode: 'select' | 'update' | 'insert' = 'select';
  filters: [string, any][] = [];
  payload: any = null;
  constructor(private db: any, private table: string, private inserts: string[]) {}
  select(_cols?: string) { return this; }
  update(obj: any) { this.mode = 'update'; this.payload = obj; return this; }
  insert(obj: any) { this.mode = 'insert'; this.payload = obj; this.inserts.push(this.table); return this; }
  eq(col: string, val: any) { this.filters.push([col, val]); return this; }
  private run() {
    const rows = (this.db[this.table] as any[]).filter((r) =>
      this.filters.every(([c, v]) => r[c] === v));
    if (this.mode === 'update') {
      rows.forEach((r) => Object.assign(r, this.payload));
      return rows[0] ?? null;
    }
    if (this.mode === 'insert') {
      this.db[this.table].push({ id: `ins-${this.db[this.table].length + 1}`, ...this.payload });
      return null;
    }
    return rows[0] ?? null;
  }
  async maybeSingle() { return { data: this.run(), error: null }; }
  async single() { return { data: this.run(), error: null }; }
  then(resolve: any) { return Promise.resolve({ data: this.run(), error: null }).then(resolve); }
}

function makeAdmin(db: any) {
  const inserts: string[] = [];
  const rpcCalls: any[] = [];
  const admin: any = {
    from: (t: string) => new QB(db, t, inserts),
    rpc: async (fn: string, args: any) => {
      rpcCalls.push({ fn, args });
      if (fn !== 'process_wallet_transaction') return { data: null, error: { message: `unknown rpc ${fn}` } };
      // Emulate the live RPC: wallet lock aside, it moves the balance AND
      // writes the ledger row atomically, unique on gateway_ref.
      const wallet = db.user_wallets.find((w: any) => w.user_id === args.p_user_id);
      if (!wallet) return { data: null, error: { message: 'Wallet not found for user' } };
      if (args.p_gateway_ref && db.wallet_transactions.some((r: any) => r.gateway_ref === args.p_gateway_ref)) {
        return {
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint "uq_wallet_transactions_gateway_ref"' },
        };
      }
      const newBalance = args.p_transaction_type === 'debit'
        ? wallet.balance - args.p_amount
        : wallet.balance + args.p_amount;
      if (args.p_transaction_type === 'debit' && newBalance < 0) {
        return {
          data: null,
          error: { message: `Insufficient funds. Current balance: ${wallet.balance}, Required: ${args.p_amount}` },
        };
      }
      wallet.balance = newBalance;
      const row = {
        id: `wt-${db.wallet_transactions.length + 1}`,
        wallet_id: wallet.id,
        transaction_type: args.p_transaction_type,
        amount: args.p_amount,
        balance_after: newBalance,
        description: args.p_description,
        payment_id: args.p_payment_id,
        created_by: args.p_user_id,
        gateway_ref: args.p_gateway_ref,
      };
      db.wallet_transactions.push(row);
      return { data: { success: true, transaction_id: row.id, new_balance: newBalance }, error: null };
    },
  };
  return { admin, inserts, rpcCalls };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    status: 200,
    json: async () => ({ status: true, data: { status: 'successful', lencoReference: '263130099' } }),
  })));
});

describe('Lenco payout settlement — wallet ledger debit', () => {
  it('settles exactly once: balance debited AND one ledger row via the RPC', async () => {
    const db = makeDb(100);
    const { admin, inserts, rpcCalls } = makeAdmin(db);

    const out = await settleTransferByReference(admin, REF);
    expect(out).toEqual({ status: 'successful', settled: true });

    // The debit went through the RPC with the collections-path conventions.
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].fn).toBe('process_wallet_transaction');
    expect(rpcCalls[0].args).toMatchObject({
      p_user_id: PROVIDER,
      p_transaction_type: 'debit',
      p_amount: 10,
      p_payment_id: null,
      p_gateway_ref: `PAYOUT:${WID}`,
    });
    // No direct table insert anywhere in the settlement.
    expect(inserts).toHaveLength(0);

    // Balance and ledger agree — the reconciliation the bug broke.
    expect(db.user_wallets[0].balance).toBe(90);
    expect(db.wallet_transactions).toHaveLength(1);
    expect(db.wallet_transactions[0]).toMatchObject({
      wallet_id: 'wallet1',
      transaction_type: 'debit',
      amount: 10,
      balance_after: 90,
      gateway_ref: `PAYOUT:${WID}`,
      description: `Withdrawal payout ${REF}`,
    });

    expect(db.withdrawal_requests[0].status).toBe('paid');
    expect(db.withdrawal_requests[0].paid_at).toBeTruthy();
    expect(db.lenco_payments[0]).toMatchObject({ status: 'paid', result_message: 'successful' });
  });

  it('replay settles nothing twice: no second debit, no second ledger row', async () => {
    const db = makeDb(100);
    const { admin, rpcCalls } = makeAdmin(db);

    await settleTransferByReference(admin, REF);
    const out2 = await settleTransferByReference(admin, REF);

    expect(out2.settled).toBe(true); // already paid — reports current truth
    expect(rpcCalls).toHaveLength(1); // the RPC was not even called again
    expect(db.user_wallets[0].balance).toBe(90);
    expect(db.wallet_transactions).toHaveLength(1);
  });

  it('a duplicate gateway_ref from a concurrent settler is idempotent success, not a second debit', async () => {
    const db = makeDb(90); // balance already debited by the concurrent settler
    db.wallet_transactions.push({
      id: 'wt-0', wallet_id: 'wallet1', transaction_type: 'debit', amount: 10,
      balance_after: 90, description: `Withdrawal payout ${REF}`, payment_id: null,
      created_by: PROVIDER, gateway_ref: `PAYOUT:${WID}`,
    });
    const { admin } = makeAdmin(db);

    const out = await settleTransferByReference(admin, REF);
    expect(out).toEqual({ status: 'successful', settled: true });
    expect(db.user_wallets[0].balance).toBe(90);
    expect(db.wallet_transactions).toHaveLength(1);
    expect(db.withdrawal_requests[0].status).toBe('paid');
  });

  it('a failed debit is surfaced, never swallowed: un-claimed, marked, and retryable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const db = makeDb(5); // balance no longer covers the K10 payout
    const { admin } = makeAdmin(db);

    const out = await settleTransferByReference(admin, REF);
    expect(out).toEqual({ status: 'successful', settled: false, reason: 'wallet_debit_failed' });

    // Nothing silently moved: no debit, no ledger row, balance untouched.
    expect(db.user_wallets[0].balance).toBe(5);
    expect(db.wallet_transactions).toHaveLength(0);
    // The failure is visible and the settlement can be retried: the
    // withdrawal is back in 'processing' (NOT 'approved' — the transfer
    // must never be re-sent) and the payout row carries the failure.
    expect(db.withdrawal_requests[0].status).toBe('processing');
    expect(db.withdrawal_requests[0].paid_at).toBeNull();
    expect(db.lenco_payments[0].result_message).toContain('wallet debit FAILED');

    // Once the balance is corrected, the retry settles cleanly, once.
    db.user_wallets[0].balance = 100;
    const out2 = await settleTransferByReference(admin, REF);
    expect(out2).toEqual({ status: 'successful', settled: true });
    expect(db.user_wallets[0].balance).toBe(90);
    expect(db.wallet_transactions).toHaveLength(1);
  });

  it('source pin: no direct wallet_transactions insert remains in the Lenco settler', () => {
    const src = readFileSync(
      resolve(__dirname, '../../supabase/functions/_shared/lenco.ts'), 'utf8');
    expect(src).not.toMatch(/from\(['"]wallet_transactions['"]\)\s*\.insert/);
    expect(src).toContain("p_gateway_ref: `PAYOUT:${withdrawalId}`");
    expect(src).toContain("admin.rpc('process_wallet_transaction'");
  });
});
