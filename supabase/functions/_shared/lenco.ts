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

/** Normalize a Zambian/Malawian MSISDN: strip spaces, dashes and a leading '+'. */
export function normalizePhone(phone: string): string {
  return String(phone || '').replace(/[\s\-().]/g, '').replace(/^\+/, '');
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
    amount: Number(input.amount).toFixed(2),
    currency: input.currency.toUpperCase(),
    reference: input.reference,
    phone: normalizePhone(input.phone),
    operator: input.operator,
    country: (input.country || 'zm').toLowerCase(),
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

  const { data: row } = await admin
    .from('lenco_payments')
    .update({
      status,
      lenco_collection_id: data.id || null,
      lenco_lenco_reference: data.lencoReference || null,
      result_message: data.reasonForFailure || data.status || null,
      metadata: {
        last_status_check: new Date().toISOString(),
        lenco_status: data.status,
        fee: data.fee ?? null,
        operator_transaction_id: data.mobileMoneyDetails?.operatorTransactionId ?? null,
        account_name: data.mobileMoneyDetails?.accountName ?? null,
      },
    })
    .eq('lenco_reference', lencoReference)
    .select()
    .maybeSingle();

  let settlement: unknown = null;
  if (status === 'paid' && row) {
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

  return { status, payment: row, settlement };
}

/**
 * Verify a Lenco webhook signature (HMAC-SHA256 of the raw body).
 * Returns true when no LENCO_WEBHOOK_SECRET is configured — callers must
 * still re-verify through the status API before settling.
 */
export async function verifyWebhookSignature(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = Deno.env.get('LENCO_WEBHOOK_SECRET') || '';
  if (!secret) return true; // not configured: caller re-verifies via API
  if (!signature) return false;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
    const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const clean = signature.replace(/^sha256=/i, '').toLowerCase();
    return clean.length === hex.length && clean === hex;
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

  const resp = await fetch(`${LENCO_API_URL}/banks`, {
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
    if (params.accountName) body.accountName = params.accountName;
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

// Legacy aliases (renamed for clarity — use initiateTransfer/checkTransferStatus)
export const initiateDisbursement = initiateTransfer;
export const checkDisbursementStatus = checkTransferStatus;
