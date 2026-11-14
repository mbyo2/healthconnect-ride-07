// Workstream D (2026-11-15) — fhir-inbound stored-error + tabnabbing pins.
//
// 1. fhir_exchanges.error_message is readable by the patient via RLS
//    ("Users view own fhir exchanges"), so the stored message must
//    never carry raw database text. Live-proven 2026-11-15: a bad-date
//    MedicationRequest stored
//    'Prescription safety check failed: invalid input syntax for type
//    date: "not-a-date"'. Only the prescribing-safety trigger's own
//    crafted refusal (a P0001 RAISE) is stored verbatim; every other
//    database error collapses to a generic stored message (the full
//    error stays in the server log only).
// 2. window.open(url, '_blank') without noopener lets the opened page
//    reach back through window.opener (tabnabbing). External opens
//    must pass 'noopener,noreferrer'.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("fhir-inbound stored error_message", () => {
  it("stores the trigger's crafted refusal only for P0001, generic otherwise", () => {
    const src = read("supabase/functions/fhir-inbound/index.ts");
    expect(src).toContain("error.code === 'P0001'");
    expect(src).toContain(
      "Prescription safety check failed: the prescription could not be validated.",
    );
    expect(src).not.toContain(
      "error_message: `Prescription safety check failed: ${error.message}`",
    );
  });

  it("the HTTP response stays generic", () => {
    const src = read("supabase/functions/fhir-inbound/index.ts");
    expect(src).toContain(
      "A prescription in this bundle failed the safety check and was not imported.",
    );
  });
});

describe("tabnabbing — external window.open calls", () => {
  it.each([
    "src/components/ai/ClinicalDecisionCard.tsx",
    "src/pages/HealthcareInstitutions.tsx",
    "src/components/delivery/CourierDeliveryDashboard.tsx",
  ])("%s opens externals with noopener,noreferrer", (p) => {
    const src = read(p);
    const opens = src.split("\n").filter((l) => l.includes("window.open("));
    expect(opens.length).toBeGreaterThan(0);
    for (const line of opens) {
      // tel: opens without a target are same-window navigation, not a
      // new tab; blank print windows are same-origin documents the app
      // writes itself. Only '_blank' opens need the rel guard.
      if (line.includes("'_blank'") || line.includes('"_blank"')) {
        expect(line).toContain("noopener,noreferrer");
      }
    }
  });
});
