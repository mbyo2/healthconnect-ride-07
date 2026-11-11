import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// MOBILE OVERFLOW — WORDS & NUMBERS SPILLING OUT OF THEIR CONTAINERS
// (CEO report 2026-11-11: "Words and numbers are the ones overflowing and
// going to where they are not supposed to"). The root html/body already
// clips page-level sideways scroll (pinned in responsive-shell-2026-11-11),
// so these defects showed up as content painting past its card/row edge or
// being cut off inside it. Each hazard below was confirmed by DOM
// measurement of the production build at 360/390/414/430px (locally served,
// phone-width viewports) or by an isolated Chrome layout reproduction:
//
//  1. Provider result card footer (search): the three action buttons
//     (Estimate Copay / View Profile / Book Consultation, ~344px of
//     min-content) sat in a non-wrapping flex group inside a ~264px card
//     column — measured scrollWidth 360 vs clientWidth 244 on the card's
//     skeleton twin at 360px. Both button groups now wrap.
//  2. Landing "Practitioner Overview" stat tile: the word "Nationwide" at
//     text-2xl Fraunces measured 10px wider than its half-width tile at
//     360px. The value now uses a fluid clamp that steps down with the
//     viewport (same treatment as the PayPal numeral ramp) — never a
//     smaller fixed size that would also shrink it on desktop.
//  3. StatsCard: the value column was `flex-1` WITHOUT min-w-0 next to a
//     shrink-0 icon; an isolated reproduction (164px card, "K1,234,567"
//     at 30px) measured scrollWidth 190 vs clientWidth 164 — the numeral
//     shoved the icon and spilled. Now min-w-0 + fluid clamp numeral.
//  4. Procurement purchase-order line-item row: `grid-cols-[1fr_70px_…]`
//     with the item-name <input> as a direct grid item. A bare input's
//     automatic minimum (~207px) blew the row out — reproduction measured
//     scrollWidth 501 in a 296px dialog; with minmax(0,1fr) + min-w-0 on
//     the inputs it measures 296. The PO table (7 columns) and the
//     line-items table also sat in overflow-hidden cards where wide
//     content was silently cut; they now use the codebase's own
//     overflow-x-auto container-scroll pattern.
//  5. ClinicalProcedurePricing table: same overflow-hidden → overflow-x-auto
//     container treatment.
//  6. App header: for a multi-role user the RoleSwitcher badge
//     ("Institution Admin View") pushed the header's worst case to ~437px
//     at a 360px viewport (logo is shrink-0, right cluster is shrink-0,
//     nothing could give). The badge label now hides below sm (icon +
//     chevron remain; aria-label carries the role) and the logo cluster's
//     gap tightens on phones. Desktop rendering is unchanged.

const read = (rel: string) =>
  readFileSync(resolve(__dirname, "..", rel), "utf-8");

describe("mobile overflow — text & number containment (2026-11-11)", () => {
  it("provider card footer action groups wrap inside the card", () => {
    const list = read("components/ProviderList.tsx");
    expect(list).toContain(
      '<div className="flex flex-wrap items-center gap-2">\n                    <NextAvailableChip'
    );
    expect(list).toContain(
      '<div className="flex flex-wrap items-center gap-2">\n                    <button'
    );
    // The skeleton twin mirrors the real card — it must wrap too.
    const skeleton = read("components/ui/skeleton-kit.tsx");
    expect(skeleton).toContain(
      '<div className="flex flex-wrap items-center gap-2">\n          <Skeleton className="h-11 w-[104px]'
    );
  });

  it("landing stat-tile values scale fluidly instead of spilling", () => {
    const features = read("components/landing/LandingFeatures.tsx");
    expect(features).toContain("text-[clamp(1.2rem,6vw,1.5rem)]");
    expect(features).not.toContain(
      'className="text-2xl font-display font-light text-primary-500 mt-1"'
    );
  });

  it("StatsCard value column can shrink and its numeral scales fluidly", () => {
    const card = read("components/charts/StatsCard.tsx");
    expect(card).toContain('<div className="flex-1 min-w-0">');
    expect(card).toContain("text-[clamp(1.5rem,7vw,1.875rem)]");
    expect(card).toContain("flex flex-wrap items-center gap-1.5");
  });

  it("procurement line-item grid lets the name input shrink (minmax + min-w-0)", () => {
    const proc = read("components/hospital/Procurement.tsx");
    expect(proc).toContain("grid-cols-[minmax(0,1fr)_70px_70px_90px_32px]");
    expect(proc).not.toContain("grid-cols-[1fr_70px_70px_90px_32px]");
    const shrinkableInputs = proc.match(/min-w-0 rounded-xl border border-border/g) || [];
    expect(shrinkableInputs.length).toBeGreaterThanOrEqual(4);
  });

  it("wide procurement + pricing tables scroll inside their cards, never clip", () => {
    const proc = read("components/hospital/Procurement.tsx");
    expect(proc).toContain("rounded-2xl border border-border overflow-x-auto");
    expect(proc).toContain("rounded-xl border border-border overflow-x-auto");
    const pricing = read("components/pricing/ClinicalProcedurePricing.tsx");
    expect(pricing).toContain("rounded-xl border overflow-x-auto");
    expect(pricing).not.toContain("rounded-xl border overflow-hidden");
  });

  it("header fits 360px for multi-role users (role badge collapses, gaps tighten)", () => {
    const switcher = read("components/auth/RoleSwitcher.tsx");
    expect(switcher).toContain('className="text-xs capitalize max-sm:hidden"');
    expect(switcher).toContain("aria-label={`Current role:");
    const header = read("components/layout/Header.tsx");
    expect(header).toContain("flex items-center gap-3 sm:gap-6 min-w-0");
  });
});
