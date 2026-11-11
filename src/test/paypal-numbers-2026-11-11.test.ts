import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// PAYPAL NUMBERS (CEO order 2026-11-11, classic PayPal reference photos):
// numbers are the visual hero of every card, the way PayPal renders them —
// the app balance huge and extra-bold in near-black on the sky card; web
// "Insights" figures large and bold with a small label above and a muted
// caption below. One numeral scale, defined once in the Tailwind ramp:
//   heronum  = hero balances (44px/800)
//   statnum  = stat / insight figures (30px/800)
// Every money/count numeral carries tabular-nums; no stat figure renders
// in a colour other than ink except money-in green / a genuinely negative
// figure; no amount renders in font-mono or a light weight. Presentation
// only — values and currency formatting are untouched.
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

const config = read("../../tailwind.config.ts");
const walletCard = read("../components/home/WalletCard.tsx");
const institutionWallet = read("../components/wallet/InstitutionWalletPanel.tsx");
const platformWallet = read("../components/wallet/PlatformWalletPanel.tsx");
const pricingPage = read("../components/subscription/PricingPage.tsx");
const metricCard = read("../components/shared/MetricCard.tsx");
const kpiCard = read("../components/ui-custom/KPICard.tsx");
const institutionDash = read("../pages/InstitutionDashboard.tsx");
const providerDash = read("../pages/ProviderDashboard.tsx");
const pharmacyManagement = read("../pages/PharmacyManagement.tsx");
const pharmacyDashboard = read("../components/pharmacy/PharmacyDashboard.tsx");
const pharmacySales = read("../components/pharmacy/PharmacySalesReport.tsx");
const hospitalBilling = read("../components/hospital/HospitalBilling.tsx");
const billingPage = read("../pages/Billing.tsx");
const earningsPanel = read("../components/wallet/EarningsPanel.tsx");
const patientQueue = read("../components/hospital/PatientQueue.tsx");
const cxoDashboard = read("../components/cxo/CXOExecutiveDashboard.tsx");
const queueDisplay = read("../pages/PublicQueueDisplay.tsx");
const pharmacyPOS = read("../components/pharmacy/PharmacyPOS.tsx");

describe("paypal numbers 2026-11-11: the numeral scale is defined once", () => {
  it("heronum is the 44px/800 hero scale and statnum the 30px/800 stat scale", () => {
    expect(config).toContain("'heronum': ['clamp(2rem, 11vw, 2.75rem)'");
    expect(config).toContain("'statnum': ['clamp(1.5rem, 7vw, 1.875rem)'");
    expect(config).toContain("fontWeight: '800'");
  });

  it("both numeral tokens are fluid (clamp) so figures fit 360-430px phones", () => {
    // CEO clarification 2026-11-11: words and numbers overflowing their
    // containers is the complaint — big PayPal numerals must still fit.
    const fontSizeBlock = config.slice(config.indexOf("'greeting'"), config.indexOf("'4xl'"));
    expect(fontSizeBlock).toContain("clamp(2rem, 11vw, 2.75rem)");
    expect(fontSizeBlock).toContain("clamp(1.5rem, 7vw, 1.875rem)");
    expect(metricCard).toContain("flex-1 min-w-0");
  });
});

describe("paypal numbers 2026-11-11: hero balances", () => {
  it("the patient wallet balance is heronum + tabular on the sky card", () => {
    expect(walletCard).toContain("text-heronum tabular-nums");
  });

  it("institution + platform wallet balances render at hero scale", () => {
    expect(institutionWallet).toContain("text-heronum tabular-nums");
    expect(platformWallet).toContain("text-heronum tabular-nums");
  });

  it("pricing plan amounts render at hero scale, tabular", () => {
    expect(pricingPage).toContain("text-heronum tabular-nums");
    expect(pricingPage).not.toContain('className="text-4xl font-bold">{formatKwacha(monthly)}');
  });

  it("the institution 'today' hero count is heronum + tabular", () => {
    expect(institutionDash).toContain("text-heronum tabular-nums");
  });
});

describe("paypal numbers 2026-11-11: stat figures share the statnum scale", () => {
  it("shared MetricCard + KPICard values use statnum + tabular", () => {
    expect(metricCard).toContain("text-statnum tabular-nums");
    expect(kpiCard).toContain("text-statnum");
    expect(kpiCard).toContain("tabular-nums");
  });

  it("pharmacy stat cards (management page, portal dashboard, sales report) use statnum + tabular", () => {
    expect(pharmacyManagement.match(/text-statnum/g)?.length).toBe(4);
    expect(pharmacyDashboard.match(/text-statnum tabular-nums/g)?.length).toBe(3);
    expect(pharmacySales.match(/text-statnum tabular-nums/g)?.length).toBe(4);
  });

  it("provider dashboard + queue + CXO stat figures use statnum + tabular", () => {
    expect(providerDash.match(/text-statnum/g)?.length).toBe(4);
    expect(patientQueue.match(/text-statnum tabular-nums/g)?.length).toBe(3);
    expect(cxoDashboard).toContain("text-statnum tabular-nums");
  });

  it("hospital billing KPI strip figures are ink statnum — no mono, no per-stat colour", () => {
    expect(hospitalBilling).toContain("text-statnum tabular-nums text-foreground");
    expect(hospitalBilling).not.toContain("font-mono\" style={{ color: c.color }}");
  });
});

describe("paypal numbers 2026-11-11: no mono or coloured amounts on touched surfaces", () => {
  it("no font-mono remains on amounts in the touched files (identifiers/receipt facsimiles excluded)", () => {
    // HospitalBilling keeps font-mono ONLY on the invoice_number identifier cell.
    const monoLines = hospitalBilling.split("\n").filter((l) => l.includes("font-mono"));
    expect(monoLines.length).toBe(1);
    expect(monoLines[0]).toContain("invoice_number");
    expect(pharmacyManagement).not.toContain("font-mono");
    expect(metricCard).not.toContain("font-mono");
    expect(earningsPanel).not.toContain("font-mono");
  });

  it("earnings figures: all-time total is ink (never blue), month keeps money-in green", () => {
    expect(earningsPanel).not.toContain("text-primary-600");
    expect(earningsPanel).toContain("sm:text-statnum text-foreground");
    expect(earningsPanel).toContain("sm:text-statnum text-success-600");
  });

  it("POS cart total is ink + tabular, not blue", () => {
    expect(pharmacyPOS).toContain('Total</span><span className="tabular-nums text-foreground">');
  });

  it("billing page totals carry tabular figures", () => {
    expect(billingPage).toContain('<span className="tabular-nums">{formatPrice(calculateTotals().total)}</span>');
    expect(billingPage).toContain('<span className="tabular-nums">{formatPrice(showReceipt.total_amount)}</span>');
  });

  it("the public queue board's now-calling token is extra-bold tabular", () => {
    expect(queueDisplay).toContain("font-extrabold tabular-nums");
  });
});
