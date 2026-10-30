import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSrc = (p: string) => readFileSync(resolve(__dirname, "../../", p), "utf8");

// Security audit 2026-10-30: five tables' SELECT policies had drifted live to
// USING (true) for PUBLIC — anon callers with only the publishable key could
// read patient lab data, patient merge records and doctor earnings (proven
// live with seeded rows, before and after). These pins lock the corrective
// migration so the drift cannot be reintroduced by editing the file.
const rawSql = readSrc("supabase/migrations/20261030_security_rls_drift_restore.sql");
// Strip comment lines: the header comment describes the drift ("USING (true)")
// in prose — only executable SQL may be scanned for predicates.
const sql = rawSql
  .split("\n")
  .filter((l) => !l.trimStart().startsWith("--"))
  .join("\n");

const TABLES = [
  "lis_results",
  "patient_merges",
  "doctor_fraction_earnings",
  "doctor_fraction_rules",
  "institution_reminder_settings",
];

describe("RLS drift restore migration (2026-10-30 security audit)", () => {
  it("never uses a permissive true predicate anywhere", () => {
    expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)/i);
    expect(sql).not.toMatch(/WITH CHECK\s*\(\s*true\s*\)/i);
  });

  it.each(TABLES)("revokes all anon access on %s", (t) => {
    expect(sql).toContain(`REVOKE ALL ON public.${t} FROM anon;`);
  });

  it("scopes lis_results reads to institution staff via the definer helper", () => {
    expect(sql).toContain('CREATE POLICY "Institution staff view LIS results"');
    expect(sql).toContain("public.is_institution_staff(institution_id, auth.uid())");
    expect(sql).toMatch(/lis_results FOR SELECT TO authenticated/);
  });

  it("scopes patient_merges reads to the shared merge-admin gate", () => {
    expect(sql).toContain('CREATE POLICY "Admins view merges"');
    expect(sql).toContain("public.can_merge_patients()");
    expect(sql).toMatch(/patient_merges FOR SELECT TO authenticated/);
  });

  it("restores EXECUTE on can_merge_patients for authenticated (the drift's root cause)", () => {
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.can_merge_patients() TO authenticated;"
    );
  });

  it("scopes fraction earnings to the doctor, institution staff, or institution admin", () => {
    expect(sql).toContain('CREATE POLICY "View fraction earnings"');
    expect(sql).toContain("doctor_id = auth.uid()");
    expect(sql).toContain("public.is_institution_admin(institution_id)");
    expect(sql).toMatch(/doctor_fraction_earnings FOR SELECT TO authenticated/);
  });

  it("restores the institution-admin manage policy on fraction rules (write path)", () => {
    expect(sql).toContain('CREATE POLICY "Admins manage fraction rules"');
    expect(sql).toMatch(/doctor_fraction_rules FOR ALL TO authenticated/);
    expect(sql).toContain(
      "WITH CHECK (public.is_institution_admin(institution_id))"
    );
  });

  it("strips TRUNCATE/REFERENCES/TRIGGER (RLS-bypassing or schema-level) from authenticated on every fixed table", () => {
    for (const t of TABLES) {
      expect(sql).toMatch(
        new RegExp(`REVOKE[^;]*TRUNCATE, REFERENCES, TRIGGER ON public\\.${t} FROM authenticated;`)
      );
    }
  });

  it("drops each drifted policy before recreating it (idempotent, no permissive-OR leftovers)", () => {
    for (const name of [
      "Institution staff view LIS results",
      "Admins view merges",
      "View fraction earnings",
      "Institution staff view fraction rules",
      "Admins manage fraction rules",
      "Institution staff view reminder settings",
    ]) {
      expect(sql).toContain(`DROP POLICY IF EXISTS "${name}"`);
      expect(sql).toContain(`CREATE POLICY "${name}"`);
    }
  });
});
