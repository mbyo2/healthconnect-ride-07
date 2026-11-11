import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// RESPONSIVE SHELL (CEO order 2026-11-11, from his phone screenshot of the
// institution dashboard): the mobile header was wider than the screen —
// the language selector fell off the right edge, unreachable — and the
// institution module tabs were clipped in half by the sticky header card.
// Standing rule: pages must FIT every phone width (360/390/414/430px,
// fluid) while tablets/desktops keep their wide layouts. These pins keep
// the concrete fixes from regressing.
//
// 360px budget for the signed-in mobile header cluster (worst case, with
// the institution switcher present), from the final classes:
//   container px-3 ............ 24
//   AppLogo mark (w-8) ........ 32   (wordmark hidden below sm)
//   InstitutionSwitcher ....... 40   (px-2 + 16px icon + gap; name <md off,
//                                     chevron <sm off)
//   Search button (h-9 w-9) ... 36
//   NotificationBell (icon) ... 40
//   CurrencyToggle compact .... 44   (px-2 + globe 14 + gap 4 + "K" + border)
//   ThemeToggle (h-9 w-9) ..... 36
//   LanguageSelector icon ..... 36   (w-9, globe only)
//   Avatar menu (h-9 w-9) ..... 36   (+ ml-1 = 4)
//   cluster gaps 6 x gap-1 .... 24
//   TOTAL ..................... 352px <= 360px. Fits with margin.
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

const css = read("../index.css");
const header = read("../components/Header.tsx");
const languageSelector = read("../i18n/LanguageSelector.tsx");
const currencyToggle = read("../components/CurrencyToggle.tsx");
const switcher = read("../components/InstitutionSwitcher.tsx");
const pageHeader = read("../components/institution/InstitutionPageHeader.tsx");
const institutionDashboard = read("../pages/InstitutionDashboard.tsx");
const staffDashboard = read("../pages/StaffDashboard.tsx");

describe("responsive shell 2026-11-11: global safety net", () => {
  it("html/body clip horizontal overflow with `clip` (sticky-safe), never `hidden`", () => {
    expect(css).toContain("overflow-x: clip");
    expect(css).not.toContain("overflow-x: hidden");
  });
});

describe("responsive shell 2026-11-11: mobile header cluster fits 360px", () => {
  it("LanguageSelector has no unconditional fixed 140px width — icon-only at base, full at sm+", () => {
    expect(languageSelector).not.toContain('className="w-[140px]');
    expect(languageSelector).toContain("w-9");
    expect(languageSelector).toContain("sm:w-[140px]");
    // Value text and chevron hidden in icon-only mode so the 36px box fits.
    expect(languageSelector).toContain("hidden min-w-0 sm:block");
    expect(languageSelector).toContain("[&>svg:last-of-type]:hidden");
  });

  it("CurrencyToggle shows the bare symbol below md and the full label at md+", () => {
    expect(currencyToggle).toContain("hidden md:inline");
    expect(currencyToggle).toContain("md:hidden");
    expect(currencyToggle).toContain("px-2 md:px-2.5");
  });

  it("InstitutionSwitcher is icon-only on phones; name (capped) joins at md, chevron at sm", () => {
    expect(switcher).toContain("hidden md:inline");
    expect(switcher).toContain("max-w-[72px] min-[900px]:max-w-[120px]");
    expect(switcher).toContain("max-sm:hidden");
  });

  it("wordmark hides below sm so 360-430px phones keep the whole cluster on screen", () => {
    expect(header).toContain("[&_span]:hidden sm:[&_span]:inline");
    expect(header).not.toContain("min-[420px]:[&_span]:inline");
  });
});

describe("responsive shell 2026-11-11: institution tabs never clip", () => {
  it("header + tablist stick as ONE unit; the inner page header is static", () => {
    expect(institutionDashboard).toContain(
      'className="sticky top-[4.5rem] z-40 bg-background"'
    );
    expect(institutionDashboard).toContain("[position:static]");
    // The old second sticky bar at the same offset (z-20) is gone.
    expect(institutionDashboard).not.toContain(
      "pt-4 sticky top-[4.5rem] z-20 bg-background"
    );
  });

  it("tablist keeps overflow-x-auto so every module tab stays reachable by swipe", () => {
    expect(institutionDashboard).toContain('role="tablist"');
    expect(institutionDashboard).toContain("overflow-x-auto");
    expect(institutionDashboard).toContain("scrollbar-none");
  });

  it("StaffDashboard tab bar sticks BELOW its own header card, not at the same offset", () => {
    // PIN MOVED (anatomy rollout wave 2, 2026-11-11): the offset was 77px
    // for the old text-xl header; the header now uses the greeting ramp
    // (32px title line + 16px subline + 32px padding + 1px border = 81px),
    // so the sticky offset grew to 82px with it. The invariant — tab bar
    // sticks below its own header card — is unchanged.
    expect(staffDashboard).toContain("top-[calc(4.5rem+82px)]");
  });

  it("institution name can shrink/wrap inside the header card (min-w-0)", () => {
    expect(pageHeader).toContain("min-w-0 flex-1");
    expect(pageHeader).toContain("[overflow-wrap:anywhere]");
  });
});
