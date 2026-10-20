import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Subscription expiry enforcement — effective-status layer.
 * ------------------------------------------------------------------
 * The stored `user_subscriptions.status` is only ever written at
 * subscribe / cancel time, so a paid period that simply runs out keeps
 * reading "active" forever. This module computes the EFFECTIVE status
 * client-side: a subscription whose paid (or trial) period has ended
 * reads as "expired" even when the stored status still says "active".
 *
 * Safety contract (no paying customers yet, all module add-on prices
 * are K0 — enforcement must never lock out the wrong institution):
 *   - No subscription row            -> "none", NEVER blocks.
 *   - Free plan (price 0 / plan_type 'free' / pay-per-booking)
 *                                     -> NEVER blocks, even if lapsed.
 *   - Trial still inside trial_end    -> NEVER blocks.
 *   - Pending (payment not completed) -> NEVER blocks (a failed or
 *     abandoned checkout must not downgrade an existing workspace).
 *   - Only a PAID plan whose effective status is "expired" or
 *     "past_due" blocks — and even then only paid add-on modules are
 *     gated (see applySubscriptionGate in institutionModules.ts);
 *     core/charter access is untouched.
 *
 * Institution linkage: there is NO institution_subscriptions table and
 * no subscription column on healthcare_institutions (verified against
 * the live schema 2026-10-20). An institution's subscription is the
 * `user_subscriptions` row owned by the institution's admin user
 * (healthcare_institutions.admin_id), preferring plans whose
 * target_audience is 'institution'.
 */

export type StoredSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "expired"
  | "cancelled"
  | "pending"
  | string;

export type EffectiveSubscriptionStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "expired"
  | "cancelled"
  | "pending";

export interface SubscriptionPlanLike {
  name?: string | null;
  slug?: string | null;
  target_audience?: string | null;
  plan_type?: string | null;
  price_monthly?: number | string | null;
  price_annual?: number | string | null;
}

export interface SubscriptionLike {
  id?: string;
  user_id?: string;
  status?: StoredSubscriptionStatus | null;
  billing_cycle?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  trial_start?: string | null;
  trial_end?: string | null;
  cancel_at_period_end?: boolean | null;
  plan?: SubscriptionPlanLike | null;
}

export interface SubscriptionGateState {
  /** The raw subscription row (null when the institution has none). */
  subscription: SubscriptionLike | null;
  /** Stored status, normalised ('none' when there is no row). */
  storedStatus: EffectiveSubscriptionStatus;
  /** Effective status after applying period/trial end dates. */
  effectiveStatus: EffectiveSubscriptionStatus;
  /** True when the plan costs money for the subscription's cycle. */
  isPaid: boolean;
  /** True only for a paid plan that is effectively expired/past_due. */
  blocksPaidModules: boolean;
  /** When the current paid/trial period ends (ISO string, if known). */
  periodEnd: string | null;
  planName: string | null;
}

const NONE_GATE: SubscriptionGateState = {
  subscription: null,
  storedStatus: "none",
  effectiveStatus: "none",
  isPaid: false,
  blocksPaidModules: false,
  periodEnd: null,
  planName: null,
};

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function hasEnded(value: string | null | undefined, now: Date): boolean {
  const t = parseTime(value);
  return t !== null && t <= now.getTime();
}

/**
 * Effective status: the stored status corrected by the period dates.
 * A row stored as active/trialing whose period (or trial) has ended
 * reads as "expired". A cancelled row still inside its paid period
 * reads as "cancelled" (not lapsed — access runs to period end).
 */
export function getEffectiveSubscriptionStatus(
  sub: SubscriptionLike | null | undefined,
  now: Date = new Date()
): EffectiveSubscriptionStatus {
  if (!sub) return "none";
  const stored = (sub.status || "").toLowerCase();

  switch (stored) {
    case "expired":
      return "expired";
    case "past_due":
      // Payment already failed — past due regardless of the period date.
      return "past_due";
    case "pending":
      return "pending";
    case "trialing": {
      const trialEnd = sub.trial_end ?? sub.current_period_end;
      return hasEnded(trialEnd, now) ? "expired" : "trialing";
    }
    case "active": {
      return hasEnded(sub.current_period_end, now) ? "expired" : "active";
    }
    case "cancelled": {
      // Paid through the period end; lapsed only once that passes.
      return hasEnded(sub.current_period_end, now) ? "expired" : "cancelled";
    }
    case "":
      return "none";
    default: {
      // Unknown stored status: fall back to the period date rather than
      // inventing access or a lockout.
      return hasEnded(sub.current_period_end, now) ? "expired" : "active";
    }
  }
}

function toAmount(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/**
 * Whether this subscription is a PAID subscription for its billing
 * cycle. Free plans (plan_type 'free', or a zero price for the cycle)
 * and pay-per-booking plans are never paid subscriptions, so they can
 * never block. When the cycle price is unset, falls back to the other
 * cycle's price — but a price must actually be > 0 to count as paid.
 */
export function isPaidSubscription(sub: SubscriptionLike | null | undefined): boolean {
  if (!sub?.plan) return false;
  const planType = (sub.plan.plan_type || "").toLowerCase();
  if (planType === "free" || planType === "pay_per_booking") return false;
  const monthly = toAmount(sub.plan.price_monthly);
  const annual = toAmount(sub.plan.price_annual);
  const cyclePrice = (sub.billing_cycle || "").toLowerCase() === "annual" ? annual : monthly;
  return (cyclePrice > 0 ? cyclePrice : Math.max(monthly, annual)) > 0;
}

/** Full gate evaluation for one subscription row (pure). */
export function evaluateSubscriptionGate(
  sub: SubscriptionLike | null | undefined,
  now: Date = new Date()
): SubscriptionGateState {
  if (!sub) return { ...NONE_GATE };
  const effectiveStatus = getEffectiveSubscriptionStatus(sub, now);
  const isPaid = isPaidSubscription(sub);
  return {
    subscription: sub,
    storedStatus: (sub.status || "none").toLowerCase() as EffectiveSubscriptionStatus,
    effectiveStatus,
    isPaid,
    blocksPaidModules:
      isPaid && (effectiveStatus === "expired" || effectiveStatus === "past_due"),
    periodEnd: sub.current_period_end ?? sub.trial_end ?? null,
    planName: sub.plan?.name ?? null,
  };
}

/**
 * Resolve the subscription gate for an institution: the subscription
 * row owned by the institution's admin user, preferring an
 * institution-audience plan when the admin holds several rows.
 *
 * Fail-open by design: any lookup error, a missing admin_id, or no
 * subscription row returns the "none" gate (never blocks).
 */
export async function getInstitutionSubscriptionGate(
  supabase: SupabaseClient,
  institutionId: string
): Promise<SubscriptionGateState> {
  try {
    const { data: inst, error: instError } = await supabase
      .from("healthcare_institutions")
      .select("id, admin_id")
      .eq("id", institutionId)
      .maybeSingle();
    if (instError || !inst?.admin_id) return { ...NONE_GATE };

    const { data, error } = await (supabase as any)
      .from("user_subscriptions")
      .select("*, plan:subscription_plans(*)")
      .eq("user_id", inst.admin_id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error || !data || data.length === 0) return { ...NONE_GATE };

    const rows = data as SubscriptionLike[];
    const chosen =
      rows.find((r) => (r.plan?.target_audience || "").toLowerCase() === "institution") ??
      rows[0];
    return evaluateSubscriptionGate(chosen);
  } catch {
    return { ...NONE_GATE };
  }
}
