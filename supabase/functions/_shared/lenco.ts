// Shared Lenco (api.lenco.co) v2 client for Edge Functions.
//
// Lenco API v2 — mobile money collections (Zambia: mtn | airtel | zamtel):
//   POST {LENCO_API_URL}/collections/mobile-money
//     { amount, currency, reference, phone, operator, country?, bearer? }
//     -> { status, message, data: { id, reference, lencoReference, type,
//          status: pending|successful|failed|pay-offline, mobileMoneyDetails, ... } }
//   GET  {LENCO_API_URL}/collections/status/:reference
//     -> same data shape; the authoritative source of truth.
//
// Auth:  Authorization: Bearer <LENCO_SECRET_KEY>
// Docs:  https://lenco-api.readme.io/v2.0/reference/initiate-collection-from-mobile-money
//
// Secrets (Supabase Edge Function secrets):
//   LENCO_API_URL        default https://api.lenco.co/access/v2
//   LENCO_SECRET_KEY     Lenco merchant dashboard -> API keys (sandbox key for testing)
//   LENCO_WEBHOOK_SECRET Lenco dashboard -> API & Webhooks (signature verification)

import { settlePayment } from './settle.ts';

const LENCO_API_URL = (Deno.env.get('LENCO_API_URL') || 'https://api.lenco.co/access/v2').replace(/\/$/, '');
const LENCO_SECRET_KEY = Deno.env.get('LENCO_SECRET_KEY') || '';

export type LencoOperator = 'mtn' | 'airtel' | 'zamtel' | 'tnm';

export interface LencoCollectionData {
  id: string;
  reference: string;
  lencoReference?: string | null;
  type?: string;
  status?: string;
  amount?: string;
  currency?: string;
  fee?: string | null;
  reasonForFailure?: string | null;
  mobileMoneyDetails?: {
    country?: string;
    phone?: string;
    operator?: string;
    accountName?: string | null;
    operatorTransactionId?: string | null;
  } | null;
  [k: string]: unknown;
}

interface LencoEnvelope {
  status?: boolean;
  message?: string;
  data?: LencoCollectionData;
}

function requireKey() {
  if (!LENCO_SECRET_KEY) {
    throw new Error('LENCO_SECRET_KEY is not configured');
  }
}

async function lencoFetch(path: string, init?: RequestInit): Promise<LencoEnvelope> {
  requireKey();
  const res = await fetch(`${LENCO_API_URL}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${LENCO_SECRET_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let json: LencoEnvelope = {};
  try {
    json = text ? (JSON.parse(text) as LencoEnvelope) : {};
  } catch {
    throw new Error(`Lenco returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`Lenco API error (HTTP ${res.status}): ${json.message || text.slice(0, 200)}`);
  }
  return json;
}

/** Normalize a Zambian/Malawian MSISDN to the LOCAL format Lenco's docs
 * and examples use (e.g. 0977433571): strip spaces, dashes, a leading '+',
 * and convert a 260/265 country-code prefix to the trunk '0'. */
export function normalizePhone(phone: string): string {
  let p = String(phone || '').replace(/[\s\-().]/g, '').replace(/^\+/, '');
  if (/^26[05]\d{9}$/.test(p)) p = '0' + p.slice(3);
  return p;
}

export interface InitiateCollectionInput {
  amount: number;
  currency: string;
  reference: string;
  phone: string;
  operator: LencoOperator;
  country?: string; // 'zm' | 'mw', default 'zm'
  bearer?: 'merchant' | 'customer'; // who bears the fee; default 'merchant'
}

/**
 * Ask Lenco to collect from the customer's mobile-money wallet.
 * The customer authorizes the debit on their phone (status 'pay-offline'
 * while waiting). Returns the raw collection data.
 */
export async function initiateMobileMoneyCollection(
  input: InitiateCollectionInput,
): Promise<LencoCollectionData> {
  const body = {
    amount: Number(input.amount),
    currency: input.currency.toUpperCase(),
    reference: input.reference,
    phone: normalizePhone(input.phone),
    operator: input.operator,
    // tnm is Malawi's operator — the tnm+'zm' combination is invalid.
    country: input.operator === 'tnm' ? 'mw' : (input.country || 'zm').toLowerCase(),
    bearer: input.bearer || 'merchant',
  };
  const env = await lencoFetch('/collections/mobile-money', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!env.data) {
    throw new Error(`Lenco collection failed: ${env.message || 'empty response'}`);
  }
  return env.data;
}

