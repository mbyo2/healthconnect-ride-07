import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

// CLASSIC PAYPAL SHELL (CEO decision 2026-11-11 17:12, via options tap
// after re-sending his classic-PayPal reference batch): BOTH app bars go
// classic navy #003087 with white content in both modes, and primary
// action buttons become gold #FFC439 pills with near-black ink text
// (hover #F2B705, never blue). This supersedes the white-bar direction
// of the morning's anatomy rollout; the rest of the anatomy stands
// (Manrope, hairline lists, sky hero, pale secondaries, action blue
// #0066F5 for links / active states / icon accents).
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

const config = read("../../tailwind.config.ts");
const button = read("../components/ui/button.tsx");
const desktopNav = read("../components/DesktopNav.tsx");
const mobileHeader = read("../components/Header.tsx");
const currencyToggle = read("../components/CurrencyToggle.tsx");
const skeletonKit = read("../components/ui/skeleton-kit.tsx");
const landingHeader = read("../components/landing/LandingHeader.tsx");
const landingHero = read("../components/landing/LandingHero.tsx");
const landingFeatures = read("../components/landing/LandingFeatures.tsx");

describe("classic shell: tokens", () => {
  it("tailwind config carries navybar #003087 and the gold ramp", () => {
    expect(config).toContain('navybar: "#003087"');
    expect(config).toContain('DEFAULT: "#FFC439"');
    expect(config).toContain('deep: "#F2B705"');
    expect(config).toContain('ink: "#001435"');
  });
});

describe("classic shell: gold primary", () => {
  it("the shared Button default variant is the gold pill with ink text", () => {
    expect(button).toContain('default: "bg-gold text-gold-ink font-semibold hover:bg-gold-deep"');
    expect(button).not.toContain('default: "bg-primary text-primary-foreground');
  });

  it("desktop Get Started rides the shared gold variant (no hard-coded blue)", () => {
    expect(desktopNav).not.toContain("bg-primary-500 hover:bg-primary-600");
  });
});

describe("classic shell: navy bars, white content, both modes", () => {
  it("DesktopNav bar is navybar with white text", () => {
    expect(desktopNav).toContain("bg-navybar text-white");
    expect(desktopNav).toContain("bg-white/15 text-white font-semibold");
    expect(desktopNav).toContain("[&_span]:text-white");
  });

  it("mobile Header bar is navybar with white text and a gold-ringed avatar", () => {
    expect(mobileHeader).toContain("bg-navybar text-white");
    expect(mobileHeader).toContain("ring-gold");
    expect(mobileHeader).toContain('tone="onNavy"');
  });

  it("bar controls carry ghost-on-navy treatments", () => {
    expect(currencyToggle).toContain("bg-white/10 hover:bg-white/20 border-white/30 text-white");
    expect(desktopNav).toContain('<ThemeToggle className="bg-white/10 text-white border-white/25 hover:bg-white/20" />');
    expect(mobileHeader).toContain('<ThemeToggle className="bg-white/10 text-white border-white/25 hover:bg-white/20" />');
  });

  it("header skeleton twins render the navy bar", () => {
    expect(skeletonKit).toContain("border-white/10 bg-navybar min-[1025px]:block");
    expect(skeletonKit).toContain("border-white/10 bg-navybar min-[1025px]:hidden");
  });
});

