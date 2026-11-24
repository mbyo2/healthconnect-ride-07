import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PLATFORM_COMMERCIAL_DEFAULTS,
  resolveEffectiveTerms,
  mapEffectiveTermsRow,
  type CommercialTermsOverride,
} from "@/services/institutionCommercialTerms";

// Per-institution commercial terms (CEO order 2026-11-24): platform
// values are DEFAULTS ONLY; a super_admin override wins per institution
// wherever it sets a value. These tests pin the resolution rule in the
// TS mirror and the guarantees written into the migration (super_admin
// -only writes, scoped grants, server-side resolver defaults).

const INST = "11111111-1111-1111-1111-111111111111";
const STANDARD = { planId: "plan-std", planName: "Hospital Standard", listMonthly: 22000 };

const ovr = (over: Partial<CommercialTermsOverride>): CommercialTermsOverride => ({
  institution_id: INST,
  tier_monthly_rate_override: null,
  pilot_free_days: null,
  pilot_per_doctor_rate: null,
  pilot_facility_rate: null,
  year_one_discount_pct: null,
  is_founding_cohort: null,
  pilot_started_at: null,
  notes: null,
  updated_by: null,
  ...over,
});

describe("resolveEffectiveTerms — defaults when no override exists", () => {
  it("applies the settled Founding Clinics defaults", () => {
    const eff = resolveEffectiveTerms(INST, null, STANDARD);
    expect(eff.pilotFreeDays).toBe(30);
    expect(eff.pilotPerDoctorRate).toBe(350);
    expect(eff.pilotFacilityRate).toBe(2500);
    expect(eff.yearOneDiscountPct).toBe(50);
    expect(eff.foundingCohortCap).toBe(5);
    expect(eff.isFoundingCohort).toBe(false);
    expect(eff.hasOverride).toBe(false);
  });

  it("prices the tier at list, halved in year one at the default discount", () => {
    const eff = resolveEffectiveTerms(INST, null, STANDARD);
    expect(eff.tierMonthlyRate).toBe(22000);
    expect(eff.yearOneMonthlyRate).toBe(11000);
  });

  it("treats an all-NULL override row's terms as defaults but flags the override", () => {
    const eff = resolveEffectiveTerms(INST, ovr({ notes: "watch this space" }), STANDARD);
    expect(eff.pilotFreeDays).toBe(PLATFORM_COMMERCIAL_DEFAULTS.pilotFreeDays);
    expect(eff.hasOverride).toBe(true);
  });
});

describe("resolveEffectiveTerms — overrides win per term", () => {
  it("honours a bespoke arrangement on every term at once", () => {
    const eff = resolveEffectiveTerms(
      INST,
      ovr({
        tier_monthly_rate_override: 18000,
        pilot_free_days: 45,
        pilot_per_doctor_rate: 300,
        pilot_facility_rate: 2000,
        year_one_discount_pct: 60,
        is_founding_cohort: true,
        pilot_started_at: "2026-12-01T00:00:00Z",
      }),
      STANDARD
    );
    expect(eff.tierMonthlyRate).toBe(18000);
    expect(eff.yearOneMonthlyRate).toBe(7200); // 18000 * (1 - 0.60)
    expect(eff.pilotFreeDays).toBe(45);
    expect(eff.pilotPerDoctorRate).toBe(300);
    expect(eff.pilotFacilityRate).toBe(2000);
    expect(eff.isFoundingCohort).toBe(true);
    expect(eff.pilotStartedAt).toBe("2026-12-01T00:00:00Z");
  });

  it("mixes override and default term by term", () => {
    const eff = resolveEffectiveTerms(INST, ovr({ pilot_free_days: 90 }), STANDARD);
    expect(eff.pilotFreeDays).toBe(90);
    expect(eff.pilotPerDoctorRate).toBe(350);
    expect(eff.yearOneDiscountPct).toBe(50);
  });

  it("lets a super_admin arrangement exceed the standard 50% discount", () => {
    const eff = resolveEffectiveTerms(INST, ovr({ year_one_discount_pct: 75 }), STANDARD);
    expect(eff.yearOneMonthlyRate).toBe(5500);
  });

  it("handles an institution with no tier subscription yet", () => {
    const eff = resolveEffectiveTerms(INST, ovr({ pilot_free_days: 10 }), {
      planId: null,
      planName: null,
      listMonthly: null,
    });
    expect(eff.tierMonthlyRate).toBeNull();
    expect(eff.yearOneMonthlyRate).toBeNull();
    expect(eff.pilotFreeDays).toBe(10);
  });
});

