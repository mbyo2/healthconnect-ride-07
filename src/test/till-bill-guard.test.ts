import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Pins the till/bill double-charge guard (migration
// 20261029_till_bill_double_charge_guard.sql) so a later edit cannot
// quietly reopen the hole where a medicine paid at the dispensary
// till was charged a second time on the patient's hospital bill.
// (Keyword casing follows the migration file, which preserves the
// live function-definition style.)

const root = path.resolve(__dirname, "../..");
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20261029_till_bill_double_charge_guard.sql"),
  "utf8",
);
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

describe("till/bill double-charge guard — the helper", () => {
  it("prescription_till_paid exists exactly once, definer-secured", () => {
    expect(migration.match(/CREATE OR REPLACE FUNCTION public\.prescription_till_paid/g)).toHaveLength(1);
    const body = migration.slice(migration.indexOf("prescription_till_paid"));
    expect(body).toContain("SECURITY DEFINER");
    expect(body).toContain("SET search_path TO 'public'");
  });

  it("counts only completed till sales, matched per medicine name", () => {
    expect(migration).toContain("s.status = 'completed'");
    expect(migration).toContain("lower(btrim(mi.medication_name)) = lower(btrim(v_rx.medication_name))");
    expect(migration).toContain("'paid_quantity', v_paid");
    expect(migration).toContain("'receipt_numbers', to_jsonb(v_receipts)");
  });

  it("is access-gated (42501) and granted per the scoped-GRANT rule", () => {
    expect(migration).toContain("ERRCODE = '42501'");
    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.prescription_till_paid(uuid, uuid) FROM PUBLIC, anon;",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.prescription_till_paid(uuid, uuid) TO authenticated, service_role;",
    );
  });
});

describe("till/bill double-charge guard — the hospital bill", () => {
  it("keeps create_hospital_bill's signature — no new price channel", () => {
    const start = migration.indexOf("CREATE OR REPLACE FUNCTION public.create_hospital_bill");
    const header = migration.slice(start, migration.indexOf(")", start));
    expect(header).toContain("p_hospital_id uuid");
    expect(header).toContain("p_patient_id uuid");
    expect(header).toContain("p_lines jsonb");
    expect(header).toContain("p_due_date date");
    expect(header).not.toMatch(/price|amount|cost/);
  });

  it("reports already_paid_at_till on every return path", () => {
    expect(migration.match(/'already_paid_at_till', v_already_paid/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("runs the till check before any bill row is inserted", () => {
    const guardAt = migration.indexOf("v_till := public.prescription_till_paid(v_ref, p_hospital_id)");
    const insertAt = migration.indexOf("INSERT INTO public.hospital_billing");
    expect(guardAt).toBeGreaterThan(-1);
    expect(insertAt).toBeGreaterThan(guardAt);
  });

  it("bills only the unpaid remainder of a partly paid prescription", () => {
    expect(migration).toContain("v_qty := v_qty - v_paid_qty;");
    expect(migration).toContain("'billed_quantity', v_qty - v_paid_qty");
    expect(migration).toContain(
      "Those medicines were already paid for at the dispensary till (receipt %)",
    );
  });
});

describe("till/bill double-charge guard — the tills", () => {
  it("create_pos_sale gains an optional prescription link (old signature dropped)", () => {
    expect(migration).toContain(
      "DROP FUNCTION IF EXISTS public.create_pos_sale(uuid, jsonb, text, text, text, text, numeric);",
    );
    expect(migration).toContain("p_prescription_id uuid DEFAULT NULL::uuid");
    expect(migration).toContain(
      "CASE WHEN p_prescription_id IS NULL THEN 'walk_in' ELSE 'prescription' END",
    );
  });

  it("refuses a till sale for an already-billed or already-paid prescription", () => {
    expect(migration).toContain("already on the patient''s hospital bill");
    expect(migration).toContain("already paid for at the till (receipt %)");
  });

  it("create_pharmacy_sale gains the link and refuses a second linked payment", () => {
    expect(migration).toContain(
      "DROP FUNCTION IF EXISTS public.create_pharmacy_sale(uuid, jsonb, text, uuid);",
    );
    expect(migration).toContain("already paid for at this pharmacy (transaction %)");
  });

  it("both new RPC signatures carry scoped grants, never PUBLIC", () => {
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.create_pos_sale(uuid, jsonb, text, text, text, text, numeric, uuid) TO authenticated, service_role;",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.create_pharmacy_sale(uuid, jsonb, text, uuid, uuid) TO authenticated, service_role;",
    );
    expect(migration).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.create_(pos|pharmacy)_sale\([^)]*\) TO PUBLIC/,
    );
  });
});

describe("till/bill double-charge guard — client wiring", () => {
  it("the bill assembly reports till-paid medicines in plain language", () => {
    const src = read("src/components/hospital/HospitalBilling.tsx");
    expect(src).toContain("already_paid_at_till");
    expect(src).toContain("already paid at the dispensary till");
    expect(src).toContain("only the unpaid remainder was billed");
  });

  it("both institution tills can record a sale against its prescription", () => {
    for (const rel of ["src/components/pharmacy/PharmacyPOS.tsx", "src/components/specialized/DispensaryOperations.tsx"]) {
      const src = read(rel);
      expect(src).toContain("p_prescription_id");
      expect(src).toContain("comprehensive_prescriptions");
    }
  });

  it("the pharmacy POS passes the pharmacy-prescription link", () => {
    const src = read("src/pages/PharmacyManagement.tsx");
    expect(src).toContain("p_prescription_id");
    expect(src).toContain("pharmacy_prescriptions");
  });

  it("the manual-invoice auto-fill skips or reduces till-paid medicines", () => {
    const src = read("src/components/workflows/BillingStaffWorkflow.tsx");
    expect(src).toContain("prescription_till_paid");
    expect(src).toContain("already paid at the dispensary till");
  });
});
