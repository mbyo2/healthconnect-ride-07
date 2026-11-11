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
    expect(desktopNav).toContain("bg-card border-b border-border");
    expect(desktopNav).not.toContain("backdrop-blur");
  });

  it("patient home: slate-900 panels are gone, the summary band is navy", () => {
    expect(patientHome).not.toContain("bg-slate-900");
    expect(patientHome).toContain("bg-navy");
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