describe("mapEffectiveTermsRow — SQL resolver row shape", () => {
  it("maps the get_institution_effective_terms columns", () => {
    const eff = mapEffectiveTermsRow({
      institution_id: INST,
      tier_plan_id: "plan-std",
      tier_name: "Hospital Standard",
      tier_list_monthly: "22000.00",
      eff_tier_monthly_rate: "22000.00",
      eff_year_one_discount_pct: "50.00",
      eff_year_one_monthly_rate: "11000.00",
      eff_pilot_free_days: 30,
      eff_pilot_per_doctor_rate: "350.00",
      eff_pilot_facility_rate: "2500.00",
      eff_is_founding_cohort: false,
      founding_cohort_cap: 5,
      pilot_started_at: null,
      has_override: false,
      currency: "ZMW",
    });
    expect(eff.tierMonthlyRate).toBe(22000);
    expect(eff.yearOneMonthlyRate).toBe(11000);
    expect(eff.pilotPerDoctorRate).toBe(350);
    expect(eff.currency).toBe("ZMW");
  });
});

describe("migration 20261124_institution_commercial_terms — guarantees", () => {
  const sql = readFileSync(
    resolve(__dirname, "../../supabase/migrations/20261124_institution_commercial_terms.sql"),
    "utf8"
  );

  it("creates the override table with nullable term columns", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.institution_commercial_terms");
    for (const col of [
      "tier_monthly_rate_override",
      "pilot_free_days",
      "pilot_per_doctor_rate",
      "pilot_facility_rate",
      "year_one_discount_pct",
      "is_founding_cohort",
      "pilot_started_at",
      "notes",
      "updated_by",
    ]) {
      expect(sql).toContain(col);
    }
  });

  it("gates every write verb to platform super_admin via RLS", () => {
    for (const verb of ["INSERT", "UPDATE", "DELETE"]) {
      expect(sql).toContain(`FOR ${verb}`);
    }
    const writePolicies = sql.match(/has_role\(auth\.uid\(\), 'super_admin'::public\.app_role\)/g) || [];
    // SELECT policy (1) + INSERT/UPDATE(using+check)/DELETE (4) + resolver check (1)
    expect(writePolicies.length).toBeGreaterThanOrEqual(6);
  });

  it("carries the CEO scoped grants and trims the default-privilege blanket", () => {
    expect(sql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_commercial_terms TO authenticated"
    );
    expect(sql).toContain("REVOKE ALL ON public.institution_commercial_terms FROM anon");
    const codeOnly = sql
      .split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n");
    expect(codeOnly).not.toMatch(/GRANT[^;]*\bTO\s+public\b/i);
  });

  it("resolves with the settled defaults server-side", () => {
    expect(sql).toContain("get_institution_effective_terms");
    expect(sql).toContain("COALESCE(v_ovr.pilot_free_days, 30)");
    expect(sql).toContain("COALESCE(v_ovr.pilot_per_doctor_rate, 350)");
    expect(sql).toContain("COALESCE(v_ovr.pilot_facility_rate, 2500)");
    expect(sql).toContain("COALESCE(v_ovr.year_one_discount_pct, 50)");
    expect(sql).toContain("founding_cohort_cap := 5");
  });

  it("audit-logs changes and stamps updated_by server-side", () => {
    expect(sql).toContain("institution_commercial_terms_changed");
    expect(sql).toContain("security_audit_log");
    expect(sql).toContain("set_commercial_terms_stamp");
  });
});
