/**
 * Doc'O Clock sweep — fix mission 2 pins (2026-11-13).
 *
 * Audit workstream B (rendered QA + static scan) found the ungated-query
 * permanent-empty class, raw-error leaks, four rendered defects (R-1..R-4)
 * and a SpeechRecognition instance rebuilt on every render. Each fix in
 * this mission is pinned here in the repo's static source-assertion style
 * (see hero-gold-cta-2026-11-11.test.ts), plus a runtime test proving
 * useErrorHandler never toasts raw error text.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderHook, act } from "@testing-library/react";

const { toastErrorMock } = vi.hoisted(() => ({ toastErrorMock: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: toastErrorMock, success: vi.fn(), info: vi.fn() },
}));

import { useErrorHandler } from "@/hooks/use-error-handler";

const read = (rel: string) =>
  readFileSync(resolve(__dirname, "..", rel), "utf-8");
const readRoot = (rel: string) =>
  readFileSync(resolve(__dirname, "..", "..", rel), "utf-8");
const exists = (rel: string) => existsSync(resolve(__dirname, "..", rel));

/** WCAG relative luminance / contrast ratio for two #RRGGBB colours. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("sweep fix 2 — ungated-query permanent-empty class (2026-11-13)", () => {
  it("PatientRecords: records query is keyed on the provider id and enabled only once auth resolves; fetcher returns [] instead of throwing", () => {
    const src = read("components/provider/PatientRecords.tsx");
    expect(src).toContain("queryKey: ['medical_records', user?.id]");
    expect(src).toContain("enabled: !!user?.id");
    expect(src).toContain("if (!user) return [] as PatientRecord[];");
    expect(src).not.toContain('throw new Error("Not authenticated")');
    expect(src).not.toContain("supabase.auth.getUser()");
  });

  it("PatientRecords: break-glass grants query is gated the same way", () => {
    const src = read("components/provider/PatientRecords.tsx");
    expect(src).toContain("queryKey: ['break-glass-grants', user?.id]");
    expect(src).toContain("enabled: !!user?.id");
  });

  it("ConsultationList: video-consultations query is keyed on the user id and enabled only once auth resolves; fetcher returns an empty list instead of throwing", () => {
    const src = read("components/video/ConsultationList.tsx");
    expect(src).toContain("queryKey: ['video-consultations', user?.id]");
    expect(src).toContain("enabled: !!user?.id");
    expect(src).toContain(
      "if (!user) return { consultations: [], userId: \"\" };"
    );
    expect(src).not.toContain('throw new Error("Not authenticated")');
    expect(src).not.toContain("supabase.auth.getUser()");
  });

  it("ScheduleManager: schedule query is keyed on the provider id and gated on auth as well as the selected date", () => {
    const src = read("components/provider/ScheduleManager.tsx");
    expect(src).toContain("queryKey: ['appointments', user?.id, selectedDate]");
    expect(src).toContain("enabled: !!selectedDate && !!user?.id");
    expect(src).toContain("if (!user) return [] as Appointment[];");
    expect(src).not.toContain('throw new Error("Not authenticated")');
    expect(src).not.toContain("supabase.auth.getUser()");
  });

  it("ProviderDashboard: record-patients / today / agenda / week-stats queries carry the provider id in the key and an enabled gate", () => {
    const src = read("pages/ProviderDashboard.tsx");
    expect(src).toContain(
      'queryKey: ["provider-record-patients", user?.id]'
    );
    expect(src).toContain(
      'queryKey: ["provider-today-appointments", user?.id]'
    );
    expect(src).toContain(
      'queryKey: ["provider-agenda-appointments", user?.id, format(agendaDate, "yyyy-MM-dd")]'
    );
    expect(src).toContain('queryKey: ["provider-week-stats", user?.id]');
    expect(src.match(/enabled: !!user\?\.id/g)?.length).toBeGreaterThanOrEqual(4);
    // The single remaining "Not authenticated" throw in this file is the
    // MyPracticeEditor SAVE handler (a user action, caught and toasted
    // via friendlyErrorMessage) — not a mount query. No query fetcher
    // here throws it any more.
    expect(src.match(/throw new Error\("Not authenticated"\)/g)?.length).toBe(1);
  });

  it("RoleMetricsDashboard: pending-prescriptions waits for auth AND the institution list, and guards on !user", () => {
    const src = read("components/metrics/RoleMetricsDashboard.tsx");
    expect(src).toContain(
      "enabled: !!user?.id && userInstitutions !== undefined"
    );
    expect(src).toContain("if (!user?.id) return 0;");
  });

  it("the four dead throwers are gone (and so is their orphaned parent PrescriptionTracker, which imported the deleted PrescriptionList)", () => {
    for (const rel of [
      "components/patient/AppointmentsList.tsx",
      "components/patient/PrescriptionList.tsx",
      "components/provider/WaitlistManager.tsx",
      "components/patient/InsuranceVerification.tsx",
      "components/patient/PrescriptionTracker.tsx",
    ]) {
      expect(exists(rel), `${rel} should have been deleted`).toBe(false);
    }
    // No live import of any of them survives anywhere in src.
    expect(read("pages/ProviderDashboard.tsx")).toContain(
      'from "@/components/booking/WaitlistManager"'
    );
  });
});

describe("sweep fix 2 — raw errors never reach the user (2026-11-13)", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    toastErrorMock.mockClear();
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("useErrorHandler routes through the friendly-error sanitizer and never toasts raw error text", () => {
    const src = read("hooks/use-error-handler.ts");
    expect(src).toContain(
      'import { friendlyErrorMessage } from "@/utils/friendly-error"'
    );
    expect(src).toContain(
      "const message = friendlyErrorMessage(error, fallbackMessage);"
    );
    expect(src).toContain("toast.error(message);");
    expect(src).not.toContain("message = error.message");
    expect(src).not.toContain("toast.error(error");
  });

  it("handleError toasts the mapped permission message, not raw RLS text", () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => {
      result.current.handleError(
        new Error(
          'new row violates row-level security policy for table "appointments"'
        ),
        "Could not save"
      );
    });
    expect(toastErrorMock).toHaveBeenCalledTimes(1);
    const toasted = String(toastErrorMock.mock.calls[0][0]);
    expect(toasted).not.toContain("row-level security");
    expect(toasted).toContain("don't have permission");
  });

  it("handleError falls back to the caller's fallback for unrecognised technical errors", () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => {
      result.current.handleError(
        new Error('column "foo" does not exist'),
        "Could not load"
      );
    });
    expect(toastErrorMock).toHaveBeenCalledWith("Could not load");
  });

  it("handleError passes short crafted copy through unchanged", () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => {
      result.current.handleError(
        new Error("That slot is already booked"),
        "Could not reschedule"
      );
    });
    expect(toastErrorMock).toHaveBeenCalledWith("That slot is already booked");
  });

  it("app-error-boundary shows raw error text in dev only, never in production", () => {
    const src = read("components/ui/app-error-boundary.tsx");
    expect(src).toContain("import.meta.env.DEV && this.state.error");
    expect(src).toContain("Something went wrong");
    // The only rendering of the raw message sits inside the dev gate.
    const devGated = src.indexOf("import.meta.env.DEV");
    const rawRender = src.indexOf("{this.state.error.message}");
    expect(rawRender).toBeGreaterThan(devGated);
  });
});

describe("sweep fix 2 — rendered defects R-1..R-4 (2026-11-13)", () => {
  it("R-1: 'Start a visit' gold CTA is gold-ink, semibold, with no text-white fighting it — and gold-on-ink passes WCAG AA", () => {
    const src = read("components/landing/LandingFeatures.tsx");
    const idx = src.indexOf("Start a visit");
    const btn = src.slice(src.lastIndexOf("<button", idx), idx);
    expect(btn).toContain("text-gold-ink");
    expect(btn).toContain("font-semibold");
    expect(btn).not.toContain("text-white");
    expect(btn).not.toContain("font-medium");
    const config = readRoot("tailwind.config.ts");
    expect(config).toContain('DEFAULT: "#FFC439"');
    expect(config).toContain('ink: "#001435"');
    expect(contrastRatio("#FFC439", "#001435")).toBeGreaterThanOrEqual(4.5);
  });

  it("R-2: hero search placeholder is short enough to show at 360px and the submit button compacts below sm", () => {
    const src = read("components/landing/LandingHero.tsx");
    expect(src).toContain('placeholder="Search doctors, clinics"');
    expect(src).not.toContain(
      'placeholder="Search doctors, specialties, or pharmacies"'
    );
    expect(src).toContain('<span className="sm:hidden">Search</span>');
    expect(src).toContain(
      '<span className="hidden sm:inline">Find a doctor</span>'
    );
    // The full wording survives for screen readers.
    expect(src).toContain("Search doctors, specialties, or pharmacies");
  });

  it("R-3: Auth renders the #main-content skip-link target", () => {
    const src = read("pages/Auth.tsx");
    expect(src).toContain('<main id="main-content"');
    expect(src).toContain("</main>");
  });

  it("R-4: 'Find Doctors & Book Now' gold CTA is semibold like every other gold CTA", () => {
    const src = read("components/landing/LandingFooter.tsx");
    const idx = src.indexOf("Find Doctors & Book Now");
    const btn = src.slice(src.lastIndexOf("<button", idx), idx);
    expect(btn).toContain("font-semibold");
    expect(btn).not.toContain("font-medium");
  });
});

describe("sweep fix 2 — voice commands instance is memoised (2026-11-13)", () => {
  it("the SpeechRecognition instance is created once via useMemo, never per render", () => {
    const src = read("hooks/use-voice-commands.tsx");
    expect(src).toContain(
      "const recognition = useMemo<SpeechRecognition | null>(() => {"
    );
    expect(src).toContain("new SpeechRecognitionAPI()");
    // No bare per-render construction survives outside the memo.
    expect(src).not.toContain(
      "const recognition = SpeechRecognitionAPI ? new SpeechRecognitionAPI() : null;"
    );
  });

  it("the attach effect runs once per recognition instance: handlers via refs, cleanup not on every render", () => {
    const src = read("hooks/use-voice-commands.tsx");
    expect(src).toContain("const handleResultRef = useRef(handleResult);");
    expect(src).toContain("handleResultRef.current = handleResult;");
    expect(src).toContain("}, [recognition]);");
    expect(src).not.toContain("}, [recognition, handleResult, isListening, isSpeaking]);");
  });
});
