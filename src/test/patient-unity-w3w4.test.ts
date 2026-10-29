import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { toServiceCode } from "@/components/billing/PricedServiceQuickCreateDialog";

// Patient Unity W3+W4 (2026-10-29): one roster picker everywhere, and
// create-on-missing generalised (CEO Odoo rule). These source-shape
// tests pin the wiring so a module cannot quietly regress to a
// per-module patient derivation or a dead-end select.

const readSrc = (p: string) => readFileSync(resolve(__dirname, "../../", p), "utf8");

describe("W3 · one roster picker everywhere", () => {
  it("HospitalPatientSelect is the roster-picker adapter", () => {
    const src = readSrc("src/components/hospital/HospitalPatientSelect.tsx");
    expect(src).toContain("InstitutionPatientPicker");
    expect(src).toContain("institutionId");
  });

  const pickerModules: Array<[string, string]> = [
    ["Lab", "src/components/hospital/HospitalLab.tsx"],
    ["EMR case sheets", "src/components/hospital/EMRCaseSheets.tsx"],
    ["Dispensary", "src/components/hospital/HospitalPharmacy.tsx"],
    ["IPD wards", "src/components/hospital/IPDWards.tsx"],
    ["Imaging", "src/components/hospital/Imaging.tsx"],
    ["Maternal & Child", "src/components/hospital/MaternalChild.tsx"],
    ["Referrals", "src/components/hospital/ReferralManagement.tsx"],
  ];
  for (const [name, path] of pickerModules) {
    it(`${name} passes its institution to the shared picker`, () => {
      const src = readSrc(path);
      expect(src).toContain("HospitalPatientSelect");
      expect(src).toMatch(/institutionId=\{(hospital\?\.id|hid)\}/);
    });
  }

  it("Lab and EMR no longer derive patients from clinical rows", () => {
    for (const path of [
      "src/components/hospital/HospitalLab.tsx",
      "src/components/hospital/EMRCaseSheets.tsx",
      "src/components/hospital/IPDWards.tsx",
    ]) {
      expect(readSrc(path)).not.toContain("useHospitalPatients");
    }
  });

  it("Admissions dropped the RLS-starved profiles firehose", () => {
    const src = readSrc("src/components/hospital/AdmitPatientDialog.tsx");
    expect(src).not.toContain(".eq('role', 'patient')");
    expect(src).toContain("InstitutionPatientPicker");
  });

  it("ICU admits through the roster picker, not the relationship RPC", () => {
    const src = readSrc("src/components/hospital/ICU.tsx");
    expect(src).not.toContain("search_patients_for_provider");
    expect(src).toContain("InstitutionPatientPicker");
  });

  it("Global search prefers the roster search", () => {
    const src = readSrc("src/components/search/GlobalSearchPalette.tsx");
    expect(src).toContain("searchInstitutionPatients");
  });

  it("Billing page picks from the roster — the null-id registry mapping is gone", () => {
    const src = readSrc("src/pages/Billing.tsx");
    expect(src).toContain("InstitutionPatientPicker");
    expect(src).not.toContain("linked_patient_id");
    expect(src).not.toContain("fetchPatients");
  });

  it("Billing staff auto-fill resolves patients from the roster first", () => {
    const src = readSrc("src/components/workflows/BillingStaffWorkflow.tsx");
    expect(src).toContain("searchInstitutionPatients");
  });

  it("Triage attaches the patient's active queue token (data-layer link)", () => {
    const src = readSrc("src/components/workflows/TriageStaffWorkflow.tsx");
    expect(src).toContain("findActiveQueueTokenId");
    expect(src).not.toContain("queue_token_id: null");
    const lib = readSrc("src/lib/patients.ts");
    expect(lib).toContain("findActiveQueueTokenId");
    expect(lib).toContain('"waiting", "serving"');
  });
});

