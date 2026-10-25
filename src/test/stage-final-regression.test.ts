import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// Final regression wave (2026-10-25): useMedicalRecords queried the
// non-existent public.prescriptions table, so patient Medical Records
// silently never included prescriptions (PostgREST error swallowed by
// the Promise.all data-null pattern). The live patient Rx table is
// comprehensive_prescriptions — pin the wiring so it cannot regress.
const hook = readFileSync(
  resolve(__dirname, "../hooks/useMedicalRecords.ts"),
  "utf8"
);

describe("final regression: medical records prescriptions source", () => {
  it("reads prescriptions from comprehensive_prescriptions", () => {
    expect(hook).toContain("comprehensive_prescriptions");
  });

  it("never queries the phantom 'prescriptions' table", () => {
    expect(hook).not.toMatch(/from\('prescriptions'/);
    expect(hook).not.toMatch(/from\("prescriptions"/);
  });

  it("selects only columns that exist on comprehensive_prescriptions", () => {
    // frequency does not exist on the live table; id/medication_name/
    // dosage/created_at do (verified against information_schema).
    const m = hook.match(/comprehensive_prescriptions[\s\S]{0,200}?\.select\('([^']+)'\)/);
    expect(m).not.toBeNull();
    const cols = (m as RegExpMatchArray)[1].split(",").map((c) => c.trim());
    expect(cols).toContain("medication_name");
    expect(cols).not.toContain("frequency");
  });
});
