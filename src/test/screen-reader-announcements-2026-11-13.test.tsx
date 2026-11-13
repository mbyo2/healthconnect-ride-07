/**
 * Screen-reader announcement coverage (2026-11-13).
 *
 * Screen-reader mode worked when deliberately ON, but announcement
 * coverage was near-zero: screenReaderAnnounce had exactly ONE consumer
 * outside the context, no page announced on load/navigation, and nothing
 * announced booking, payment, or record state changes.
 *
 * Contract pinned here:
 *  1. RouteAnnouncer (app shell) announces the page title on every
 *     navigation and on first load, through AccessibilityContext only.
 *  2. useAnnounceOnChange announces a derived message when a watched
 *     value changes to non-null, never on mount.
 *  3. Announcements are SPOKEN only when screen reader mode is ON;
 *     with the mode OFF, nothing speaks — on any wired flow.
 *  4. The five key flows are wired: page load/navigation, booking
 *     created/cancelled, payment/top-up result, medical record
 *     opened/updated, auth success/failure.
 *  5. No new speechSynthesis.speak / SpeechSynthesisUtterance site is
 *     added anywhere (the choke-point pin in tts-opt-in-2026-11-11
 *     covers the whole tree; this file pins the two new modules too).
 *  6. The dead, unmounted VoiceCommandsHelp component is gone and
 *     nothing imports it.
 */
import React, { useState } from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { MemoryRouter, useNavigate } from "react-router-dom";
import "@testing-library/jest-dom/vitest";

const h = vi.hoisted(() => ({
  userId: null as string | null,
  listener: null as null | ((event: string, session: unknown) => void),
  serverRow: null as { setting_key?: string; value?: unknown } | null,
  upserts: [] as Record<string, unknown>[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: h.userId ? { user: { id: h.userId } } : null },
      }),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        h.listener = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    from: () => ({
      upsert: async (row: Record<string, unknown>) => {
        h.upserts.push(row);
        return { error: null };
      },
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: h.serverRow, error: null }),
        }),
      }),
    }),
  },
}));

import {
  AccessibilityProvider,
  useAccessibility,
  a11yStorageKey,
  TTS_DEFAULT_OFF_RESET_PREFIX,
} from "@/context/AccessibilityContext";
import { RouteAnnouncer } from "@/components/RouteAnnouncer";
import { useAnnounceOnChange } from "@/hooks/use-announce-on-change";

const SRC_ROOT = resolve(__dirname, "../");
const readSrc = (p: string) => readFileSync(resolve(__dirname, "../../", p), "utf8");

const speakSpy = vi.fn();
const cancelSpy = vi.fn();

