import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// FIDELITY REBUILD (CEO order 2026-11-11): "check the way things look in
// PayPal and copy the design… it's still looking like ai slop."
//
// The previous pass copied the OLD PayPal (navy bands, card grids, rect
// buttons). The CURRENT PayPal, live-captured in
// goals/doc0clock-clinic-launch/hidden_files/paypal-anatomy-spec-2026-11-11.md,
// is: white/black minimalism, FULL-PILL buttons everywhere, hairline 1px
// borders, ~16px card radius, ZERO shadows, activity as hairline LISTS
// not card grids, two flat summary modules, navy retired to logo
// territory. These pins keep that anatomy from regressing.
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

const css = read("../index.css");
const config = read("../../tailwind.config.ts");
const button = read("../components/ui/button.tsx");
const card = read("../components/ui/card.tsx");
const desktopNav = read("../components/DesktopNav.tsx");
const patientHome = read("../components/workflows/PatientWorkflow.tsx");
const walletCard = read("../components/home/WalletCard.tsx");
const appointments = read("../pages/Appointments.tsx");
const walletHistory = read("../components/wallet/WalletHistory.tsx");
const medicalRecords = read("../pages/MedicalRecords.tsx");
const skeleton = read("../components/ui/skeleton-kit.tsx");

describe("paypal fidelity 2026-11-11: primitives", () => {
  it("buttons are full pills with no shadow, secondary is the pale pill", () => {
    expect(button).toContain("rounded-full");
    expect(button).not.toContain("shadow-button");
    expect(button).not.toContain("shadow-sm");
    expect(button).toContain("bg-pill text-pill-foreground");
  });

  it("the pale pill token exists in both modes (never a light-only slab)", () => {
    expect(css).toContain("--pill-secondary:");
    expect(css).toContain("--pill-secondary-foreground:");
    expect(config).toContain("pill: {");
  });

  it("product cards are 16px-radius hairline surfaces with no shadow", () => {
    expect(card).toContain("rounded-2xl border border-border bg-card");
    expect(card).not.toContain("shadow-");
    expect(config).toContain('card: "16px"');
  });

  it("the desktop nav active item is a pale pill, never a solid block", () => {
    expect(desktopNav).toContain("bg-accent text-accent-foreground");
    expect(desktopNav).not.toContain("bg-primary-500 text-white");
    expect(desktopNav).not.toContain("shadow-button");
  });
});

describe("paypal fidelity 2026-11-11: bands out", () => {
  it("patient home has no navy band and no solid triage band", () => {
    expect(patientHome).not.toContain("bg-navy");
    expect(patientHome).not.toContain("bg-primary-500 hover:bg-primary-600 text-white p-4");
    expect(patientHome).not.toContain("shadow-xs");
  });

  it("the wallet summary is a white module, not a blue band", () => {
    expect(walletCard).not.toContain("bg-primary-600");
    expect(walletCard).not.toContain("shadow-lg");
    expect(walletCard).toContain("Wallet balance");
  });

  it("interior navy header bands are retired in ERP / physio / peds", () => {
    for (const rel of [
      "../components/erp/ERPAdministration.tsx",
      "../components/specialized/PhysiotherapyCenter.tsx",
      "../components/specialized/PediatricCenter.tsx",
    ]) {
      expect(read(rel)).not.toContain("bg-navy");
    }
  });
});

describe("paypal fidelity 2026-11-11: patient home anatomy", () => {
  it("opens with a bold greeting and the two summary modules", () => {
    expect(patientHome).toContain("Good morning");
    expect(patientHome).toContain("Next appointment");
    expect(patientHome).toContain("<WalletCard />");
    // Summary modules sit side-by-side in one grid.
    expect(patientHome).toContain("lg:grid-cols-2");
  });

  it("quick actions are labelled pale circle icon buttons", () => {
    expect(patientHome).toContain("h-12 w-12 rounded-full bg-muted");
    expect(patientHome).toContain("Emergency Help");
    expect(patientHome).toContain("Hospitals &amp; Labs");
  });

  it("recent activity is a hairline list with status pills", () => {
    expect(patientHome).toContain("Recent activity");
    expect(patientHome).toContain("divide-y divide-border");
    expect(patientHome).toContain("StatusBadge");
    expect(patientHome).toContain("No recent activity yet");
  });

  it("no rounded-md primary buttons remain on the patient home", () => {
    expect(patientHome).not.toContain("rounded-md bg-primary-500");
    expect(patientHome).not.toContain("rounded-md font-semibold");
  });

  it("the skeleton twin mirrors the band-free anatomy", () => {
    const twin = skeleton.slice(skeleton.indexOf("SkeletonPatientHome"));
    expect(twin).not.toContain("bg-navy");
    expect(twin).not.toContain("bg-primary-500 p-4");
    expect(twin).toContain("divide-y divide-border");
  });
});

