import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// PAYPAL ANATOMY ROLLOUT — WAVE 1 (patient-facing), CEO order 2026-11-11:
// "Roll the PayPal anatomy across the whole app — even on desktop."
// Wave 1: the shared tabs primitive goes segmented pale-pill (propagates
// to every Tabs user), every doc-page-header title takes the greeting
// treatment via one CSS rule, and the named patient surfaces (Appointments,
// Medical Records, Wallet, provider list/detail + booking entry, Profile,
// Settings, Help, Notifications) are aligned surface by surface.
// Presentation only — no handlers, hooks, queries or routes touched.
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

const css = read("../index.css");
const tabs = read("../components/ui/tabs.tsx");
const appointments = read("../pages/Appointments.tsx");
const records = read("../pages/MedicalRecords.tsx");
const wallet = read("../pages/Wallet.tsx");
const providerDetail = read("../pages/ProviderDetail.tsx");
const providerList = read("../components/ProviderList.tsx");
const profile = read("../pages/Profile.tsx");
const settings = read("../pages/Settings.tsx");
const help = read("../pages/HelpSupport.tsx");
const notifications = read("../pages/NotificationsPage.tsx");

describe("rollout wave 1: shared primitives", () => {
  it("TabsList is a segmented pale-pill track; the active trigger is a flat white pill", () => {
    expect(tabs).toContain("rounded-full bg-pill p-1 text-pill-foreground");
    expect(tabs).toContain("data-[state=active]:bg-card");
    expect(tabs).not.toContain("data-[state=active]:shadow-sm");
    expect(tabs).not.toContain("rounded-md bg-muted");
  });

  it("every doc-page-header title takes the greeting weight/tracking via CSS", () => {
    expect(css).toContain(".doc-page-header h1 { font-weight: 800; letter-spacing: -0.02em; }");
  });
});

describe("rollout wave 1: patient surfaces", () => {
  it("Appointments + Medical Records headers use the greeting ramp and 13px subline", () => {
    for (const page of [appointments, records]) {
      expect(page).toContain("text-greeting");
      expect(page).toContain("text-[13px] text-muted-foreground");
      expect(page).not.toContain("text-2xl font-medium tracking-tight");
    }
  });

  it("Wallet header: greeting title, Live FX badge calmed to the pale pill", () => {
    expect(wallet).toContain("text-greeting");
    expect(wallet).toContain("bg-pill text-pill-foreground");
    expect(wallet).not.toContain("bg-success-500 dark:bg-emerald-600");
  });

  it("ProviderDetail: booking CTAs are full pills, hero name on the ramp, Verified badge pale", () => {
    expect(providerDetail).toContain("rounded-full bg-primary hover:bg-primary/90");
    expect(providerDetail).toContain("text-greeting text-foreground");
    expect(providerDetail).toContain("bg-success-50 text-success-600 border border-success-100");
    expect(providerDetail).not.toContain("rounded-md bg-primary");
  });

  it("ProviderList cards are hairline-only (no shadow lift on hover)", () => {
    expect(providerList).not.toContain("shadow-sm hover:shadow-md");
  });

  it("Profile: name is the greeting, form cards carry no shadow", () => {
    expect(profile).toContain("text-greeting text-midnight");
    expect(profile).not.toContain("shadow-sm");
    expect(profile).not.toContain("shadow-card");
  });

  it("Settings + Help + Notifications headers are shadowless greetings", () => {
    expect(settings).toContain("text-greeting");
    expect(settings).not.toContain("py-5 shadow-sm");
    expect(help).toContain("text-greeting");
    expect(help).not.toContain("shadow-button");
    expect(notifications).toContain("text-greeting");
    expect(notifications).toContain("text-[13px] text-muted-foreground");
  });

  it("Help tabs ride the shared segmented primitive (no local TabsList styling)", () => {
    expect(help).toContain("<TabsList>");
  });
});
