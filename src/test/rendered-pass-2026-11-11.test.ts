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

  it("quick workflows use the single-primary tint, not rainbow bands", () => {
    const workflows = read("../components/home/ConnectedWorkflows.tsx");
    expect(workflows).not.toContain("bg-blue-500");
    expect(workflows).not.toContain("bg-emerald-500");
    expect(workflows).not.toContain("bg-red-500");
    expect(workflows).toContain("bg-primary-500/10");
  });
});
