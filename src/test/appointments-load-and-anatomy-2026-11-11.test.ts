import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// APPOINTMENTS LOAD + ANATOMY FIXES (post-rollout rendered verification,
// 2026-11-11). Three findings from a seeded QA patient session:
//  1. /appointments rendered "No appointments scheduled yet" on first
//     navigation and stayed empty, while Home's Recent activity listed
//     the same appointments; a full reload fixed it. Root cause: the
//     page query was keyed WITHOUT identity, had no `enabled` gate, and
//     its fetcher threw "User not authenticated" when it fired before
//     the session finished restoring — useApiQuery only retries network
//     errors, so the throw parked the query in a permanent error state
//     for the life of the mount and data defaulted to []. Every Home
//     query is keyed on user.id with enabled: !!user and never threw.
//  2. The Upcoming row's Cancel was a ghost text button and the two
//     sections were bordered cards; both now follow the Recent-activity
//     pattern (outline pill action; quiet label + ONE hairline list).
//  3. Remaining pale-blue tint strips on the patient shell (profile
//     completion banner, Quick Workflows header strips, the "Get
//     Started" guidance banner) are white hairline cards now. Semantic
//     status tints (amber pending, emerald verified, destructive) are
//     deliberately untouched — they encode state, not decoration.
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

const appointments = read("../pages/Appointments.tsx");
const prescriptions = read("../pages/Prescriptions.tsx");
const patientHome = read("../components/workflows/PatientWorkflow.tsx");
const statusBanners = read("../components/dashboard/StatusBanners.tsx");
const connectedWorkflows = read("../components/home/ConnectedWorkflows.tsx");
const suggestionBanner = read("../components/guidance/SuggestionBanner.tsx");

describe("appointments load fix 2026-11-11: identity gating", () => {
  it("the appointments query is keyed on the resolved user id", () => {
    expect(appointments).toContain(
      '["appointments", user?.id ?? "pending", isProvider ? "provider" : "patient"]'
    );
  });

  it("the query is enabled only once identity AND roles have resolved", () => {
    expect(appointments).toContain("enabled: !!user?.id && !rolesLoading");
    expect(appointments).toContain("const { user } = useAuth();");
    expect(appointments).toContain("loading: rolesLoading");
  });

  it("the fetcher no longer throws on an unrestored session", () => {
    expect(appointments).not.toContain("supabase.auth.getUser()");
    expect(appointments).not.toContain('throw new Error("User not authenticated")');
    expect(appointments).toContain("if (!user) return [];");
  });

  it("home next-appointment card never claims empty before its query settles", () => {
    expect(patientHome).toContain("isPending: upcomingPending");
    expect(patientHome).toContain("const upcomingLoading = !user || upcomingPending;");
    expect(patientHome).toContain("Loading your appointments…");
    // The false-empty string still exists, but only behind the
    // settled-and-truly-empty branch.
    expect(patientHome).toContain("No upcoming appointments — book your next visit");
  });
});

describe("appointments anatomy 2026-11-11: actions + sections", () => {
  it("upcoming Cancel is a proper outline pill, not a ghost text button", () => {
    expect(appointments).toContain(
      'variant="outline" onClick={() => setCancelTarget(app)}'
    );
    expect(appointments).not.toContain(
      'variant="ghost" onClick={() => setCancelTarget(app)}'
    );
  });

  it("row action sets are unchanged: Join on upcoming video rows, Re-book on past rows", () => {
    expect(appointments).toContain("to={`/video-call/${app.id}`}");
    expect(appointments).toContain("Re-book");
  });

  it("sections are quiet labels + ONE hairline list each, counts preserved", () => {
    expect(appointments).toContain("Upcoming &amp; Active Appointments");
    expect(appointments).toContain("Past &amp; Completed");
    expect(appointments).toContain("{upcoming.length}");
    expect(appointments).toContain("{past.length}");
    // The old bordered header bars are gone.
    expect(appointments).not.toContain(
      "px-5 py-4 border-b border-border flex items-center justify-between"
    );
    // Both lists render as bare divide-y surfaces, Recent-activity style.
    expect(appointments.match(/<div className="divide-y divide-border">/g)?.length).toBe(2);
    expect(appointments).toContain(
      "text-lg sm:text-xl font-semibold text-foreground tracking-tight"
    );
  });
});

describe("tint cleanup 2026-11-11: patient shell", () => {
  it("profile-completion banner is a white hairline card; semantic status tints survive", () => {
    expect(statusBanners).toContain("Complete Your Profile");
    expect(statusBanners).not.toContain("bg-primary/5 dark:bg-primary/10");
    expect(statusBanners).not.toContain("border-primary/30");
    // Untouched on purpose: pending (amber) + verified (emerald) encode state.
    expect(statusBanners).toContain("border-amber-500/30 bg-amber-500/5");
    expect(statusBanners).toContain("border-emerald-500/30 bg-emerald-500/5");
  });

  it("quick workflows header strips are white hairline with blue title text", () => {
    expect(connectedWorkflows).not.toContain("bg-primary-500/10");
    expect(connectedWorkflows).toContain(
      'CardHeader className="py-2 px-3 border-b border-border"'
    );
    expect(connectedWorkflows).toContain("text-primary-500");
  });

  it("suggestion banner gains a plain white-card variant; patient prompts use it", () => {
    expect(suggestionBanner).toContain("'plain'");
    expect(suggestionBanner).toContain("plain: {");
    expect(suggestionBanner).toContain("bg: 'bg-card'");
    expect(suggestionBanner).toContain("border: 'border-border'");
    // The semantic variants keep their tints.
    expect(suggestionBanner).toContain("bg-success-50 dark:bg-success-500/10");
    expect(suggestionBanner).toContain("bg-warning-50 dark:bg-warning-500/10");
    // Patient-shell call sites converted; copy + actions unchanged.
    expect(appointments).toContain('title="Get Started with Your Healthcare Journey"');
    expect(appointments).toContain('variant="plain"');
    expect(appointments).not.toContain('variant="info"');
    expect(prescriptions).toContain('title="No Active Prescriptions"');
    expect(prescriptions).toContain('variant="plain"');
    expect(prescriptions).not.toContain('variant="info"');
  });
});
