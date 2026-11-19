/**
 * exchangeRates service — server-table read path, TTL, and the
 * fail-closed charge gate.
 *
 * The rules under test (CEO order 2026-11-19, mirroring BMaGlass Pay):
 *  - rates come from the public.exchange_rates table (server-side),
 *    never from a browser fetch of a rate feed;
 *  - hard-coded fallback rates are DISPLAY-only;
 *  - charge conversions refuse (FxRateUnavailableError) when no fresh
 *    live server rate exists.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- controllable supabase stub -------------------------------------------
let tableRows: Array<{ to_currency: string; rate: number; valid_from: string }> = [];
let tableError: { message: string } | null = null;
let queryCount = 0;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      queryCount += 1;
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        lte: () => chain,
        gte: () => chain,
        order: () => chain,
        limit: () => Promise.resolve({ data: tableError ? null : tableRows, error: tableError }),
      };
      return chain;
    },
  },
}));

// ---- in-memory storage stub ------------------------------------------------
const store = new Map<string, string>();
vi.mock("@/utils/storage", () => ({
  safeLocalGet: (k: string) => store.get(k) ?? null,
  safeLocalSet: (k: string, v: string) => { store.set(k, v); },
  safeLocalRemove: (k: string) => { store.delete(k); },
}));

async function loadService() {
  vi.resetModules();
  return import("@/services/exchangeRates");
}

const freshRow = (code: string, rate: number, ageMs = 60_000) => ({
  to_currency: code,
  rate,
  valid_from: new Date(Date.now() - ageMs).toISOString(),
});

beforeEach(() => {
  store.clear();
  tableRows = [];
  tableError = null;
  queryCount = 0;
});

describe("exchangeRates — server-table read path", () => {
  it("reads rates from the exchange_rates table and converts with them", async () => {
    tableRows = [freshRow("USD", 0.0486), freshRow("EUR", 0.0447), freshRow("ZAR", 0.87)];
    const fx = await loadService();
    const snap = await fx.refreshRates(true);
    expect(snap.live).toBe(true);
    expect(snap.rates.USD).toBeCloseTo(0.0486);
    expect(fx.ratesAreLive()).toBe(true);
    expect(fx.fromZmw(1000, "USD")).toBeCloseTo(48.6);
    expect(fx.toZmw(48.6, "USD")).toBeCloseTo(1000);
    expect(fx.toZmwForCharge(48.6, "USD")).toBeCloseTo(1000);
    expect(fx.fromZmwForCharge(1000, "USD")).toBeCloseTo(48.6);
  });

  it("serves the cache within the 15-minute TTL without re-querying", async () => {
    tableRows = [freshRow("USD", 0.0486)];
    const fx = await loadService();
    await fx.refreshRates(true);
    const afterFirst = queryCount;
    expect(afterFirst).toBeGreaterThan(0);
    await fx.refreshRates();
    await fx.refreshRates();
    expect(queryCount).toBe(afterFirst);
  });

  it("persists server rates to the local cache for offline resilience", async () => {
    tableRows = [freshRow("USD", 0.0486)];
    const fx = await loadService();
    await fx.refreshRates(true);
    const cached = JSON.parse(store.get("doc_oclock_fx_rates_v2") || "{}");
    expect(cached.live).toBe(true);
    expect(cached.rates.USD).toBeCloseTo(0.0486);
  });
});

describe("exchangeRates — fallback is display-only", () => {
  it("falls back to indicative rates for display when the table is empty", async () => {
    tableRows = [];
    const fx = await loadService();
    const snap = await fx.refreshRates(true);
    expect(snap.live).toBe(false);
    expect(fx.ratesAreLive()).toBe(false);
    // Display conversion still works off the fallback table…
    expect(fx.fromZmw(1000, "USD")).toBeCloseTo(37);
    expect(fx.toZmw(37, "USD")).toBeCloseTo(1000);
  });

  it("refuses charge conversions when only fallback rates exist", async () => {
    tableRows = [];
    const fx = await loadService();
    await fx.refreshRates(true);
    expect(() => fx.toZmwForCharge(50, "USD")).toThrow(fx.FxRateUnavailableError);
    expect(() => fx.fromZmwForCharge(1000, "USD")).toThrow(fx.FxRateUnavailableError);
  });

  it("refuses charge conversions when the table read errors", async () => {
    tableError = { message: "connection reset" };
    const fx = await loadService();
    await fx.refreshRates(true);
    expect(() => fx.toZmwForCharge(50, "EUR")).toThrow(fx.FxRateUnavailableError);
  });

  it("refuses charge conversions for a currency with no live row", async () => {
    tableRows = [freshRow("USD", 0.0486)];
    const fx = await loadService();
    await fx.refreshRates(true);
    expect(() => fx.toZmwForCharge(50, "GBP")).toThrow(fx.FxRateUnavailableError);
  });

  it("treats a stale server cache as not live and refuses charges", async () => {
    // Seed the persisted cache with server rates older than the TTL.
    store.set("doc_oclock_fx_rates_v2", JSON.stringify({
      rates: { ZMW: 1, USD: 0.0486 },
      updatedAt: Date.now() - 16 * 60 * 1000,
      live: true,
    }));
    tableRows = []; // background refresh finds nothing fresher
    const fx = await loadService();
    const snap = fx.getRates();
    expect(snap.live).toBe(false);
    expect(() => fx.toZmwForCharge(50, "USD")).toThrow(fx.FxRateUnavailableError);
  });

  it("never refuses a ZMW-to-ZMW charge conversion (no rate needed)", async () => {
    tableRows = [];
    const fx = await loadService();
    await fx.refreshRates(true);
    expect(fx.toZmwForCharge(250, "ZMW")).toBe(250);
    expect(fx.fromZmwForCharge(250, "ZMW")).toBe(250);
  });
});

describe("exchangeRates — rounding", () => {
  it("rounds zero-decimal currencies to whole units and others to 2dp", async () => {
    const fx = await loadService();
    expect(fx.roundForCurrency(123.6, "JPY")).toBe(124);
    expect(fx.roundForCurrency(123.456, "USD")).toBe(123.46);
  });
});