/** Authoritative status lookup for our reference. */
export async function getCollectionStatus(reference: string): Promise<LencoCollectionData> {
  const env = await lencoFetch(`/collections/status/${encodeURIComponent(reference)}`, {
    method: 'GET',
  });
  if (!env.data) {
    throw new Error(`Lenco status lookup failed: ${env.message || 'empty response'}`);
  }
  return env.data;
}

export type LencoSettledStatus = 'paid' | 'pending' | 'failed' | 'cancelled';

/** Map Lenco's status strings onto our four ledger states. */
export function mapLencoStatus(s: string | null | undefined): LencoSettledStatus {
  const v = String(s || '').toLowerCase();
  if (v === 'successful') return 'paid';
  if (v === 'failed') return 'failed';
  if (v === 'cancelled' || v === 'expired') return 'cancelled';
  return 'pending'; // pending | pay-offline | 3ds-auth-required | unknown
}

type Admin = {
  from: (t: string) => any;
};

/**
 * Re-query Lenco for our reference, persist the outcome in lenco_payments,
 * and — only when Lenco says 'successful' — book the money into the
 * platform ledger via the shared settle helper (idempotent).
 * Returns the normalized status plus the settlement receipt when paid.
 */
export async function verifyAndSettleLenco(
  admin: Admin,
  lencoReference: string,
): Promise<{ status: LencoSettledStatus; payment: any; settlement: unknown }> {
  const data = await getCollectionStatus(lencoReference);
  const status = mapLencoStatus(data.status);

  // Read the existing row first: metadata carries creation-time facts
  // (description, email) that settlement needs. Merging — never replacing —
  // the metadata JSONB (an earlier version overwrote it on every status
  // check and wiped those fields before settlement read them).
  const { data: existing } = await admin
    .from('lenco_payments')
    .select()
    .eq('lenco_reference', lencoReference)
    .maybeSingle();

  // ── AMOUNT INTEGRITY (audit P1-21) ─────────────────────────────────
  // The ledger row's amount originates from client-influenced init paths
  // (e.g. lenco-widget-init persists the client-supplied amount), so it can
  // NEVER be trusted on its own at settle time. Lenco's status response is
  // authoritative for what was actually collected: if the collected amount
  // or currency does not match the ledger row, settle NOTHING and flag the
  // row instead of crediting the ledger amount. Tolerance mirrors the
  // price-guard (0.01) — any larger drift in either direction fails closed.
  let amountMismatch: {
    collected_amount: number | null;
    collected_currency: string | null;
    ledger_amount: number;
    ledger_currency: string;
  } | null = null;
  if (status === 'paid' && existing) {
    const collectedAmount =
      data.amount != null && String(data.amount).trim() !== '' ? Number(data.amount) : null;
    const collectedCurrency = data.currency ? String(data.currency).toUpperCase() : null;
    const ledgerAmount = Number((existing as any).amount);
    const ledgerCurrency = String((existing as any).currency || 'ZMW').toUpperCase();
    const amountOff =
      collectedAmount == null ||
      !Number.isFinite(collectedAmount) ||
      Math.abs(collectedAmount - ledgerAmount) > 0.01;
    const currencyOff = collectedCurrency != null && collectedCurrency !== ledgerCurrency;
    if (amountOff || currencyOff) {
      amountMismatch = {
        collected_amount: collectedAmount,
        collected_currency: collectedCurrency,
        ledger_amount: ledgerAmount,
        ledger_currency: ledgerCurrency,
      };
      console.error(
        `verifyAndSettleLenco: AMOUNT MISMATCH for ${lencoReference} — collected ` +
          `${collectedAmount} ${collectedCurrency} vs ledger ${ledgerAmount} ${ledgerCurrency}. Settlement refused.`,
      );
    }
  }
  const effectiveStatus: LencoSettledStatus = amountMismatch ? 'failed' : status;

  const { data: row } = await admin
    .from('lenco_payments')
    .update({
      status: effectiveStatus,
      lenco_collection_id: data.id || null,
      lenco_lenco_reference: data.lencoReference || null,
      result_message: amountMismatch
        ? `amount_mismatch: collected ${amountMismatch.collected_amount} ${amountMismatch.collected_currency ?? ''} != ledger ${amountMismatch.ledger_amount} ${amountMismatch.ledger_currency} — settlement refused`
        : data.reasonForFailure || data.status || null,
      metadata: {
        ...((existing?.metadata as any) ?? {}),
        last_status_check: new Date().toISOString(),
        lenco_status: data.status,
        fee: data.fee ?? null,
        operator_transaction_id: data.mobileMoneyDetails?.operatorTransactionId ?? null,
        account_name: data.mobileMoneyDetails?.accountName ?? null,
        ...(amountMismatch ? { amount_mismatch: { ...amountMismatch, flagged_at: new Date().toISOString() } } : {}),
      },
    })
    .eq('lenco_reference', lencoReference)
    .select()
    .maybeSingle();

  let settlement: unknown = amountMismatch
    ? { settled: false, reason: 'amount_mismatch', ...amountMismatch }
    : null;
  if (effectiveStatus === 'paid' && row) {
    const alreadySettled = (row.metadata as any)?.settlement?.settled === true;
    if (!alreadySettled) {
      settlement = await settlePayment(admin as any, {
        gateway: 'lenco',
        externalRef: lencoReference,
        payerId: row.user_id,
        amount: Number(row.amount),
        currency: row.currency || 'ZMW',
        referenceType: row.reference_type,
        referenceId: row.reference_id,
        description: (row.metadata as any)?.description,
      });
      await admin
        .from('lenco_payments')
        .update({
          metadata: {
            ...((row.metadata as any) ?? {}),
            settlement,
            last_status_check: new Date().toISOString(),
            lenco_status: data.status,
          },
        })
        .eq('id', row.id);
    } else {
      settlement = (row.metadata as any).settlement;
    }
  }

  return { status: effectiveStatus, payment: row, settlement };
}

