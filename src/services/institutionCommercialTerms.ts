import { supabase } from "@/integrations/supabase/client";

/**
 * Per-institution commercial terms (CEO order 2026-11-24).
 *
 * Governing rule: every commercial term for an institution — pilot free
 * days, pilot per-doctor / per-facility rates, year-one discount, tier
 * monthly rate, founding-cohort membership — is variable PER
 * INSTITUTION by the platform super_admin, so a specific arrangement
 * with a hospital can always be honoured in the system. The platform
 * values below are DEFAULTS ONLY; an override row in
 * `institution_commercial_terms` wins wherever it sets a value.
 *
 * The single source of truth for resolution is the SQL function
 * `get_institution_effective_terms` (migration
 * 20261124_institution_commercial_terms.sql). `resolveEffectiveTerms`
 * here mirrors that rule in pure TS for display code and unit tests —
 * keep the two in step.
 *
 * NOTE: no billing consumer exists yet — the platform is pre-revenue
 * and nothing charges institutions today. This service + the superadmin
 * editor are the surface future billing must read terms through.
 */

export const PLATFORM_COMMERCIAL_DEFAULTS = {
  /** Founding Clinics pilot: free days before pilot rates apply. */
  pilotFreeDays: 30,
  /** Founding Clinics pilot rate per doctor per month (ZMW). */
  pilotPerDoctorRate: 350,
  /** Founding Clinics pilot rate per facility per month (ZMW). */
  pilotFacilityRate: 2500,
  /** Standard year-one discount ceiling (percent off tier list price). */
  yearOneDiscountPct: 50,
  /** Founding Clinics cohort cap (platform default, not per-institution). */
  foundingCohortCap: 5,
  currency: "ZMW",
} as const;

/** One override row from institution_commercial_terms (all terms nullable). */
export interface CommercialTermsOverride {
  institution_id: string;
  tier_monthly_rate_override: number | null;
  pilot_free_days: number | null;
  pilot_per_doctor_rate: number | null;
  pilot_facility_rate: number | null;
  year_one_discount_pct: number | null;
  is_founding_cohort: boolean | null;
  pilot_started_at: string | null;
  notes: string | null;
  updated_by: string | null;
  created_at?: string;
  updated_at?: string;
}

/** The institution's current tier plan (list price source). */
export interface InstitutionTierPlan {
  planId: string | null;
  planName: string | null;
  listMonthly: number | null;
}

