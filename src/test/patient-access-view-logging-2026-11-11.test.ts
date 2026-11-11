import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSrc = (p: string) => readFileSync(resolve(__dirname, "../../", p), "utf8");

// PATIENT-RECORD VIEW LOGGING (2026-11-11, CEO no-lawsuits bar): the
// audit-trail verification found patient SEARCHES logged in
// patient_access_audit but record/prescription/lab VIEWS logged nowhere.
// These pins lock: the server writer's shape (SECURITY DEFINER, caller
// from auth.uid(), self_view vocabulary, locked-down ACL), the client's
// fire-and-forget contract (never awaited, failures swallowed, dedup),
// the five wired surfaces, and the admin read view.

const migration = readSrc(
  "supabase/migrations/20261111_patient_record_view_logging.sql",
);
const helper = readSrc("src/utils/patientAccessLog.ts");
const hook = readSrc("src/hooks/usePatientAccessLog.ts");

describe("server writer: log_patient_record_access", () => {
  it("is a SECURITY DEFINER function keyed on auth.uid()", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.log_patient_record_access");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("auth.uid()");
    expect(migration).toContain("INSERT INTO public.patient_access_audit");
  });

  it("records self-views distinctly from third-party views", () => {
    expect(migration).toContain("'self_view'");
    expect(migration).toContain("'view'");
    expect(migration).toContain("v_caller = p_patient_id");
  });

  it("only logs real patient profiles and allowlists surfaces", () => {
    expect(migration).toContain("p.role = 'patient'");
    expect(migration).toContain("'medical_records', 'prescriptions', 'lab_results'");
  });

  it("never lets an audit failure reach the caller", () => {
    expect(migration).toContain("EXCEPTION WHEN OTHERS THEN");
  });

  it("pins the ACL: no PUBLIC/anon execute, authenticated + service_role only", () => {
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.log_patient_record_access(uuid, text, jsonb) FROM PUBLIC",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.log_patient_record_access(uuid, text, jsonb) FROM anon",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.log_patient_record_access(uuid, text, jsonb) TO authenticated",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.log_patient_record_access(uuid, text, jsonb) TO service_role",
    );
  });
});

describe("client writer: fire-and-forget contract", () => {
  it("calls the RPC without awaiting it", () => {
    expect(helper).toContain('.rpc("log_patient_record_access"');
    // The supabase call itself must never be awaited (the word may
    // legitimately appear in prose explaining exactly that).
    expect(helper).not.toMatch(/await\s+\(supabase/);
    expect(helper).not.toMatch(/await\s+supabase/);
    // The promise is explicitly voided and both outcomes are no-ops.
    expect(helper).toContain("void (supabase as any)");
  });

  it("dedups repeat opens of the same patient + surface", () => {
    expect(helper).toContain("DEDUP_WINDOW_MS");
    expect(helper).toContain("lastLoggedAt");
  });

  it("hook guards one log per mount per patient (StrictMode-safe)", () => {
    expect(hook).toContain("usePatientAccessLog");
    expect(hook).toContain("loggedForRef");
    expect(hook).toContain("logPatientRecordAccess(patientId, surface, context)");
  });
});

describe("wired surfaces: one open = one audit row", () => {
  const cases: Array<[string, string]> = [
    ["src/pages/MedicalRecords.tsx", '"medical_records"'],
    ["src/components/provider/PatientRecords.tsx", '"medical_records"'],
    ["src/components/patient/PatientLabResults.tsx", "'lab_results'"],
    ["src/pages/LabManagement.tsx", '"lab_results"'],
    ["src/pages/Prescriptions.tsx", '"prescriptions"'],
  ];
  for (const [file, surface] of cases) {
    it(`${file} logs ${surface} via the hook`, () => {
      const src = readSrc(file);
      expect(src).toContain("usePatientAccessLog");
      expect(src).toContain(surface);
    });
  }

  it("Prescriptions logs the patient actually on screen (selected or own list)", () => {
    const src = readSrc("src/pages/Prescriptions.tsx");
    expect(src).toContain("selectedPatient?.id ?? (!isProvider ? user?.id : null)");
  });
});

describe("admin readability", () => {
  it("AdminDashboard carries a Patient Access tab reading the audit table", () => {
    const dash = readSrc("src/pages/AdminDashboard.tsx");
    expect(dash).toContain('value: "patient-access"');
    expect(dash).toContain("<PatientAccessAudit />");
    const view = readSrc("src/components/admin/PatientAccessAudit.tsx");
    expect(view).toContain("patient_access_audit");
    expect(view).toContain("access_type");
  });
});
