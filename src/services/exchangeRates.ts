/**
 * Exchange rates — ZMW is the canonical currency of the platform.
 * ------------------------------------------------------------------
 * Every price stored and charged in the database is Zambian Kwacha.
 * Display in other currencies is a pure presentation conversion using
 * live mid-market rates (same source banks use), refreshed every 12h.
 *
 * Source: open.er-api.com (free, no key, ZeeWee included, daily bank
 * business-day updates). Cached in localStorage so the app works offline
 * and never blocks rendering on the network.
 *
 * Money math rules enforced here:
 *  - convert FROM ZMW for display (multiply by rate)
 *  - convert TO ZMW before sending any amount to a payment rail
 *  - full precision internally, rounded only at display/charge time
 */
import { safeLocalGet, safeLocalSet } from '@/utils/storage';

const RATES_URL = 'https://open.er-api.com/v6/latest/ZMW';
const CACHE_KEY = 'doc_oclock_fx_rates_v1';
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export const BASE_CURRENCY = 'ZMW';

/**
 * Emergency fallback rates (ZMW → foreign). Used ONLY when there is no
 * cached live rate (first-ever offline boot). Replaced by live data on the
 * first successful fetch. Values are indicative Bank of Zambia averages —
 * kept deliberately coarse so nobody mistakes them for live quotes.
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
  updatedAt: number;
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

/** Current rates — cache first, live refresh in background. */
export function getRates(): FxCache {
  if (!memoryCache) {
    memoryCache = readCache() || fallbackCache();
    // Refresh in background when stale; never block the caller.
    if (Date.now() - memoryCache.updatedAt > TTL_MS) {
      void refreshRates();
    }
  }
  return memoryCache;
}

export async function refreshRates(force = false): Promise<FxCache> {
  if (!force && memoryCache && Date.now() - memoryCache.updatedAt < TTL_MS) {
    return memoryCache;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(RATES_URL, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
      const body = await res.json();
      const rates = body?.rates;
      if (!body || body.result !== 'success' || typeof rates !== 'object' || !rates.USD) {
        throw new Error('Bad FX payload');
      }
      memoryCache = { rates: { ZMW: 1, ...rates }, updatedAt: Date.now(), live: true };
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

/** Convert a ZMW amount to the target currency (full precision). */
export function fromZmw(amountZmw: number, toCode: string): number {
  const code = (toCode || BASE_CURRENCY).toUpperCase();
  if (code === BASE_CURRENCY) return amountZmw;
  const rate = getRates().rates[code];
  if (!rate || rate <= 0) return amountZmw; // unknown currency → show ZMW value
  return amountZmw * rate;
}

/** Convert a foreign-currency amount back to ZMW (for charging/top-ups). */
export function toZmw(amount: number, fromCode: string): number {
  const code = (fromCode || BASE_CURRENCY).toUpperCase();
  if (code === BASE_CURRENCY) return amount;
  const rate = getRates().rates[code];
  if (!rate || rate <= 0) return amount;
  return amount / rate;
}

/** Round to chargeable/display precision for a currency. */
export function roundForCurrency(amount: number, code: string): number {
  if (ZERO_DECIMAL.has((code || '').toUpperCase())) return Math.round(amount);
  return Math.round(amount * 100) / 100;
}

/** True when rates came from the live feed (not fallback/cache-stale). */
export function ratesAreLive(): boolean {
  return getRates().live;
}

export function ratesUpdatedAt(): number {
  return getRates().updatedAt;
}