describe("W4 · create-on-missing generalised", () => {
  it("EntitySelect offers create-on-missing and a who-can-add note", () => {
    const src = readSrc("src/components/ui/EntitySelect.tsx");
    expect(src).toContain("renderCreateDialog");
    expect(src).toContain("createUnavailableNote");
    expect(src).toContain("Create ${entityName}");
  });

  it("Billing's priced-service dead-end is now an inline create", () => {
    const editor = readSrc("src/components/billing/InvoiceServiceLines.tsx");
    expect(editor).toContain("EntitySelect");
    expect(editor).toContain("PricedServiceQuickCreateDialog");
    const dialog = readSrc("src/components/billing/PricedServiceQuickCreateDialog.tsx");
    expect(dialog).toContain('from("service_pricing")');
    expect(dialog).toContain("institution_id: institutionId");
  });

  it("HospitalBilling prices unpriced charges inline", () => {
    const src = readSrc("src/components/hospital/HospitalBilling.tsx");
    expect(src).toContain("InstitutionPatientPicker");
    expect(src).toContain("PricedServiceQuickCreateDialog");
    expect(src).toContain("Add to price list");
    expect(src).toContain("suggestedServiceLabel");
  });

  it("Dispensary prescriptions pick stocked medicines with inline create", () => {
    const src = readSrc("src/components/hospital/HospitalPharmacy.tsx");
    expect(src).toContain("EntitySelect");
    expect(src).toContain("MedicineQuickCreateDialog");
    const dialog = readSrc("src/components/hospital/MedicineQuickCreateDialog.tsx");
    expect(dialog).toContain("pharmacy_inventory");
  });

  it("medicine categories match the live pharmacy_inventory CHECK values", () => {
    // Proven live 2026-10-29: category is a stock type constrained to
    // medication/equipment/supplement/medical_supply/personal_care;
    // the old clinical groupings ('Analgesics', …) failed every insert.
    const dialog = readSrc("src/components/hospital/MedicineQuickCreateDialog.tsx");
    for (const v of ["medication", "equipment", "supplement", "medical_supply", "personal_care"]) {
      expect(dialog).toContain(`value: '${v}'`);
    }
    expect(dialog).toContain("toProductCode");
    const pharmacy = readSrc("src/components/hospital/HospitalPharmacy.tsx");
    expect(pharmacy).not.toContain("'Analgesics'");
    expect(pharmacy).toContain("toProductCode");
  });

  it("Claims pick payers from the directory with admin-only create", () => {
    const src = readSrc("src/components/hospital/InsuranceTPA.tsx");
    expect(src).toContain("EntitySelect");
    expect(src).toContain("InsurerQuickCreateDialog");
    expect(src).toContain("isPlatformAdmin");
  });

  it("insurer creation goes through the platform-admin RPC, not the table", () => {
    // insurance_providers writes are service-role-only by policy; the
    // create_insurance_provider RPC is the sanctioned client path.
    const dialog = readSrc("src/components/hospital/InsurerQuickCreateDialog.tsx");
    expect(dialog).toContain("create_insurance_provider");
    const migration = readSrc("supabase/migrations/20261029_insurer_quick_create_rpc.sql");
    expect(migration).toContain("has_admin_scope");
    expect(migration).toContain("GRANT EXECUTE");
  });

  it("Staff selects can add a team member inline (admin/manager gated)", () => {
    const src = readSrc("src/components/hospital/StaffSelect.tsx");
    expect(src).toContain("canManageStaff");
    expect(src).toContain("institution_staff");
    expect(src).toContain("Add staff");
  });

  it("role gates come from the definer-backed team hook", () => {
    const hook = readSrc("src/hooks/useInstitutionTeam.ts");
    expect(hook).toContain("is_institution_member");
    expect(hook).toContain("has_admin_scope");
  });
});

describe("PricedServiceQuickCreateDialog · service codes", () => {
  it("slugifies labels into snake_case codes", () => {
    expect(toServiceCode("Full Blood Count")).toBe("full_blood_count");
    expect(toServiceCode("X-Ray (Chest)")).toBe("x_ray_chest");
    expect(toServiceCode("  ANC  Visit ")).toBe("anc_visit");
  });

  it("falls back for symbol-only labels", () => {
    expect(toServiceCode("!!!")).toBe("service");
  });
});
