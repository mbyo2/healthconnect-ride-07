import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizePhoneDigits, isCompletePhone } from "@/lib/kiosk";

const readSrc = (p: string) => readFileSync(resolve(__dirname, "../../", p), "utf8");

describe("kiosk phone handling", () => {
  it("normalises a Zambian number to digits", () => {
    expect(normalizePhoneDigits("+260 977 123 456")).toBe("260977123456");
    expect(normalizePhoneDigits("0977-123-456")).toBe("0977123456");
    expect(normalizePhoneDigits("")).toBe("");
  });

  it("requires a full phone number before a lookup is allowed", () => {
    expect(isCompletePhone("0977123456")).toBe(true);
    expect(isCompletePhone("+260977123456")).toBe(true);
    // Partial numbers must never reach the lookup — no fishing.
    expect(isCompletePhone("0977")).toBe(false);
    expect(isCompletePhone("977123")).toBe(false);
    expect(isCompletePhone("")).toBe(false);
  });
});

describe("kiosk client data path", () => {
  const lib = readSrc("src/lib/kiosk.ts");

  it("talks to the three narrow kiosk functions only", () => {
    expect(lib).toContain('"kiosk_terminal_info"');
    expect(lib).toContain('"kiosk_lookup_patient"');
    expect(lib).toContain('"kiosk_check_in"');
    // The kiosk never queries patient tables directly.
    expect(lib).not.toContain('.from("profiles")');
    expect(lib).not.toContain('.from("institution_patients")');
    expect(lib).not.toContain('.from("queue_tokens")');
  });

  const page = readSrc("src/pages/SelfServiceKiosk.tsx");

  it("wires check-in and registration to the patient master", () => {
    expect(page).toContain("lookupKioskPatient");
    expect(page).toContain("kioskCheckIn");
    // Walk-in registration goes through the ONE find-or-create path.
    expect(page).toContain("findOrCreatePatient");
    expect(page).toContain('"walk_in"');
    expect(page).toContain("getKioskTerminalInfo");
  });

  it("never invents a token, a patient, or a room again", () => {
    expect(page).not.toContain("Returning Patient");
    expect(page).not.toContain("Room 104");
    expect(page).not.toContain("Room 102");
    expect(page).not.toContain("Triage Station 1");
    expect(page).not.toContain("`OPD-${Math.floor");
    expect(page).not.toContain("Walk-in Patient");
  });

  it("has an honest not-activated state for unauthorised terminals", () => {
    expect(page).toContain("This kiosk is not active yet");
    expect(page).toContain("terminalState");
  });

  it("scopes the terminal to one institution from the URL or the session", () => {
    expect(page).toContain('searchParams.get("institution")');
    expect(page).toContain("useInstitutionAffiliation");
  });
});

describe("kiosk launch sites pass the institution", () => {
  it("institution dashboard opens the kiosk for its institution", () => {
    const src = readSrc("src/pages/InstitutionDashboard.tsx");
    expect(src).toContain("/kiosk?institution=${institution.id}");
  });

  it("patient flow opens the kiosk for its institution", () => {
    const src = readSrc("src/pages/PatientFlowManagement.tsx");
    expect(src).toContain("kiosk?institution=${institution.id}");
  });
});

describe("kiosk server functions (migration)", () => {
  const sql = readSrc("supabase/migrations/20261029_kiosk_patient_access.sql");

  it("defines the three functions behind the institution-member gate", () => {
    expect(sql).toContain("kiosk_terminal_info");
    expect(sql).toContain("kiosk_lookup_patient");
    expect(sql).toContain("kiosk_check_in");
    expect(sql).toContain("is_institution_member");
  });

  it("lookup is exact-match only — substring search would allow enumeration", () => {
    expect(sql).not.toContain("ILIKE");
    expect(sql).toContain("right(regexp_replace");
    expect(sql).toContain("length(v_digits) < 9");
  });

  it("lookup returns minimal fields and is audited with a masked term", () => {
    expect(sql).toContain("'kiosk_lookup'");
    expect(sql).toContain("'phone:****' || right(v_digits, 4)");
    const lookupBody = sql.slice(sql.indexOf("kiosk_lookup_patient"), sql.indexOf("kiosk_check_in"));
    expect(lookupBody).not.toContain("p.email");
    expect(lookupBody).not.toContain("date_of_birth");
  });

  it("check-in is idempotent for a patient already in today's queue", () => {
    expect(sql).toContain("already_checked_in");
    expect(sql).toContain("qt.status IN ('waiting', 'serving')");
  });

  it("patient functions are never granted to anon; terminal info is name-only", () => {
    expect(sql).toContain(
      "REVOKE EXECUTE ON FUNCTION public.kiosk_lookup_patient(uuid, text) FROM PUBLIC, anon",
    );
    expect(sql).toContain(
      "REVOKE EXECUTE ON FUNCTION public.kiosk_check_in(uuid, uuid, text, text) FROM PUBLIC, anon",
    );
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.kiosk_lookup_patient(uuid, text) TO authenticated, service_role",
    );
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.kiosk_check_in(uuid, uuid, text, text) TO authenticated, service_role",
    );
  });
});
