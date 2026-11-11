import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// MODULE-LAYOUT OCCLUSION + STICKY/FIXED CHROME (CEO phone reports
// 2026-11-11 17:08 + 17:21): on the Pharmacy Management page the sticky
// header card hid the top of the stat row "no matter I do", the floating
// bottom nav covered page content, and — the sweep-wide rule — sections
// and sticky bars must NEVER hide content under them.
//
// Root cause of the occlusion: `.doc-page-header` hard-coded
// `top-[4.5rem]` (72px). Pages scroll inside MobileLayout's <main>; on
// the desktop path the page header's natural position is the content
// wrapper's py-6/8 (24/32px) — ABOVE the 72px threshold — so sticky
// displaced the bar DOWN 40–48px over the first content row at rest,
// permanently. The dock is now shell-driven via --doc-sticky-top
// (MobileLayout: 4.5rem under the fixed mobile header, 0px in the
// desktop main whose scrollport already starts below DesktopNav).
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

const css = read("../index.css");
const mobileLayout = read("../components/MobileLayout.tsx");
const institutionDashboard = read("../pages/InstitutionDashboard.tsx");
const staffDashboard = read("../pages/StaffDashboard.tsx");
const pharmacyManagement = read("../pages/PharmacyManagement.tsx");
const languageSelector = read("../i18n/LanguageSelector.tsx");
const dispensaryOperations = read("../components/specialized/DispensaryOperations.tsx");

describe("occlusion fix: the sticky dock is shell-driven, never hard-coded", () => {
  it(".doc-page-header docks at var(--doc-sticky-top, 0px)", () => {
    expect(css).toContain("top: var(--doc-sticky-top, 0px)");
    expect(css).not.toContain("top-[4.5rem]");
  });

  it("MobileLayout sets the dock per scroll context (mobile 4.5rem / desktop 0px)", () => {
    expect(mobileLayout).toContain('"--doc-sticky-top": "4.5rem"');
    expect(mobileLayout).toContain('"--doc-sticky-top": "0px"');
  });

  it("no page-level sticky bar hard-codes the old 4.5rem dock", () => {
    expect(institutionDashboard).not.toContain("top-[4.5rem]");
    expect(staffDashboard).not.toContain("top-[calc(4.5rem");
    expect(institutionDashboard).toContain("top-[var(--doc-sticky-top,0px)]");
    expect(staffDashboard).toContain("top-[calc(var(--doc-sticky-top,0px)+82px)]");
  });

  it("the tall Pharmacy identity header is static — it can never stick over content", () => {
    expect(pharmacyManagement).toContain("doc-page-header [position:static]");
  });

  it("in-column sticky cart docks below the dashboard sticky unit via the same var", () => {
    expect(dispensaryOperations).toContain("sticky top-[calc(var(--doc-sticky-top,0px)+64px)]");
    expect(dispensaryOperations).toContain("md:top-[calc(var(--doc-sticky-top,0px)+168px)]");
  });
});

describe("chrome clearance: bottoms and anchored sections never hide", () => {
  it("mobile main carries pb-40 so the last content clears the floating nav + FABs", () => {
    expect(mobileLayout).toContain('isAuthenticated ? "pb-40" : "pb-6"');
  });

  it("both scroll containers carry scroll-padding so jumped-to sections land below the docked bars", () => {
    expect(mobileLayout).toContain("scroll-pt-[11rem]");
    expect(mobileLayout).toContain("scroll-pt-[6.5rem]");
  });
});

describe("pharmacy stats wear the anatomy, not the old dialect", () => {
  it("no rainbow numerals, no mono figures, no shadowed stat cards", () => {
    expect(pharmacyManagement).not.toContain("text-purple-600");
    expect(pharmacyManagement).not.toContain("text-warning-500");
    expect(pharmacyManagement).not.toContain("font-mono");
    expect(pharmacyManagement).not.toContain("shadow-xs");
    expect(pharmacyManagement).not.toContain("shadow-2xs");
  });

  it("mobile stats are ONE hairline list; revenue value is money-in green", () => {
    expect(pharmacyManagement).toContain("sm:hidden rounded-2xl border border-border bg-card px-4 divide-y divide-border");
    expect(pharmacyManagement).toContain("text-success-600");
    expect(pharmacyManagement).toContain("hidden sm:grid sm:grid-cols-2 md:grid-cols-4");
  });
});

describe("language selector collapse actually engages (specificity trap)", () => {
  it("the value is wrapped in a div — the SelectTrigger base's [&>span] line-clamp cannot resurrect it", () => {
    expect(languageSelector).toContain('<div className="hidden min-w-0 sm:block">');
    expect(languageSelector).not.toContain('<span className="hidden min-w-0 sm:block">');
    expect(languageSelector).toContain("overflow-hidden sm:w-[140px]");
  });
});
