import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
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
