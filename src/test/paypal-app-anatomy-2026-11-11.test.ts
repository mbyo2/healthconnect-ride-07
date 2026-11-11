import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// PAYPAL APP ANATOMY + TYPOGRAPHY (CEO scope extensions 2026-11-11, from
// his own PayPal app screenshots: "doesn't look like that — looks like AI
// slop", "even the font and layout"). The two surfaces he judges — the
// institution dashboard and the patient home — are rebuilt to the app
// anatomy: bold greeting header, ONE sky hero card, pale-circle quick
// actions, segmented pale-pill tabs, hairline lists instead of stacked
// cards, Manrope type with a fixed ramp, 20px gutters / 20-24px gaps /
// 24px hero radius / 56px action circles / ~64px list rows.
// Desktop arrangements are deliberately untouched (lg+ / md+ classes
// restore the previous modules).
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

const css = read("../index.css");
const config = read("../../tailwind.config.ts");
const indexHtml = read("../../index.html");
const institution = read("../pages/InstitutionDashboard.tsx");
const patientHome = read("../components/workflows/PatientWorkflow.tsx");
const walletCard = read("../components/home/WalletCard.tsx");

describe("paypal app anatomy 2026-11-11: typography", () => {
  it("Manrope is the app font, loaded via the existing Google Fonts CSS import", () => {
    expect(css).toContain("family=Manrope:wght@400;500;600;700;800");
    expect(css).toContain("font-family: 'Manrope', system-ui, -apple-system, sans-serif");
    expect(config).toContain("sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif']");
    expect(css).not.toContain("'Figtree', system-ui");
  });

  it("font loading does NOT touch index.html (its inline-script hashes stay valid)", () => {
    expect(indexHtml).not.toContain("Manrope");
  });

  it("headings follow the PayPal ramp: 800 weight, -0.02em tracking", () => {
    expect(css).toContain("h1, h2, h3");
    expect(css).toContain("font-weight: 800");
    expect(css).toContain("letter-spacing: -0.02em");
  });

  it("the fixed type ramp exists: greeting 28px/800, heronum 40px/800", () => {
    expect(config).toContain("'greeting': ['1.75rem'");
    expect(config).toContain("'heronum': ['2.5rem'");
  });
});

describe("paypal app anatomy 2026-11-11: institution dashboard (mobile)", () => {
  it("greeting-style mobile header; the desktop header card is md+ only", () => {
    expect(institution).toContain("text-greeting");
    expect(institution).toContain("max-md:hidden");
    expect(institution).toContain("Pending verification");
  });

  it("exactly ONE sky hero card, carrying today's appointments as the headline number", () => {
    expect(institution.match(/60CDFF/g)?.length).toBe(2); // bg + border of the single hero
    expect(institution).toContain('aria-label="Today at your facility"');
    expect(institution).toContain("rounded-[24px]");
    expect(institution.match(/text-heronum/g)?.length).toBe(1);
    expect(institution).toContain("counts.todayAppointments");
    // Dark mode: the hero becomes a dark hairline card, never sky.
    expect(institution).toContain("dark:bg-card");
  });

  it("quick actions are 56px pale circles with 12px labels, max 4", () => {
    expect(institution).toContain("mobileQuickActions");
    expect(institution).toContain("h-14 w-14 rounded-full bg-pill");
    expect(institution).toContain("text-[12px] font-medium");
  });

  it("module tabs are segmented pale pills on mobile (blue active returns at md+)", () => {
    expect(institution).toContain(
      "bg-pill text-pill-foreground font-semibold md:bg-primary md:text-primary-foreground"
    );
    expect(institution).toContain("rounded-full");
  });

  it("stats are a hairline list on mobile; the MetricCard grid starts at sm", () => {
    expect(institution).toContain(
      "sm:hidden rounded-2xl border border-border bg-card px-4 divide-y divide-border"
    );
    expect(institution).toContain("hidden sm:grid sm:grid-cols-2 lg:grid-cols-4");
    expect(institution).toContain("min-h-16"); // ~64px rows
  });

  it("bottom padding clears the floating bottom nav + AI button on mobile", () => {
    expect(institution).toContain("pb-40 min-[1025px]:pb-16");
  });
});

describe("paypal app anatomy 2026-11-11: patient home (mobile)", () => {
  it("the wallet module is the sky hero below lg; white module on desktop", () => {
    expect(walletCard.match(/max-lg:bg-\[#60CDFF\]/g)?.length).toBe(1);
    expect(walletCard).toContain("dark:max-lg:bg-card");
    expect(walletCard).toContain("max-lg:rounded-[24px]");
    expect(walletCard).toContain("text-heronum");
    // Mobile hero CTA is a black pill; desktop keeps the blue pill.
    expect(walletCard).toContain("max-lg:bg-slate-950");
  });

  it("wallet hero leads on mobile; appointment card keeps desktop order at lg", () => {
    expect(patientHome).toContain("order-1 lg:order-2");
    expect(patientHome).toContain("order-2 lg:order-1");
    expect(patientHome).toContain("<WalletCard />");
  });

  it("greeting uses the ramp, subline is 13px, quick circles are 56px", () => {
    expect(patientHome).toContain("text-greeting");
    expect(patientHome).toContain("text-[13px] text-muted-foreground mt-1");
    expect(patientHome).toContain("w-14 h-14 rounded-full bg-muted");
  });

  it("bottom padding clears the floating chrome on mobile", () => {
    expect(patientHome).toContain("pb-32 min-[1025px]:pb-12");
  });
});
