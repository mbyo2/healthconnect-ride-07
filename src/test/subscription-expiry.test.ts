import { describe, it, expect } from "vitest";
import {
  getEffectiveSubscriptionStatus,
  isPaidSubscription,
  evaluateSubscriptionGate,
  type SubscriptionLike,
} from "@/services/subscriptionStatus";
import {
  applySubscriptionGate,
  isPaidModulePrice,
  type EffectiveModule,
  type ModulePrice,
} from "@/services/institutionModules";

const NOW = new Date("2026-10-20T12:00:00Z");
const PAST = "2026-09-01T00:00:00Z";
const FUTURE = "2026-12-01T00:00:00Z";

const paidPlan = { name: "Clinic Basic", target_audience: "institution", plan_type: "subscription", price_monthly: 8500, price_annual: 102000 };
const freePlan = { name: "Patient Free", target_audience: "patient", plan_type: "free", price_monthly: 0, price_annual: 0 };

const sub = (over: Partial<SubscriptionLike>): SubscriptionLike => ({
  status: "active",
  billing_cycle: "monthly",
  current_period_start: PAST,
  current_period_end: FUTURE,
  plan: paidPlan,
  ...over,
});

describe("getEffectiveSubscriptionStatus", () => {
  it("no row reads as none", () => {
    expect(getEffectiveSubscriptionStatus(null, NOW)).toBe("none");
    expect(getEffectiveSubscriptionStatus(undefined, NOW)).toBe("none");
  });

  it("active with a live period stays active", () => {
    expect(getEffectiveSubscriptionStatus(sub({}), NOW)).toBe("active");
  });

  it("active past its period end reads as expired even though stored says active", () => {
    expect(getEffectiveSubscriptionStatus(sub({ current_period_end: PAST }), NOW)).toBe("expired");
  });

  it("trialing inside the trial stays trialing; past trial_end reads expired", () => {
    expect(getEffectiveSubscriptionStatus(sub({ status: "trialing", trial_end: FUTURE }), NOW)).toBe("trialing");
    expect(getEffectiveSubscriptionStatus(sub({ status: "trialing", trial_end: PAST }), NOW)).toBe("expired");
  });

  it("stored past_due / expired pass through", () => {
    expect(getEffectiveSubscriptionStatus(sub({ status: "past_due" }), NOW)).toBe("past_due");
    expect(getEffectiveSubscriptionStatus(sub({ status: "expired", current_period_end: FUTURE }), NOW)).toBe("expired");
  });

  it("cancelled inside its paid period is not lapsed; past period end is expired", () => {
    expect(getEffectiveSubscriptionStatus(sub({ status: "cancelled", cancel_at_period_end: true }), NOW)).toBe("cancelled");
    expect(getEffectiveSubscriptionStatus(sub({ status: "cancelled", current_period_end: PAST }), NOW)).toBe("expired");
  });

  it("pending never reads as expired", () => {
    expect(getEffectiveSubscriptionStatus(sub({ status: "pending", current_period_end: PAST }), NOW)).toBe("pending");
  });
});

describe("evaluateSubscriptionGate — never-block guarantees", () => {
  it("no subscription row never blocks", () => {
    const gate = evaluateSubscriptionGate(null, NOW);
    expect(gate.effectiveStatus).toBe("none");
    expect(gate.blocksPaidModules).toBe(false);
  });

  it("a lapsed FREE plan never blocks", () => {
    const gate = evaluateSubscriptionGate(sub({ current_period_end: PAST, plan: freePlan }), NOW);
    expect(gate.effectiveStatus).toBe("expired");
    expect(gate.isPaid).toBe(false);
    expect(gate.blocksPaidModules).toBe(false);
  });

  it("a live trial never blocks, even on a paid plan", () => {
    const gate = evaluateSubscriptionGate(sub({ status: "trialing", trial_end: FUTURE }), NOW);
    expect(gate.blocksPaidModules).toBe(false);
  });

  it("a lapsed PAID plan blocks paid modules", () => {
    const gate = evaluateSubscriptionGate(sub({ current_period_end: PAST }), NOW);
    expect(gate.isPaid).toBe(true);
    expect(gate.blocksPaidModules).toBe(true);
  });

  it("past_due on a paid plan blocks; on a free plan it does not", () => {
    expect(evaluateSubscriptionGate(sub({ status: "past_due" }), NOW).blocksPaidModules).toBe(true);
    expect(evaluateSubscriptionGate(sub({ status: "past_due", plan: freePlan }), NOW).blocksPaidModules).toBe(false);
  });

  it("annual cycle uses the annual price", () => {
    expect(isPaidSubscription(sub({ billing_cycle: "annual", plan: { ...paidPlan, price_monthly: 0 } }))).toBe(true);
    expect(isPaidSubscription(sub({ plan: { ...paidPlan, price_monthly: 0, price_annual: 0 } }))).toBe(false);
  });
});

describe("applySubscriptionGate", () => {
  const module = (key: string, effective: EffectiveModule["effective"] = "live"): EffectiveModule => ({
    module_key: key,
    module_name: key,
    description: null,
    status: "live",
    effective,
    source: "charter",
  });
  const prices: Record<string, ModulePrice> = {
    icu: { module_key: "icu", module_name: "ICU", price_monthly: 1500, currency: "ZMW", is_billable: true },
    theatre: { module_key: "theatre", module_name: "Theatre", price_monthly: 0, currency: "ZMW", is_billable: true },
    // ambulance intentionally absent from the price map (= not sold)
  };
  const modules = [module("patient_registration"), module("icu"), module("theatre"), module("ambulance")];
  const blockingGate = evaluateSubscriptionGate(sub({ current_period_end: PAST }), NOW);

  it("isPaidModulePrice requires billable and price > 0", () => {
    expect(isPaidModulePrice(prices.icu)).toBe(true);
    expect(isPaidModulePrice(prices.theatre)).toBe(false);
    expect(isPaidModulePrice(undefined)).toBe(false);
    expect(isPaidModulePrice({ ...prices.icu, is_billable: false })).toBe(false);
    expect(isPaidModulePrice({ ...prices.icu, price_monthly: null })).toBe(false);
  });

  it("non-blocking gate returns the list untouched", () => {
    const open = evaluateSubscriptionGate(null, NOW);
    expect(applySubscriptionGate(modules, prices, open)).toBe(modules);
    expect(applySubscriptionGate(modules, prices, null)).toBe(modules);
  });

  it("blocking gate suspends only priced paid add-ons; core and free modules stay live", () => {
    const gated = applySubscriptionGate(modules, prices, blockingGate);
    const byKey = Object.fromEntries(gated.map((m) => [m.module_key, m]));
    expect(byKey.icu.effective).toBe("disabled");
    expect(byKey.icu.source).toBe("subscription_expired");
    expect(byKey.patient_registration.effective).toBe("live");
    expect(byKey.theatre.effective).toBe("live"); // K0 = included, not sold
    expect(byKey.ambulance.effective).toBe("live"); // no price row = not sold
  });

  it("already-planned modules are left alone", () => {
    const gated = applySubscriptionGate([module("icu", "planned")], prices, blockingGate);
    expect(gated[0].effective).toBe("planned");
    expect(gated[0].source).toBe("charter");
  });
});
