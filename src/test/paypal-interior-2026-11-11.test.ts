import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";

// PayPal-interior pass (CEO order 2026-11-11): "Doc0clock.online has
// gradient sections which can never be made by PayPal or Stripe… use
// PayPal blue on both apps even inside… after sign in make Doc'O Clock
// look like the way PayPal does and arranges things."
//
// Palette adopted (official PayPal theme values, per the standing
// research report §3.2, which the order defers to on exact values):
// action/link blue #0066f5, its documented hover #0038ba, navy #002991.
// These pins keep the palette, the no-gradients rule and the shell
// geometry from regressing.
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

const css = read("../index.css");
const config = read("../../tailwind.config.ts");
const layout = read("../components/MobileLayout.tsx");
const desktopNav = read("../components/DesktopNav.tsx");
const patientHome = read("../components/workflows/PatientWorkflow.tsx");

describe("paypal interior 2026-11-11: palette tokens", () => {
  it("interior primary is PayPal blue #0066f5 (light) lifted for dark", () => {
    expect(css).toContain("--primary:          215 100% 48%");
    expect(css).toContain("--primary:          215 100% 66%");
    expect(css).toContain("--ring:             215 100% 48%");
  });

  it("PayPal navy token exists for header/emphasis bands", () => {
    expect(css).toContain("--navy:             223 100% 28%");
    expect(config).toContain('700: "#002991"');
  });

  it("the tailwind ramp is anchored on PayPal values", () => {
    expect(config).toContain('500: "#0066f5"');
    expect(config).toContain('600: "#0038ba"');
  });

  it("the ember accent is gone from the token layer", () => {
    // --accent is now a pale PayPal-blue tint (hover/selected surface).
    expect(css).not.toContain("18 91%");
    expect(css).toContain("--accent:           214 100% 96%");
    expect(css).toContain("--accent:           215 55% 20%");
  });

  it("no old Signal Blue hex survives in product source", () => {
    expect(config).not.toContain("#397dff");
    expect(css).not.toContain("#397dff");
  });
});

describe("paypal interior 2026-11-11: no gradients", () => {
  it("tailwind config defines no gradient background utilities", () => {
    expect(config).not.toContain("radial-gradient(");
    expect(config).not.toContain("linear-gradient(");
    expect(config).not.toContain("hero-wash");
  });

  it("the only gradient left in src is the skeleton shimmer sweep", () => {
    // Research §7 Phase 3: "No gradients anywhere in the product
    // surface (allowed hits: skeleton shimmer and nothing else)".
    const shimmerCount = (css.match(/linear-gradient\(/g) || []).length;
    expect(shimmerCount).toBe(2);

    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          if (name !== "test") walk(p);
        } else if (/\.(tsx|ts|css)$/.test(name) && p !== resolve(__dirname, "../index.css")) {
          if (/gradient/i.test(readFileSync(p, "utf8"))) offenders.push(p);
        }
      }
    };
    walk(resolve(__dirname, ".."));
    expect(offenders).toEqual([]);
  });
});

describe("paypal interior 2026-11-11: shell + home arrangement", () => {
  it("the shell owns one 1200px content column (max-w-content)", () => {
    expect(layout).toContain("max-w-content");
    expect(layout).not.toContain("max-w-[1440px]");
  });

  it("the top bar is a solid surface, not glass", () => {
    // PIN MOVED (classic PayPal shell, CEO decision 2026-11-11 17:12):
    // the solid surface is now the classic navy bar. The invariant —
    // solid, never glass/blur — is unchanged.
    expect(desktopNav).toContain("bg-navybar text-white border-b border-white/10");
    expect(desktopNav).not.toContain("backdrop-blur");
  });

  it("patient home: slate-900 panels are gone, and so is the navy band", () => {
    expect(patientHome).not.toContain("bg-slate-900");
    // PIN MOVED 2026-11-11 (fidelity rebuild): this assertion used to
    // REQUIRE "bg-navy" — the navy next-appointment band. The CEO then
    // ordered copying PayPal's CURRENT design, whose signed-in home has
    // no coloured bands at all: the summary is two white hairline
    // modules. The pin now forbids the band it once mandated; the full
    // anatomy is pinned in paypal-fidelity-2026-11-11.test.ts.
    expect(patientHome).not.toContain("bg-navy");
  });

  it("patient home: no hover lift/scale choreography on tiles", () => {
    expect(patientHome).not.toContain("hover:-translate-y");
    expect(patientHome).not.toContain("group-hover:scale");
    expect(patientHome).not.toContain("active:scale");
  });

  it("patient home: onboarding header is left-aligned, no eyebrow pill", () => {
    expect(patientHome).not.toContain("text-center space-y-3");
    expect(patientHome).not.toContain("Patient Onboarding</span>\n          </div>");
  });
});

describe("paypal interior 2026-11-11: suggestion banner dark mode + old-blue remnants", () => {
  const banner = read("../components/guidance/SuggestionBanner.tsx");

  it("every banner variant pairs its pale tint with a dark surface", () => {
    // Root cause of the /appointments dark defect: bg-primary-50 is a
    // fixed #f0f6ff that never adapts, while index.css remaps
    // .text-graphite-600 to light #d6d3d1 under .dark — light text on a
    // pale slab at ~1.2:1. No variant bg may be a light-only tint again.
    expect(banner).not.toMatch(/bg: 'bg-(primary|success|warning|accent)-50'/);
    expect(banner).toContain("dark:bg-primary-500/10");
    expect(banner).toContain("dark:bg-success-500/10");
    expect(banner).toContain("dark:bg-warning-500/10");
    expect(banner).toContain("dark:bg-accent-500/10");
  });

  it("banner titles and icons carry light dark-mode steps", () => {
    expect(banner).toContain("dark:text-primary-100");
    expect(banner).toContain("dark:text-success-100");
    expect(banner).toContain("dark:text-warning-100");
    expect(banner).toContain("dark:text-accent-100");
    expect(banner).toContain("dark:text-primary-400");
    expect(banner).toContain("dark:text-success-400");
    expect(banner).toContain("dark:text-warning-400");
    expect(banner).toContain("dark:text-accent-400");
  });

  it("no old Signal Blue ramp hex survives anywhere in src or the config", () => {
    // The pre-PayPal primary ramp (parent of the PayPal-interior
    // commit): hard-coded copies lingered in chart colours, a splash
    // heading, confetti and a dark token after the ramp was replaced.
    const oldRamp = [
      "#397dff", "#f0f5ff", "#e0ebff", "#c2d7ff", "#94bfff",
      "#5da3ff", "#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a",
    ];
    for (const hex of oldRamp) {
      expect(config.toLowerCase()).not.toContain(hex);
      expect(css.toLowerCase()).not.toContain(hex);
    }
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          if (name !== "test") walk(p);
        } else if (/\.(tsx|ts|css)$/.test(name)) {
          const content = readFileSync(p, "utf8").toLowerCase();
          if (oldRamp.some((hex) => content.includes(hex))) offenders.push(p);
        }
      }
    };
    walk(resolve(__dirname, ".."));
    expect(offenders).toEqual([]);
  });
});