describe("paypal fidelity 2026-11-11: list conversions", () => {
  it("appointments: items are hairline rows at every width, sections shadow-free", () => {
    expect(appointments).not.toContain("m-3 rounded-lg border border-border bg-card p-3 shadow-xs");
    expect(appointments).toContain("divide-y divide-border px-4");
    expect(appointments).not.toContain("shadow-xs");
    expect(appointments).not.toContain("shadow-button");
  });

  it("wallet history: hairline rows, no glass card, PayPal amount rule", () => {
    expect(walletHistory).not.toContain("shadow-lg");
    expect(walletHistory).not.toContain("backdrop-blur");
    expect(walletHistory).toContain("divide-y divide-border");
    expect(walletHistory).toContain("rounded-full");
    // Money out renders in plain foreground, never red.
    expect(walletHistory).not.toContain("text-red-600'");
  });

  it("medical records: section lists are hairline rows, no card shadows", () => {
    expect(medicalRecords).not.toContain("shadow-xs");
    expect(medicalRecords).not.toContain("shadow-button");
    expect(medicalRecords).toContain("divide-y divide-border");
    expect(medicalRecords).not.toContain("p-3.5 rounded-xl border border-border bg-background");
  });
});

describe("paypal fidelity 2026-11-11: round-3 seeded re-check fixes", () => {
  it("activity feed lab rows read test_type (lab_tests has no test_name)", () => {
    // Phantom column: selecting test_name from lab_tests 400s the whole
    // PostgREST query, so lab rows silently never rendered. The live
    // name column on lab_tests is test_type (test_name is lab_results).
    expect(patientHome).toContain(".select('id, test_type, status, created_at')");
    expect(patientHome).toContain("t.test_type || 'Lab test'");
    expect(patientHome).not.toContain("test_name");
  });

  it("activity feed maps lab status 'completed' to Result ready", () => {
    // Live lab_tests statuses are only pending | sample_collected |
    // in_progress | completed | cancelled — 'resulted' never occurs.
    expect(patientHome).toContain("t.status === 'completed' ? 'Result ready'");
    expect(patientHome).not.toContain("'resulted'");
  });

  it("appointments: no <table> in the upcoming or past list sections", () => {
    // Desktop previously kept data tables inside both section cards
    // while mobile used hairline rows; both lists are now the single
    // hairline-row renderer at every width.
    const lists = appointments.slice(
      appointments.indexOf("Upcoming &amp; Active Appointments"),
      appointments.indexOf("{/* Reschedule dialog")
    );
    expect(lists).not.toContain("<table");
    expect(lists).not.toContain("<thead");
    expect(lists).toContain("{upcoming.map((app) => renderUpcomingRow(app))}");
    expect(lists).toContain("{past.map((app) => renderPastRow(app))}");
  });
});

describe("paypal fidelity 2026-11-11: rendered-verification follow-up fixes", () => {
  const walletTopUp = read("../components/wallet/WalletTopUp.tsx");
  const providerList = read("../components/ProviderList.tsx");
  const providerDetail = read("../pages/ProviderDetail.tsx");
  const auth = read("../pages/Auth.tsx");
  const profileSetup = read("../components/auth/ProfileSetup.tsx");

  it("wallet top-up is flat: no shadow utilities anywhere in the component", () => {
    // The Pay with Mobile Money CTA carried shadow-xl + shadow-primary/20
    // (a soft coloured glow, worst in dark mode) and the card shadow-lg.
    expect(walletTopUp).not.toContain("shadow");
    expect(walletTopUp).toContain("Pay with {paymentMethod");
  });

  it("booking CTAs use the --primary token so the dark-mode lift applies", () => {
    // Literal bg-primary-500 is a fixed palette step (#0066F5 in BOTH
    // modes); bg-primary resolves through the token, which lifts to
    // #529AFF in dark mode like every other primary.
    for (const src of [patientHome, providerList, providerDetail]) {
      expect(src).not.toContain("bg-primary-500 text-white");
      expect(src).not.toContain("bg-primary-500 hover:bg-primary-600");
      expect(src).not.toContain("group-hover:bg-primary-600");
    }
    // The named CTA: patient-home "Book Now" pill rides the token.
    expect(patientHome).toContain("bg-primary text-primary-foreground group-hover:bg-primary/90");
    expect(patientHome).toContain("'bg-primary text-primary-foreground hover:bg-primary/90'");
  });

  it("auth + onboarding primaries are the product Button (full pill)", () => {
    // Auth previously styled its submits with the marketing utility
    // vf-btn-primary (bg-primary-500 + shadow-button, rounded-rect in
    // effect); the front door now uses the same primitive as the
    // product, whose base class is rounded-full.
    expect(auth).not.toContain("vf-btn-primary");
    expect(auth).toContain('import { Button } from "@/components/ui/button"');
    expect(auth).toContain("<Button type=\"submit\"");
    expect(auth).toContain("Sign In");
    // Onboarding's Complete Profile submit is the same primitive.
    expect(profileSetup).toContain('from "@/components/ui/button"');
    expect(profileSetup).toContain("<Button type=\"submit\"");
    expect(profileSetup).toContain("Complete Profile");
    expect(button).toContain("rounded-full");
  });
});