export interface EffectiveCommercialTerms {
  institutionId: string;
  tierPlanId: string | null;
  tierName: string | null;
  tierListMonthly: number | null;
  /** Agreed tier monthly rate: override where set, else list price. */
  tierMonthlyRate: number | null;
  /** Year-one discount %: override where set, else the 50% default. */
  yearOneDiscountPct: number;
  /** tierMonthlyRate after the year-one discount (null when no tier). */
  yearOneMonthlyRate: number | null;
  pilotFreeDays: number;
  pilotPerDoctorRate: number;
  pilotFacilityRate: number;
  isFoundingCohort: boolean;
  foundingCohortCap: number;
  pilotStartedAt: string | null;
  hasOverride: boolean;
  currency: string;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Pure resolution rule — override where set, else platform default.
 * Mirrors public.get_institution_effective_terms().
 */
export function resolveEffectiveTerms(
  institutionId: string,
  override: Partial<CommercialTermsOverride> | null | undefined,
  tier: InstitutionTierPlan
): EffectiveCommercialTerms {
  const o = override ?? null;
  const tierMonthlyRate = num(o?.tier_monthly_rate_override) ?? tier.listMonthly;
  const discount = num(o?.year_one_discount_pct) ?? PLATFORM_COMMERCIAL_DEFAULTS.yearOneDiscountPct;
  return {
    institutionId,
    tierPlanId: tier.planId,
    tierName: tier.planName,
    tierListMonthly: tier.listMonthly,
    tierMonthlyRate,
    yearOneDiscountPct: discount,
    yearOneMonthlyRate:
      tierMonthlyRate === null
        ? null
        : Math.round(tierMonthlyRate * (1 - discount / 100) * 100) / 100,
    pilotFreeDays: num(o?.pilot_free_days) ?? PLATFORM_COMMERCIAL_DEFAULTS.pilotFreeDays,
    pilotPerDoctorRate:
      num(o?.pilot_per_doctor_rate) ?? PLATFORM_COMMERCIAL_DEFAULTS.pilotPerDoctorRate,
    pilotFacilityRate: num(o?.pilot_facility_rate) ?? PLATFORM_COMMERCIAL_DEFAULTS.pilotFacilityRate,
    isFoundingCohort: o?.is_founding_cohort ?? false,
    foundingCohortCap: PLATFORM_COMMERCIAL_DEFAULTS.foundingCohortCap,
    pilotStartedAt: o?.pilot_started_at ?? null,
    hasOverride: !!o && !!o.institution_id,
    currency: PLATFORM_COMMERCIAL_DEFAULTS.currency,
  };
}

/** Map one row returned by get_institution_effective_terms() to the TS shape. */
export function mapEffectiveTermsRow(row: any): EffectiveCommercialTerms {
  return {
    institutionId: row.institution_id,
    tierPlanId: row.tier_plan_id ?? null,
    tierName: row.tier_name ?? null,
    tierListMonthly: num(row.tier_list_monthly),
    tierMonthlyRate: num(row.eff_tier_monthly_rate),
    yearOneDiscountPct: num(row.eff_year_one_discount_pct) ?? PLATFORM_COMMERCIAL_DEFAULTS.yearOneDiscountPct,
    yearOneMonthlyRate: num(row.eff_year_one_monthly_rate),
    pilotFreeDays: num(row.eff_pilot_free_days) ?? PLATFORM_COMMERCIAL_DEFAULTS.pilotFreeDays,
    pilotPerDoctorRate: num(row.eff_pilot_per_doctor_rate) ?? PLATFORM_COMMERCIAL_DEFAULTS.pilotPerDoctorRate,
    pilotFacilityRate: num(row.eff_pilot_facility_rate) ?? PLATFORM_COMMERCIAL_DEFAULTS.pilotFacilityRate,
    isFoundingCohort: !!row.eff_is_founding_cohort,
    foundingCohortCap: num(row.founding_cohort_cap) ?? PLATFORM_COMMERCIAL_DEFAULTS.foundingCohortCap,
    pilotStartedAt: row.pilot_started_at ?? null,
    hasOverride: !!row.has_override,
    currency: row.currency || PLATFORM_COMMERCIAL_DEFAULTS.currency,
  };
}

/** Effective terms for one institution, resolved server-side. */
export async function fetchEffectiveTerms(
  institutionId: string
): Promise<EffectiveCommercialTerms> {
  const { data, error } = await (supabase.rpc as any)("get_institution_effective_terms", {
    p_institution_id: institutionId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("No commercial terms could be loaded for this institution.");
  return mapEffectiveTermsRow(row);
}

/** The raw override row for one institution (null when none exists). */
export async function fetchCommercialTermsOverride(
  institutionId: string
): Promise<CommercialTermsOverride | null> {
  const { data, error } = await (supabase.from("institution_commercial_terms" as any) as any)
    .select("*")
    .eq("institution_id", institutionId)
    .maybeSingle();
  if (error) throw error;
  return (data as CommercialTermsOverride | null) ?? null;
}

/** All override rows (superadmin editor list). */
export async function fetchAllCommercialTermsOverrides(): Promise<CommercialTermsOverride[]> {
  const { data, error } = await (supabase.from("institution_commercial_terms" as any) as any)
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as CommercialTermsOverride[]) || [];
}

/**
 * Create or replace an institution's override row. Super_admin only —
 * RLS refuses anyone else. Blank form fields must be passed as null so
 * the platform default applies for that term.
 */
export async function upsertCommercialTermsOverride(
  values: Omit<CommercialTermsOverride, "updated_by" | "created_at" | "updated_at">
): Promise<void> {
  const { error } = await (supabase.from("institution_commercial_terms" as any) as any).upsert(
    {
      institution_id: values.institution_id,
      tier_monthly_rate_override: values.tier_monthly_rate_override,
      pilot_free_days: values.pilot_free_days,
      pilot_per_doctor_rate: values.pilot_per_doctor_rate,
      pilot_facility_rate: values.pilot_facility_rate,
      year_one_discount_pct: values.year_one_discount_pct,
      is_founding_cohort: values.is_founding_cohort,
      pilot_started_at: values.pilot_started_at,
      notes: values.notes,
    },
    { onConflict: "institution_id" }
  );
  if (error) throw error;
}

/** Remove an institution's override row entirely (back to pure defaults). */
export async function clearCommercialTermsOverride(institutionId: string): Promise<void> {
  const { error } = await (supabase.from("institution_commercial_terms" as any) as any)
    .delete()
    .eq("institution_id", institutionId);
  if (error) throw error;
}
