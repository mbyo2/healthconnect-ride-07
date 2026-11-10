import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSrc = (p: string) => readFileSync(resolve(__dirname, "../../", p), "utf8");

// Security sweep 2026-11-10 (Doc'O Clock, first full grant sweep — BMaGlass had
// one 2026-11-09; Doc'O Clock had never had it). LIVE baseline before the fix:
// 405 tables granted anon FULL privileges incl. TRUNCATE (TRUNCATE ignores
// RLS, so the publishable anon key alone could wipe them), 411 tables granted
// authenticated TRUNCATE — proven live via has_table_privilege. Anon also had
// INSERT/UPDATE/DELETE on 405 tables. Two functional bugs rode along: anon
// had NO SELECT on healthcare_institutions (public guest directory 401'd)
// and authenticated had NO SELECT on user_two_factor (getTwoFactorStatus()
// always 403'd, so Settings always reported 2FA disabled). These pins lock
// migration 20261110_db_security_sweep.sql so the posture cannot regress.
const rawSql = readSrc("supabase/migrations/20261110_db_security_sweep.sql");
// Strip comment lines: the header documents the pre-fix state in prose —
// only executable SQL may be scanned for grants and predicates.
const sql = rawSql
  .split("\n")
  .filter((l) => !l.trimStart().startsWith("--"))
  .join("\n");

// The genuinely-public read set: SELECT policy qual is auth-independent with
// a public role, proven readable as anon before the sweep; plus
// healthcare_institutions (guest directory, scoped by public_view_institutions).
const PUBLIC_SELECT_TABLES = [
  "allergy_severity",
  "appointment_types",
  "badges",
  "blood_types",
  "clinic_specialty_catalog",
  "countries",
  "courier_ratings",
  "delivery_zones",
  "feature_gates",
  "gender_options",
  "health_articles",
  "healthcare_institutions",
  "institution_locations",
  "institution_services",
  "institution_specialties",
  "institution_types",
  "insurance_plans",
  "insurance_providers",
  "kb_articles",
  "marketplace_products",
  "medical_specialties",
  "medication_dose_ranges",
  "medication_frequency",
  "notification_templates",
  "order_set_items",
  "order_sets",
  "pharmacy_hours",
  "provider_types",
  "regions",
  "relationship_types",
  "service_categories",
  "specialty_staff_roles",
  "subscription_plans",
  "ui_config",
  "vaccination_schedule",
  "zambia_health_regulations",
  "zra_tax_rates",
];

describe("DB security sweep migration (2026-11-10)", () => {
  it("strips the RLS-bypassing privileges from anon and authenticated everywhere", () => {
    expect(sql).toContain(
      "REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;"
    );
  });

  it("revokes all anon table access before re-granting the public set", () => {
    expect(sql).toContain("REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;");
  });

  it.each(PUBLIC_SELECT_TABLES)("grants anon SELECT on public table %s", (t) => {
    expect(sql).toContain(`GRANT SELECT ON public.${t} TO anon;`);
  });

  it("grants anon exactly the public set — no other anon table grant", () => {
    const anonGrants = [...sql.matchAll(/^GRANT (SELECT|INSERT) ON public\.(\w+) TO anon;$/gim)]
      .map((m) => `${m[1]}:${m[2]}`)
      // The two public views are pinned separately below.
      .filter((g) => !g.endsWith(":provider_directory") && !g.endsWith(":shareable_equipment"));
    const expected = [
      ...PUBLIC_SELECT_TABLES.map((t) => `SELECT:${t}`),
      "INSERT:analytics_events",
    ];
    expect(anonGrants.sort()).toEqual(expected.sort());
  });

  it("keeps the single by-design anon write path (anonymous analytics events)", () => {
    expect(sql).toContain("GRANT INSERT ON public.analytics_events TO anon;");
    expect(sql).not.toMatch(/GRANT (UPDATE|DELETE) ON public\.\w+ TO anon;/);
  });

  it("never grants anon TRUNCATE, TRIGGER or REFERENCES anywhere", () => {
    const anonLines = sql.split("\n").filter((l) => /TO anon;/.test(l));
    for (const l of anonLines) {
      expect(l).not.toMatch(/TRUNCATE|TRIGGER|REFERENCES/);
    }
  });

  it("grants anon SELECT only on the two public views", () => {
    expect(sql).toContain("GRANT SELECT ON public.provider_directory TO anon;");
    expect(sql).toContain("GRANT SELECT ON public.shareable_equipment TO anon;");
    const anonViewGrants = [...sql.matchAll(/GRANT \w+ ON public\.(\w+) TO anon;/g)].map((m) => m[1]);
    const views = anonViewGrants.filter((t) =>
      ["provider_directory", "shareable_equipment"].includes(t)
    );
    expect(views).toHaveLength(2);
  });

  it("restores the missing authenticated SELECT on user_two_factor (2FA status read)", () => {
    expect(sql).toContain("GRANT SELECT ON public.user_two_factor TO authenticated;");
  });

  it("grants anon EXECUTE only on the helpers the public institution policies need", () => {
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.is_institution_staff_member(uuid) TO anon;"
    );
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.has_admin_scope(uuid) TO anon;");
  });

  it("revokes every client write privilege on every view", () => {
    expect(sql).toContain("REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon, authenticated");
    expect(sql).toMatch(/relkind IN \('v', 'm'\)/);
  });

  it("aligns public_view_institutions with the columns the app actually sets", () => {
    expect(sql).toContain("DROP POLICY IF EXISTS public_view_institutions ON public.healthcare_institutions;");
    expect(sql).toContain("CREATE POLICY public_view_institutions ON public.healthcare_institutions");
    expect(sql).toContain("is_verified = true");
    expect(sql).toContain("list_in_marketplace = true");
    expect(sql).toContain("payment_mode = 'platform'");
    // The dead clauses: no flow ever sets `verified` true or status 'approved'
    // (all 16 live institutions were status 'pending', verified false).
    // Note: `is_verified` is the live column — match the bare `verified` name.
    const policyBlock = sql.split("CREATE POLICY public_view_institutions")[1] ?? "";
    expect(policyBlock).not.toMatch(/\(\s*verified = true/);
    expect(policyBlock).not.toContain("status = 'approved'");
  });

  it("keeps the admin/own branches of public_view_institutions", () => {
    const policyBlock = sql.split("CREATE POLICY public_view_institutions")[1] ?? "";
    expect(policyBlock).toContain("auth.uid() = admin_id");
    expect(policyBlock).toContain("has_admin_scope(auth.uid())");
  });
});
