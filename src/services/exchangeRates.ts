/**
 * Exchange rates — ZMW is the canonical currency of the platform.
 * ------------------------------------------------------------------
 * Every price stored and charged in the database is Zambian Kwacha.
 * Display in other currencies is a pure presentation conversion.
 *
 * Rates are SERVER-SIDE reference data: the fetch-exchange-rates edge
 * function refreshes public.exchange_rates every 10 minutes from live
 * feeds (exchangerate-api primary, open.er-api fallback), and this
 * service reads the latest valid rows from that table. The browser
 * never fetches a rate feed itself and no rate that affects a charge
 * ever comes from a hard-coded constant — the same rule the platform
 * applies to tax.
 *
 * The hard-coded FALLBACK_RATES below are DISPLAY-ONLY: they render
 * indicative figures on a first-ever offline boot before any server
 * rate has been cached. Charge conversions (toZmwForCharge /
 * fromZmwForCharge) refuse with FxRateUnavailableError whenever no
 * fresh live server rate is available, so a payment rail can never be
 * priced off them.
 *
 * Money math rules enforced here:
 *  - convert FROM ZMW for display (multiply by rate)
 *  - convert TO ZMW before sending any amount to a payment rail
 *  - full precision internally, rounded only at display/charge time
 */
import { supabase } from '@/integrations/supabase/client';
import { safeLocalGet, safeLocalSet } from '@/utils/storage';

const CACHE_KEY = 'doc_oclock_fx_rates_v2';
const TTL_MS = 15 * 60 * 1000; // 15 minutes

export const BASE_CURRENCY = 'ZMW';

/**
 * Thrown by the charge-path converters when no fresh live server rate
 * is available. Callers surface `message` to the user as-is — it is
 * written in plain language for exactly that purpose.
 */
export class FxRateUnavailableError extends Error {
  constructor(message = 'Live exchange rates are unavailable right now, so this payment cannot be priced safely. Please try again in a moment.') {
    super(message);
    this.name = 'FxRateUnavailableError';
  }
}

/**
 * Emergency DISPLAY-ONLY rates (ZMW → foreign). Used only to render
 * indicative figures when no server rate has ever been cached (first
 * offline boot). Never usable for a charge — see the *ForCharge
 * converters. Values are indicative Bank of Zambia averages, kept
 * deliberately coarse so nobody mistakes them for live quotes.
 */
const FALLBACK_RATES: Record<string, number> = {
  ZMW: 1,
  USD: 0.037,
  EUR: 0.034,
  GBP: 0.029,
  ZAR: 0.68,
  KES: 4.8,
  NGN: 57,
  GHS: 0.56,
  TZS: 98,
  UGX: 137,
  RWF: 52,
  BWP: 0.5,
  MWK: 64,
  MZN: 2.4,
  CDF: 107,
  INR: 3.2,
  CNY: 0.27,
  JPY: 5.6,
  AUD: 0.057,
  CAD: 0.051,
  AED: 0.136,
};

/** Currencies that have no minor unit (no decimals at display/charge). */
const ZERO_DECIMAL = new Set(['JPY', 'RWF', 'UGX', 'CDF', 'VND', 'KRW', 'CLP', 'GNF']);

interface FxCache {
  rates: Record<string, number>;
  /** When the rates were set server-side (valid_from of the newest row),
   *  or when the cache was built for fallback data (0). */
  updatedAt: number;
  /** True when the rates came from the server table (vs fallback). */
  live: boolean;
}