class FakeUtterance {
  text: string;
  rate = 1;
  pitch = 1;
  volume = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

const seedScreenReaderOn = () => {
  localStorage.setItem(
    a11yStorageKey("guest"),
    JSON.stringify({
      preferences: {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        screenReader: true,
        dyslexiaFont: false,
      },
      easyReading: false,
      textSize: 1,
    }),
  );
  // The one-time stale-ON reset already happened for this scope, so the
  // stored ON is the user's real choice.
  localStorage.setItem(`${TTS_DEFAULT_OFF_RESET_PREFIX}guest`, "1");
};

let api: ReturnType<typeof useAccessibility>;
const Probe = () => {
  api = useAccessibility();
  return <div data-testid="sr">{String(api.isScreenReaderEnabled)}</div>;
};

const NavHarness = () => {
  const navigate = useNavigate();
  return (
    <div>
      <RouteAnnouncer />
      <Probe />
      <button
        onClick={() => {
          document.title = "Wallet | Doc' O Clock";
          navigate("/wallet");
        }}
      >
        go wallet
      </button>
    </div>
  );
};

const HookHarness = () => {
  const [count, setCount] = useState<number | null>(null);
  useAnnounceOnChange(
    count,
    (n) => (n === 0 ? "No records yet." : `${n} records loaded.`),
    false,
  );
  return (
    <div>
      <Probe />
      <button onClick={() => setCount(3)}>load records</button>
    </div>
  );
};

const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  h.userId = null;
  h.serverRow = null;
  h.upserts = [];
  speakSpy.mockClear();
  cancelSpy.mockClear();
  Object.defineProperty(window, "speechSynthesis", {
    writable: true,
    configurable: true,
    value: { speak: speakSpy, cancel: cancelSpy },
  });
  (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance = FakeUtterance;
  document.title = "";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("RouteAnnouncer — page load / navigation", () => {
  it("announces the page title on load when screen reader mode is ON", async () => {
    seedScreenReaderOn();
    document.title = "Appointments | Doc' O Clock";
    render(
      <MemoryRouter initialEntries={["/appointments"]}>
        <AccessibilityProvider>
          <NavHarness />
        </AccessibilityProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("sr")).toHaveTextContent("true");
    await advance(400);
    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect((speakSpy.mock.calls[0][0] as FakeUtterance).text).toBe("Appointments");
  });

  it("announces the new page title on navigation when mode is ON", async () => {
    seedScreenReaderOn();
    document.title = "Appointments | Doc' O Clock";
    render(
      <MemoryRouter initialEntries={["/appointments"]}>
        <AccessibilityProvider>
          <NavHarness />
        </AccessibilityProvider>
      </MemoryRouter>,
    );
    await advance(400);
    speakSpy.mockClear();
    fireEvent.click(screen.getByText("go wallet"));
    await advance(400);
    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect((speakSpy.mock.calls[0][0] as FakeUtterance).text).toBe("Wallet");
  });

  it("announces NOTHING spoken when screen reader mode is OFF (the default)", async () => {
    document.title = "Appointments | Doc' O Clock";
    render(
      <MemoryRouter initialEntries={["/appointments"]}>
        <AccessibilityProvider>
          <NavHarness />
        </AccessibilityProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("sr")).toHaveTextContent("false");
    await advance(400);
    fireEvent.click(screen.getByText("go wallet"));
    await advance(400);
    expect(speakSpy).not.toHaveBeenCalled();
  });

  it("falls back to the route-title map when document.title is empty", async () => {
    seedScreenReaderOn();
    document.title = "";
    render(
      <MemoryRouter initialEntries={["/medical-records"]}>
        <AccessibilityProvider>
          <NavHarness />
        </AccessibilityProvider>
      </MemoryRouter>,
    );
    await advance(400);
    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect((speakSpy.mock.calls[0][0] as FakeUtterance).text).toBe("Medical Records");
  });
});

describe("useAnnounceOnChange — state-change announcements", () => {
  it("stays silent on mount, speaks when the watched value changes (mode ON)", async () => {
    seedScreenReaderOn();
    render(
      <AccessibilityProvider>
        <HookHarness />
      </AccessibilityProvider>,
    );
    await advance(100);
    expect(speakSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("load records"));
    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect((speakSpy.mock.calls[0][0] as FakeUtterance).text).toBe("3 records loaded.");
  });

  it("speaks NOTHING when screen reader mode is OFF", async () => {
    render(
      <AccessibilityProvider>
        <HookHarness />
      </AccessibilityProvider>,
    );
    await advance(100);
    fireEvent.click(screen.getByText("load records"));
    expect(speakSpy).not.toHaveBeenCalled();
  });
});

describe("Flow wiring — source pins", () => {
  it("the app shell mounts the RouteAnnouncer next to the title manager", () => {
    const app = readSrc("src/App.tsx");
    expect(app).toContain("RouteAnnouncer");
    expect(app).toContain("<RouteAnnouncer />");
  });

  it("booking created is announced in BookingModal", () => {
    const src = readSrc("src/components/booking/BookingModal.tsx");
    expect(src).toContain("screenReaderAnnounce");
    expect(src).toContain('screenReaderAnnounce("Appointment booked successfully.');
  });

  it("booking cancelled (and a failed cancel) is announced in Appointments", () => {
    const src = readSrc("src/pages/Appointments.tsx");
    expect(src).toContain('screenReaderAnnounce("Appointment cancelled.');
    expect(src).toContain('screenReaderAnnounce("Could not cancel the appointment.');
  });

  it("payment result is announced in PaymentSuccess and WalletTopUp", () => {
    const success = readSrc("src/pages/PaymentSuccess.tsx");
    expect(success).toContain("useAnnounceOnChange");
    expect(success).toContain("Payment successful.");
    expect(success).toContain('screenReaderAnnounce("Payment failed.');
    const topUp = readSrc("src/components/wallet/WalletTopUp.tsx");
    expect(topUp).toContain('screenReaderAnnounce("Payment confirmed. Your wallet has been credited.');
    expect(topUp).toContain('screenReaderAnnounce("Payment successful. Your wallet has been credited.');
    expect(topUp).toContain('screenReaderAnnounce("This payment did not complete.');
    expect(topUp).toContain('screenReaderAnnounce("Top-up failed.');
  });

  it("medical record opened/updated is announced in MedicalRecords", () => {
    const src = readSrc("src/pages/MedicalRecords.tsx");
    expect(src).toContain("useAnnounceOnChange");
    expect(src).toContain("Your health records loaded.");
    expect(src).toContain('screenReaderAnnounce("Your health records have been exported.');
    expect(src).toContain('screenReaderAnnounce("We could not load your health records.');
  });

  it("auth success and failure are announced in Auth", () => {
    const src = readSrc("src/pages/Auth.tsx");
    expect(src).toContain('screenReaderAnnounce("Signed in successfully.');
    expect(src).toContain("screenReaderAnnounce(`Sign-in failed.");
    expect(src).toContain("screenReaderAnnounce(`Account creation failed.");
    expect(src).toContain('screenReaderAnnounce("Account created. Check your email to verify.');
  });

  it("the new announcer modules add no speechSynthesis site", () => {
    for (const p of ["src/components/RouteAnnouncer.tsx", "src/hooks/use-announce-on-change.ts"]) {
      const src = readSrc(p);
      expect(src).not.toContain("speechSynthesis");
      expect(src).not.toContain("SpeechSynthesisUtterance");
    }
  });

  it("dead VoiceCommandsHelp is gone and nothing imports it", () => {
    expect(existsSync(resolve(__dirname, "../../src/components/VoiceCommandsHelp.tsx"))).toBe(false);
    const files = readdirSync(SRC_ROOT, { recursive: true })
      .map(String)
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => !f.includes("test"));
    const importers: string[] = [];
    for (const rel of files) {
      const content = readFileSync(join(SRC_ROOT, rel), "utf8");
      if (content.includes("VoiceCommandsHelp")) importers.push(rel.replace(/\\/g, "/"));
    }
    expect(importers).toEqual([]);
  });
});
