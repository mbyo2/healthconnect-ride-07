import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// PAYPAL ANATOMY ROLLOUT — WAVE 2 (role dashboards & portals), CEO order
// 2026-11-11: greeting headers on the ramp, ONE calm header treatment (no
// colour bands — the PharmacyPortal slate-900 banner is gone), segmented
// pale-pill tabs everywhere, stats as hairline lists on mobile with the
// module grid resuming at sm+, flat hairline cards. Desktop keeps its
// multi-column module rows. Presentation only — handlers, hooks, queries
// and tab state logic are byte-identical in behaviour.
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

const provider = read("../pages/ProviderDashboard.tsx");
const staff = read("../pages/StaffDashboard.tsx");
const admin = read("../pages/AdminDashboard.tsx");
const lab = read("../pages/LabManagement.tsx");
const pharmacy = read("../pages/PharmacyPortal.tsx");
const hospital = read("../pages/HospitalManagement.tsx");

describe("rollout wave 2: greeting headers, no bands", () => {
  it("every Wave 2 dashboard header title is on the greeting ramp", () => {
    for (const page of [provider, staff, admin, lab, pharmacy]) {
      expect(page).toContain("text-greeting");
    }
  });

  it("PharmacyPortal's slate-900 banner is now a calm hairline header card", () => {
    expect(pharmacy).not.toContain("bg-slate-900");
    expect(pharmacy).toContain("rounded-[24px] bg-card border border-border");
    expect(pharmacy).not.toContain("shadow-md");
  });

  it("solid status pills calm to the pale pill (Admin governance, Hospital live badge)", () => {
    expect(admin).toContain("bg-pill text-pill-foreground");
    expect(hospital).toContain("bg-pill text-pill-foreground");
  });
});

describe("rollout wave 2: segmented tabs everywhere", () => {
  it("no Wave 2 tab carries the old solid-blue active state", () => {
    for (const page of [provider, admin, hospital]) {
      expect(page).not.toContain("data-[state=active]:bg-primary-500");
    }
    expect(pharmacy).not.toContain("data-[state=active]:bg-primary-500");
  });

  it("Lab view tabs sit on the pale segmented track with a white active pill", () => {
    expect(lab).toContain("rounded-full bg-pill p-1");
    expect(lab).toContain("bg-card text-foreground font-semibold");
  });

  it("StaffDashboard tabs are pale pills, not underlines", () => {
    expect(staff).toContain("bg-pill text-pill-foreground font-semibold");
    expect(staff).not.toContain("border-b-2");
  });

  it("PharmacyPortal tabs ride the pale track", () => {
    expect(pharmacy).toContain("bg-pill p-1 rounded-[24px]");
  });
});

describe("rollout wave 2: stats as mobile hairline lists", () => {
  it("ProviderDashboard stats: hairline list below sm, module grid from sm", () => {
    expect(provider).toContain(
      "sm:hidden rounded-2xl border border-border bg-card px-4 divide-y divide-border"
    );
    expect(provider).toContain("hidden sm:grid sm:grid-cols-2 md:grid-cols-4");
    // The list mirrors the same four metrics the cards show.
    expect(provider).toContain("Today's Consultations");
    expect(provider).toContain("Shift Earnings (ZMW)");
  });

  it("StaffDashboard metrics merge into one divided surface on mobile", () => {
    expect(staff).toContain("max-md:divide-y max-md:divide-border");
    expect(staff).toContain("max-md:rounded-none max-md:border-0");
  });

  it("Lab KPI strip merges into one divided surface on mobile", () => {
    expect(lab).toContain("max-sm:divide-y max-sm:divide-border");
    expect(lab).toContain("max-sm:rounded-none max-sm:border-0");
  });
});

describe("rollout wave 2: flat hairline cards", () => {
  it("Lab section panels are 16px-radius and shadowless", () => {
    expect(lab).not.toContain("rounded-lg border border-border bg-card p-5 shadow-xs");
    expect(lab).toContain("rounded-2xl border border-border bg-card p-5");
  });

  it("StaffDashboard quick actions are flat (no shadow lift)", () => {
    expect(staff).not.toContain("hover:shadow-md");
  });
});