function readCache(): FxCache | null {
  try {
    const raw = safeLocalGet(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FxCache;
    if (!parsed || typeof parsed.rates !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

let memoryCache: FxCache | null = null;
let inflight: Promise<FxCache> | null = null;

function fallbackCache(): FxCache {
  return { rates: { ...FALLBACK_RATES }, updatedAt: 0, live: false };
}

function isFresh(cache: FxCache): boolean {
  return cache.live && Date.now() - cache.updatedAt <= TTL_MS;
}

/**
 * Current rates — cache first, server refresh in background when stale.
 * The returned `live` flag is freshness-aware: it is true only when the
 * rates are server-sourced AND within the TTL, so badges and charge
 * gates never present old data as live.
 */
export function getRates(): FxCache {
  if (!memoryCache) {
    memoryCache = readCache() || fallbackCache();
    // Refresh in background when stale; never block the caller.
    if (!isFresh(memoryCache)) {
      void refreshRates();
    }
  }
  const cache = memoryCache;
  return { ...cache, live: isFresh(cache) };
}

/** Read the latest valid ZMW-pair rows from the server table. */
async function fetchServerRates(): Promise<FxCache> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('to_currency, rate, valid_from')
    .eq('from_currency', BASE_CURRENCY)
    .lte('valid_from', nowIso)
    .gte('valid_until', nowIso)
    .order('valid_from', { ascending: false })
    .limit(100);
  if (error) throw new Error(`FX table read failed: ${error.message}`);
  const rates: Record<string, number> = { ZMW: 1 };
  let newest = 0;
  for (const row of (data ?? []) as Array<{ to_currency: string; rate: number | string; valid_from: string }>) {
    const code = String(row.to_currency || '').toUpperCase();
    if (!code || rates[code] !== undefined) continue; // first row per currency = newest
    const rate = Number(row.rate);
    if (!(rate > 0)) continue;
    rates[code] = rate;
    const ts = Date.parse(row.valid_from);
    if (Number.isFinite(ts)) newest = Math.max(newest, ts);
  }
  if (!rates.USD || !newest) throw new Error('No live server FX rows available');
  return { rates, updatedAt: newest, live: true };
}

export async function refreshRates(force = false): Promise<FxCache> {
  if (!force && memoryCache && isFresh(memoryCache)) {
    return memoryCache;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      memoryCache = await fetchServerRates();
      safeLocalSet(CACHE_KEY, JSON.stringify(memoryCache));
    } catch (e) {
      console.warn('Live FX rates unavailable, using cached/fallback rates:', e);
      if (!memoryCache) memoryCache = readCache() || fallbackCache();
    } finally {
      inflight = null;
    }
    return memoryCache as FxCache;
  })();
  return inflight;
}

/** Convert a ZMW amount to the target currency (full precision). DISPLAY path — fallback rates allowed. */
export function fromZmw(amountZmw: number, toCode: string): number {
  const code = (toCode || BASE_CURRENCY).toUpperCase();
  if (code === BASE_CURRENCY) return amountZmw;
  const rate = getRates().rates[code];
  if (!rate || rate <= 0) return amountZmw; // unknown currency → show ZMW value
  return amountZmw * rate;
}

/** Convert a foreign-currency amount back to ZMW. DISPLAY path — fallback rates allowed. */
export function toZmw(amount: number, fromCode: string): number {
  const code = (fromCode || BASE_CURRENCY).toUpperCase();
  if (code === BASE_CURRENCY) return amount;
  const rate = getRates().rates[code];
  if (!rate || rate <= 0) return amount;
  return amount / rate;
}

/**
 * Charge-path rate gate: returns the fresh live rate for `code` or
 * throws FxRateUnavailableError. ZMW itself never needs a rate.
 */
function chargeRate(code: string): number {
  const snap = getRates();
  if (!snap.live) throw new FxRateUnavailableError();
  const rate = snap.rates[code];
  if (!rate || rate <= 0) {
    throw new FxRateUnavailableError(`No live exchange rate for ${code} is available right now, so this payment cannot be priced safely. Please try again in a moment.`);
  }
  return rate;
}

/**
 * Convert a foreign-currency amount to ZMW for a CHARGE (payment rail).
 * Refuses — throws FxRateUnavailableError — when no fresh live server
 * rate is available; fallback/display rates are never used here.
 */
export function toZmwForCharge(amount: number, fromCode: string): number {
  const code = (fromCode || BASE_CURRENCY).toUpperCase();
  if (code === BASE_CURRENCY) return amount;
  return amount / chargeRate(code);
}

/**
 * Convert a ZMW amount to a foreign currency for a CHARGE (payment
 * rail). Same fail-closed rule as toZmwForCharge.
 */
export function fromZmwForCharge(amountZmw: number, toCode: string): number {
  const code = (toCode || BASE_CURRENCY).toUpperCase();
  if (code === BASE_CURRENCY) return amountZmw;
  return amountZmw * chargeRate(code);
}

/** Round to chargeable/display precision for a currency. */
export function roundForCurrency(amount: number, code: string): number {
  if (ZERO_DECIMAL.has((code || '').toUpperCase())) return Math.round(amount);
  return Math.round(amount * 100) / 100;
}

/** True when rates are fresh live server rates (not fallback/stale). */
export function ratesAreLive(): boolean {
  return getRates().live;
}

export function ratesUpdatedAt(): number {
  return getRates().updatedAt;
}