/**
 * Verify a Lenco webhook signature.
 *
 * Official Lenco v2.0 spec (lenco-api.readme.io/v2.0/reference/webhooks):
 *   header `X-Lenco-Signature` = HMAC-SHA512 of the event payload,
 *   signed with `webhook_hash_key` = SHA256 hash (hex) of the API token.
 *
 * The Lenco dashboard may also issue a dedicated webhook signing secret.
 * To stay compatible with both, we accept (any match wins):
 *   1. HMAC-SHA512, key = SHA256(API token)            — official spec
 *   2. HMAC-SHA512, key = configured secret as-is      — dashboard secret variant
 *   3. HMAC-SHA256, key = configured secret as-is      — legacy behavior
 * Accepting multiple derivations cannot admit a forgery: an attacker still
 * needs the token/secret to produce any of them.
 *
 * Returns true when no secret/token is configured — callers must still
 * re-verify through the status API before settling.
 */
export async function verifyWebhookSignature(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = Deno.env.get('LENCO_WEBHOOK_SECRET') || '';
  if (!secret && !LENCO_SECRET_KEY) return true; // not configured: caller re-verifies via API
  if (!signature) return false;

  const clean = signature.replace(/^sha512=/i, '').replace(/^sha256=/i, '').toLowerCase();

  async function hmacHex(algo: 'SHA-256' | 'SHA-512', keyMaterial: Uint8Array, data: string): Promise<string> {
    const key = await crypto.subtle.importKey('raw', keyMaterial, { name: 'HMAC', hash: algo }, false, ['sign']);
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
    return Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function sha256Hex(text: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const enc = new TextEncoder();
  const candidates: Array<[string, Uint8Array]> = [];
  try {
    // 1. Official spec: HMAC-SHA512 with SHA256(API token) as key
    if (LENCO_SECRET_KEY) {
      const derived = await sha256Hex(LENCO_SECRET_KEY);
      candidates.push(['SHA-512', enc.encode(derived)]);
    }
    // 2 & 3. Dashboard-issued secret, tried as both SHA-512 and SHA-256
    if (secret) {
      candidates.push(['SHA-512', enc.encode(secret)]);
      candidates.push(['SHA-256', enc.encode(secret)]);
    }
    for (const [algo, keyMaterial] of candidates) {
      const hex = await hmacHex(algo as 'SHA-256' | 'SHA-512', keyMaterial, rawBody);
      if (clean.length === hex.length && clean === hex) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── Banks (for bank-account transfers) ───────────────────────────────────
// Lenco API v2: GET /banks returns the list of supported banks with their IDs.
// The transfer endpoint needs bankId (not the bank name).

export interface LencoBank {
  id: string;
  name: string;
  code?: string;
}

let _banksCache: LencoBank[] | null = null;
let _banksCacheTime = 0;
const BANKS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function getLencoBanks(): Promise<LencoBank[]> {
  const now = Date.now();
  if (_banksCache && now - _banksCacheTime < BANKS_CACHE_TTL) {
    return _banksCache;
  }

  if (!LENCO_SECRET_KEY) {
    throw new Error('LENCO_SECRET_KEY not configured');
  }

  const resp = await fetch(`${LENCO_API_URL}/banks?country=zm`, {
    headers: { Authorization: `Bearer ${LENCO_SECRET_KEY}` },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to fetch banks: ${resp.status} ${text}`);
  }

  const json = await resp.json();
  const banks: LencoBank[] = json.data || json.banks || json || [];
  _banksCache = banks;
  _banksCacheTime = now;
  return banks;
}

/**
 * Resolve a human bank name (e.g. "Zanaco", "Stanbic") to Lenco's bank ID.
 * Uses fuzzy matching — case-insensitive substring match.
 * Throws if no match found.
 */
export async function resolveBankId(bankName: string): Promise<string> {
  const banks = await getLencoBanks();
  const needle = bankName.toLowerCase().trim();

  // Exact match first
  let match = banks.find((b) => b.name.toLowerCase() === needle);
  // Then substring match
  if (!match) {
    match = banks.find(
      (b) => b.name.toLowerCase().includes(needle) || needle.includes(b.name.toLowerCase())
    );
  }

  if (!match) {
    const available = banks.map((b) => b.name).join(', ');
    throw new Error(
      `Bank "${bankName}" not found in Lenco's supported banks. Available: ${available}`
    );
  }

  return match.id;
}

// ── Transfers (payouts to providers/hospitals) ───────────────────────────
// Lenco API v2 transfers — verified against lenco-api.readme.io/v2.0 (2026-08-06):
//   POST /transfers/mobile-money
//     { accountId, amount, reference, phone, operator, country?, narration? }
//   POST /transfers/bank-account
//     { accountId, amount, reference, accountNumber, bankId, narration? }
//   GET  /transfers/status/:reference
//
// CRITICAL:
// - amount is a JSON number (major units, e.g. 20.00)
// - fee is charged ON TOP of amount — budget for it
// - reference must be deterministic (derived from our entity ID) for idempotency
// - Check data.status boolean, not just HTTP 200
// - Never blind-retry after timeout/5xx — GET status by reference first

const LENCO_ACCOUNT_ID = Deno.env.get('LENCO_ACCOUNT_ID') || '';

export interface LencoTransferParams {
  amount: number;
  currency?: string;
  reference: string;
  phone?: string;
  operator?: LencoOperator;
  accountNumber?: string;
  bankId?: string;
  accountName?: string;
  narration?: string;
}

export async function initiateTransfer(params: LencoTransferParams): Promise<{
  success: boolean;
  reference?: string;
  lencoReference?: string;
  status?: string;
  fee?: string;
  error?: string;
  errorCode?: string;
}> {
  if (!LENCO_SECRET_KEY) {
    return { success: false, error: "LENCO_SECRET_KEY not configured" };
  }
  if (!LENCO_ACCOUNT_ID) {
    return { success: false, error: "LENCO_ACCOUNT_ID not configured" };
  }

  const isMobileMoney = !!params.phone;
  const endpoint = isMobileMoney ? "/transfers/mobile-money" : "/transfers/bank-account";

  const body: any = {
    accountId: LENCO_ACCOUNT_ID,
    amount: params.amount,
    currency: (params.currency || 'ZMW').toUpperCase(),
    reference: params.reference,
    narration: params.narration || `Doc'O Clock payout ${params.reference}`,
  };

  if (isMobileMoney) {
    body.phone = params.phone;
    body.operator = params.operator || "mtn";
    body.country = "zm";
  } else {
    body.accountNumber = params.accountNumber;
    body.bankId = params.bankId;
    // NOTE: params.accountName is accepted for caller compatibility but NOT
    // sent — the v2.0 bank-account transfer contract has no accountName
    // field, and strict APIs may reject unknown fields.
  }

  try {
    const res = await fetch(`${LENCO_API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LENCO_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    // Lenco can return HTTP 200 with status:false — check the body
    if (!json.status) {
      return {
        success: false,
        error: json.message || `Lenco transfer failed`,
        errorCode: json.errorCode,
      };
    }

    return {
      success: true,
      reference: json.data?.reference || params.reference,
      lencoReference: json.data?.lencoReference,
      status: json.data?.status || "pending",
      fee: json.data?.fee,
    };
  } catch (err: any) {
    // Ambiguous failure — caller should check status by reference before retrying
    return { success: false, error: err.message || "Network error" };
  }
}

export async function checkTransferStatus(reference: string): Promise<{
  status: string;
  lencoReference?: string;
  fee?: string;
  error?: string;
}> {
  if (!LENCO_SECRET_KEY) {
    return { status: "unknown", error: "LENCO_SECRET_KEY not configured" };
  }

  try {
    const res = await fetch(
      `${LENCO_API_URL}/transfers/status/${encodeURIComponent(reference)}`,
      { headers: { "Authorization": `Bearer ${LENCO_SECRET_KEY}` } }
    );

    if (res.status === 404) {
      return { status: "not_found" }; // genuinely doesn't exist — safe to re-POST
    }

    const json = await res.json();
    if (!json.status) {
      return { status: "unknown", error: json.message };
    }

    return {
      status: json.data?.status || "unknown",
      lencoReference: json.data?.lencoReference,
      fee: json.data?.fee,
    };
  } catch (err: any) {
    return { status: "unknown", error: err.message };
  }
}

/**
 * Settle a payout transfer by its merchant reference — the asynchronous
 * completion path for withdrawals. Re-queries Lenco (authoritative), then:
 *   successful -> withdrawal processing->paid (atomic), wallet debited,
 *                 ledger row -> paid
 *   failed     -> withdrawal processing->approved (admin can retry),
 *                 ledger row -> failed
 * Idempotent: the withdrawal update is guarded on status='processing', so
 * a duplicate webhook or a race with the synchronous path settles once.
 * Used by lenco-webhook (transfer.* events) and lenco-process-payout.
 */
export async function settleTransferByReference(
  admin: Admin,
  reference: string,
): Promise<{ status: string; settled: boolean; reason?: string }> {
  const st = await checkTransferStatus(reference);
  if (st.status !== 'successful' && st.status !== 'failed') {
    return { status: st.status, settled: false };
  }

  const { data: ledger } = await admin
    .from('lenco_payments')
    .select('id, user_id, amount, currency, metadata')
    .eq('lenco_reference', reference)
    .eq('reference_type', 'payout')
    .maybeSingle();
  const withdrawalId = (ledger?.metadata as any)?.withdrawal_id;
  if (!ledger || !withdrawalId) {
    return { status: st.status, settled: false, reason: 'no payout ledger row for reference' };
  }

  const { data: withdrawal } = await admin
    .from('withdrawal_requests')
    .select('id, provider_id, amount, currency, status')
    .eq('id', withdrawalId)
    .maybeSingle();
  if (!withdrawal) {
    return { status: st.status, settled: false, reason: 'withdrawal not found' };
  }
  if ((withdrawal as any).status !== 'processing') {
    // Already in a terminal state (paid synchronously, or reverted) — the
    // atomic guard below would no-op anyway; report current truth.
    return { status: st.status, settled: (withdrawal as any).status === 'paid' };
  }

  if (st.status === 'failed') {
    await admin
      .from('withdrawal_requests')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', withdrawalId)
      .eq('status', 'processing');
    await admin
      .from('lenco_payments')
      .update({ status: 'failed', result_message: st.error || 'Transfer failed' })
      .eq('id', (ledger as any).id);
    return { status: 'failed', settled: true };
  }

  // successful — claim paid atomically, then debit the wallet
  const { data: claimed } = await admin
    .from('withdrawal_requests')
    .update({ status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', withdrawalId)
    .eq('status', 'processing')
    .select('id')
    .maybeSingle();
  if (!claimed) {
    return { status: st.status, settled: false, reason: 'claim race lost (already settled)' };
  }

  const payoutAmount = Number((withdrawal as any).amount);
  const providerId = (withdrawal as any).provider_id;
  const { data: wallet } = await admin
    .from('user_wallets')
    .select('balance')
    .eq('user_id', providerId)
    .maybeSingle();
  const currentBalance = Number((wallet as any)?.balance || 0);
  if (currentBalance < payoutAmount) {
    // The money has LEFT with Lenco — a shortfall means an earlier debit
    // was missed. Debit in full (truthful negative liability) and shout.
    console.error(
      `settleTransferByReference: wallet shortfall for ${reference}: balance ${currentBalance} < payout ${payoutAmount}`,
    );
  }
  await admin
    .from('user_wallets')
    .update({ balance: currentBalance - payoutAmount, updated_at: new Date().toISOString() })
    .eq('user_id', providerId);
  await admin.from('wallet_transactions').insert({
    user_id: providerId,
    transaction_type: 'debit',
    amount: payoutAmount,
    description: `Withdrawal payout ${reference}`,
    gateway_ref: `PAYOUT:${withdrawalId}`,
  });
  await admin
    .from('lenco_payments')
    .update({
      status: 'paid',
      lenco_lenco_reference: st.lencoReference || null,
      result_message: 'successful',
    })
    .eq('id', (ledger as any).id);

  return { status: 'successful', settled: true };
}

// Legacy aliases (renamed for clarity — use initiateTransfer/checkTransferStatus)
export const initiateDisbursement = initiateTransfer;
export const checkDisbursementStatus = checkTransferStatus;
