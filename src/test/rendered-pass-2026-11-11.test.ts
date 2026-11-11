import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// Rendered-pass fixes (2026-11-11). A live pass on /medical-records found a
// red "Failed to load medical records" toast AND the "No Medical Records"
// empty state for a brand-new patient. Root cause: three query sites
// selected findings / impression / completed_at from imaging_orders, where
// none of those columns exist (live: 42703, verified against production
// PostgREST). Findings/impressions live in imaging_results (patients see
// their own rows once status = 'final'), joined to the parent order.
// These pins keep the wiring — and the other rendered-pass fixes — from
// regressing silently again.
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

const comprehensive = read("../components/patient/ComprehensiveMedicalRecords.tsx");
const service = read("../services/medicalRecords.ts");
const hook = read("../hooks/useMedicalRecords.ts");

describe("rendered pass 2026-11-11: imaging source for medical records", () => {
  it.each([
    ["ComprehensiveMedicalRecords", comprehensive],
    ["medicalRecords service", service],
    ["useMedicalRecords hook", hook],
  ])("%s reads imaging reports from imaging_results", (_name, src) => {
    expect(src).toContain("imaging_results");
    expect(src).toContain("imaging_orders(order_number, modality, body_part)");
  });

  it.each([
    ["ComprehensiveMedicalRecords", comprehensive],
    ["medicalRecords service", service],
    ["useMedicalRecords hook", hook],
  ])("%s never selects phantom columns from imaging_orders", (_name, src) => {
    // findings / impression / completed_at do not exist on imaging_orders.
    const m = src.match(/from\('imaging_orders'[\s\S]{0,300}?\.select\('([^']+)'\)/);
    expect(m).toBeNull();
  });

  it("a failed records load is an error state, not the empty state or a toast", () => {
    expect(comprehensive).toContain("loadError");
    expect(comprehensive).toContain("We couldn&apos;t load your medical records");
    expect(comprehensive).not.toContain("toast.error('Failed to load medical records')");
  });
});

describe("rendered pass 2026-11-11 (follow-up): phantom columns on /medical-records", () => {
  // Live re-check (2026-11-11) showed the error card again for a fresh
  // patient even though the four aggregated queries look clean in SQL:
  // replayed verbatim through PostgREST as the QA patient, the
  // prescriptions leg selected `frequency` from comprehensive_prescriptions,
  // which has no such column (42703) — the Promise.all threw and the whole
  // component fell into its error state. Dosing directions live in
  // `instructions` on the live table.
  it("ComprehensiveMedicalRecords aggregates prescriptions on live columns only", () => {
    const m = comprehensive.match(/comprehensive_prescriptions[\s\S]{0,900}?\.select\('([^']+)'\)/);
    expect(m).not.toBeNull();
    const cols = (m as RegExpMatchArray)[1].split(",").map((c) => c.trim());
    expect(cols).toContain("medication_name");
    expect(cols).toContain("instructions");
    expect(cols).not.toContain("frequency");
    expect(comprehensive).not.toContain("rx.frequency");
  });

  // Same failure class on two sibling sections of the same page: the
  // institution kind column on healthcare_institutions is `type`; the
  // institution-type column does not exist (42703 via PostgREST).
  it.each([
    ["PatientPortal", "../components/patient/PatientPortal.tsx"],
    ["HealthHistoryTransfer", "../components/medical/HealthHistoryTransfer.tsx"],
  ])("%s never references the phantom institution-type column", (_name, rel) => {
    expect(read(rel)).not.toContain("institution_type");
  });
});

describe("rendered pass 2026-11-11: presentation fixes", () => {
  it("patient access categories render human labels, not camelCase keys", () => {
    const portal = read("../components/patient/PatientPortal.tsx");
    expect(portal).toContain('labResults: "Lab results"');
    expect(portal).toContain('clinicalNotes: "Clinical notes"');
    expect(portal).toContain('vitals: "Vital signs"');
    expect(portal).toContain("CATEGORY_LABELS[cat]");
  });

  it.each([
    "../pages/SearchPage.tsx",
    "../pages/MedicalRecords.tsx",
    "../pages/Wallet.tsx",
    "../pages/Chat.tsx",
    "../pages/Settings.tsx",
    "../pages/Profile.tsx",
    "../pages/ProviderDetail.tsx",
  ])("interior page %s does not use the serif display face", (rel) => {
    expect(read(rel)).not.toContain("font-display");
  });

  it("wallet top-up has no broken remote badge images and no demo phone number", () => {
    const topup = read("../components/wallet/WalletTopUp.tsx");
    expect(topup).not.toContain("paypalobjects.com");
    expect(topup).not.toContain("0971234567");
    expect(topup).toContain('placeholder="Enter your MoMo number"');
  });

  it("find-care pagination renders its range as one clean string", () => {
    const pagination = read("../components/SearchPagination.tsx");
    expect(pagination).toContain("Showing providers ${");
  });

  it("quick workflows headers are white hairline, not rainbow bands or tint strips", () => {
    // PIN MOVED 2026-11-11 (appointments-load-and-anatomy mission,
    // Finding 3): this pin previously REQUIRED the pale primary tint
    // strip (bg-primary-500/10) as the "single-primary" system. The
    // post-rollout rendered verification ordered the remaining tinted
    // strips converted to white hairline cards with blue text — the
    // pin's original intent (no per-card rainbow bands) is preserved
    // and extended: no rainbow, and no tint strip either.
    const workflows = read("../components/home/ConnectedWorkflows.tsx");
    expect(workflows).not.toContain("bg-blue-500");
    expect(workflows).not.toContain("bg-emerald-500");
    expect(workflows).not.toContain("bg-red-500");
    expect(workflows).not.toContain("bg-primary-500/10");
    expect(workflows).toContain("border-b border-border");
    expect(workflows).toContain("text-primary-500");
  });
});

describe("rendered pass 2026-11-11 (sweep): phantom-column audit of the flagged siblings", () => {
  // Repo-wide sweep off the /medical-records fix. Every remaining
  // institution_type / frequency hit was checked against the live
  // information_schema and its request shape replayed through PostgREST
  // (QA patient session; Auth taxonomy as anon — the pre-login role).
  // healthcare_institutions carries `type` / `type_code`, NOT
  // institution_type; comprehensive_prescriptions carries dosing
  // directions in `instructions`, NOT frequency. Both phantom selects
  // still return 42703 live (negative controls), so any reintroduction
  // below is a live break, not a style issue.
  const status = read("../components/patient/PrescriptionStatus.tsx");

  it("PrescriptionStatus renders live dosing directions, not the phantom frequency field", () => {
    // Its rows come from select('*') on comprehensive_prescriptions, so a
    // `frequency` field could never be populated — the row rendered blank
    // for every patient. The live directions column is `instructions`.
    expect(status).not.toContain("prescription.frequency");
    expect(status).not.toContain("frequency: string");
    expect(status).toContain("prescription.instructions");
    expect(status).toContain("Directions:");
  });

  it("the flagged institution files query healthcare_institutions on live columns only", () => {
    const manager = read("../components/admin/InstitutionModuleManager.tsx");
    expect(manager).toContain('.select("id, name, type_code, city")');
    const ctx = read("../hooks/useInstitutionContext.ts");
    expect(ctx).not.toContain(".institution_type");
    const apps = read("../components/admin/InstitutionApplications.tsx");
    // institution_type is a real column of institution_applications (the
    // source table, select '*'); the value is written INTO the live
    // healthcare_institutions.type column on approval — never selected
    // FROM healthcare_institutions.
    expect(apps).toContain("type: selected.institution_type");
    expect(apps).toContain(
      '"id, admin_id, license_number, address, city, country, phone, email, website, is_verified, "'
    );
    expect(apps).toContain('"operational_since, status"');
  });

  it("Auth taxonomy selects use the live lookup tables, never a phantom column", () => {
    const auth = read("../pages/Auth.tsx");
    expect(auth).toContain('from("institution_types").select("code, name")');
    expect(auth).not.toContain("healthcare_institutions");
  });

  it.each([
    ["Prescriptions page", "../pages/Prescriptions.tsx", '"refills_remaining, instructions, quantity, generic_name, strength, "'],
    ["VisitSummary", "../pages/VisitSummary.tsx", "'id, medication_name, dosage, instructions, quantity, prescribed_date, status'"],
    ["BarcodeVerify", "../components/pharmacy/BarcodeVerify.tsx", '"id, patient_id, medication_name, dosage, quantity, prescription_number, barcode, status, prescribed_date"'],
  ])("%s selects comprehensive_prescriptions on live columns (instructions, not frequency)", (_name, rel, needle) => {
    expect(read(rel)).toContain(needle);
  });
});