// LANDING SHELL (2026-11-11, follow-up): the public landing was the one
// surface that escaped the classic conversion — it kept its own white
// floating pill bar (bg-white / dark slate) with blue vf-btn-primary
// CTAs while every app bar went navy. Measured at a true 390×844 render:
// landing "Get started" computed rgb(0,102,245) vs the app bar's exact
// rgb(0,48,135) navy and sign-in's exact rgb(255,196,57) gold. The
// landing now wears the same shell: navybar full-width bar, white
// content in both modes, gold primaries; blue stays on links/accents.
describe("classic shell: landing", () => {
  it("LandingHeader is a full-width navybar bar with white content", () => {
    expect(landingHeader).toContain("bg-navybar text-white");
    expect(landingHeader).toContain("border-b border-white/10");
    // The old floating-pill bar strings are gone. (The mobile menu's
    // dropdown CARD keeps its bg-white / dark slate card surface — it is
    // a dropdown panel like the app bars' menus, not the bar itself.)
    expect(landingHeader).not.toContain("border-canvas-silk bg-white dark:bg-slate-900/95");
    expect(landingHeader).not.toContain("border-white/70 bg-white dark:bg-slate-900/80");
    expect(landingHeader).not.toContain("rounded-nav border px-2 py-1.5");
  });

  it("landing nav mirrors the app bars: active pill is white/15, never gold", () => {
    expect(landingHeader).toContain("bg-white/15 text-white font-semibold");
    expect(landingHeader).toContain("text-white/80 hover:bg-white/10 hover:text-white");
  });

  it("landing Get started (bar + mobile panel) is the gold pill with ink text", () => {
    expect(landingHeader).toContain("rounded-pill bg-gold px-4 py-3");
    expect(landingHeader).toContain("bg-gold py-2.5 text-xs font-semibold text-gold-ink");
    expect(landingHeader).not.toContain("vf-btn-primary");
  });

  it("hero search submit (Find a doctor) is gold, not vf-btn-primary blue", () => {
    expect(landingHero).toContain("rounded-pill bg-gold px-5 py-3 text-sm font-semibold text-gold-ink");
    expect(landingHero).not.toContain("vf-btn-primary");
  });

  it("landing section primaries (Find Doctors Now / Join as Healthcare Provider) are gold", () => {
    expect(landingFeatures).toContain("Find Doctors Now");
    expect(landingFeatures).toContain("Join as Healthcare Provider");
    expect(landingFeatures).not.toContain("vf-btn-primary");
    expect(landingFeatures.match(/rounded-pill bg-gold px-6 py-3 text-sm font-semibold text-gold-ink/g)).toHaveLength(2);
  });
});

// FULL-PAGE SWEEP LOCKS (2026-11-11): the old-dialect patterns the sweep
// removed from every page must not creep back. Exceptions are deliberate
// and listed per test.
describe("sweep locks: old dialect stays out of the pages", () => {
  const pageFiles = readdirSync(resolve(__dirname, "../pages"))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => [f, read(`../pages/${f}`)] as const);

  it("no hard-coded blue primary buttons remain in any page", () => {
    for (const [name, src] of pageFiles) {
      expect(src, name).not.toContain("bg-primary-500 hover:bg-primary-600");
    }
  });

  it("no rainbow/mono KPI numerals remain in any page", () => {
    const kpi = /text-[23]xl font-(semibold|bold) font-mono text-(primary|purple|success|warning|error|emerald)-500/;
    for (const [name, src] of pageFiles) {
      expect(src, name).not.toMatch(kpi);
    }
  });

  it("the uppercase KPI label dialect is gone from every page", () => {
    // Carve-out (rollout wave-3 pin, 2026-11-11): DATA-TABLE header rows
    // keep the uniform uppercase micro-label convention ("clinical
    // density kept") — the ban applies to KPI / section / form labels,
    // i.e. any occurrence NOT on a <tr> line.
    for (const [name, src] of pageFiles) {
      for (const line of src.split("\n")) {
        if (line.includes("<tr")) continue;
        expect(line, `${name}: ${line.trim().slice(0, 60)}`).not.toContain(
          "text-xs font-semibold text-muted-foreground uppercase"
        );
        expect(line, `${name}: ${line.trim().slice(0, 60)}`).not.toContain(
          "text-xs font-semibold uppercase text-muted-foreground"
        );
      }
    }
  });

  it("no shadowed content cards remain in any page (ui primitives keep their own elevation)", () => {
    for (const [name, src] of pageFiles) {
      expect(src, name).not.toContain("shadow-xs");
      expect(src, name).not.toContain("shadow-2xs");
    }
  });
});
