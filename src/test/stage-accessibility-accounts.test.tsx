/**
 * Completeness pass (2026-10-25) — accessibility per-account guarantees.
 *
 * CEO bug: accessibility "sometimes turns itself on even though I didn't
 * turn it on". Root causes proven in code: (1) all state lived in
 * browser-global localStorage keys that sign-out never cleared, so the
 * next account on the same browser inherited them; (2) silent Alt+R /
 * Alt+3 keyboard toggles persisted modes without opening the menu;
 * (3) a screen-reader auto-detection probe could flip state on mount;
 * (4) OS preference detection existed in a second, orphaned service.
 *
 * These tests pin the guarantees of the reworked AccessibilityContext:
 * defaults OFF (even with OS preferences asking for accommodations —
 * detection is surfaced, never adopted), per-account isolation in BOTH
 * directions, explicit OFF persisting, sign-out resetting visible state,
 * every preference applying a real document effect, and no keyboard
 * shortcut toggling a mode.
 */
import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
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
  parseA11yRecord,
} from "@/context/AccessibilityContext";

let api: ReturnType<typeof useAccessibility>;
const Probe = () => {
  api = useAccessibility();
  return <div data-testid="easy">{String(api.isEasyReadingEnabled)}</div>;
};

const mount = () =>
  render(
    <AccessibilityProvider>
      <Probe />
    </AccessibilityProvider>
  );

const signInAs = async (id: string) => {
  h.userId = id;
  await act(async () => {
    h.listener?.("SIGNED_IN", { user: { id } });
  });
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.style.fontSize = "";
  h.userId = null;
  h.listener = null;
  h.serverRow = null;
  h.upserts = [];
  // OS asks for reduced motion + higher contrast in these tests.
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion") || query.includes("prefers-contrast"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

describe("Accessibility per-account guarantees", () => {
  it("defaults are OFF even when the OS requests accommodations (detection ≠ choice)", async () => {
    mount();
    await waitFor(() => expect(api).toBeTruthy());
    expect(api.preferences).toEqual({
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      screenReader: false,
      dyslexiaFont: false,
    });
    expect(api.isEasyReadingEnabled).toBe(false);
    expect(api.textSize).toBe(1);
    // …but the detection itself is surfaced for the UI to mention.
    expect(api.systemPreferences.reducedMotion).toBe(true);
    expect(api.systemPreferences.highContrast).toBe(true);
    expect(document.documentElement.classList.contains("a11y-high-contrast")).toBe(false);
  });

  it("account A's choices never leak to account B, and return when A signs back in", async () => {
    mount();
    await signInAs("user-a");
    act(() => api.enableEasyReading());
    act(() => api.updatePreferences({ highContrast: true }));
    expect(parseA11yRecord(localStorage.getItem(a11yStorageKey("user-a")))?.easyReading).toBe(true);
    // The choice is also mirrored to A's server row.
    expect(h.upserts.some((u) => u.user_id === "user-a" && u.setting_key === "accessibility_preferences")).toBe(true);

    await signInAs("user-b");
    expect(api.isEasyReadingEnabled).toBe(false);
    expect(api.preferences.highContrast).toBe(false);
    expect(document.documentElement.classList.contains("easy-reading")).toBe(false);

    await signInAs("user-a");
    expect(api.isEasyReadingEnabled).toBe(true);
    expect(api.preferences.highContrast).toBe(true);
  });

  it("explicit OFF persists — off stays off across sign-out and back in", async () => {
    mount();
    await signInAs("user-a");
    act(() => api.enableEasyReading());
    act(() => api.disableEasyReading());
    expect(parseA11yRecord(localStorage.getItem(a11yStorageKey("user-a")))?.easyReading).toBe(false);

    await act(async () => {
      h.listener?.("SIGNED_OUT", null);
    });
    expect(api.isEasyReadingEnabled).toBe(false);

    await signInAs("user-a");
    expect(api.isEasyReadingEnabled).toBe(false);
  });

  it("sign-out resets the visible state to defaults immediately", async () => {
    mount();
    await signInAs("user-a");
    act(() => api.updatePreferences({ dyslexiaFont: true }));
    expect(document.documentElement.classList.contains("a11y-dyslexia")).toBe(true);

    await act(async () => {
      h.listener?.("SIGNED_OUT", null);
    });
    expect(api.preferences.dyslexiaFont).toBe(false);
    expect(document.documentElement.classList.contains("a11y-dyslexia")).toBe(false);
  });

  it("every preference applies a real effect; reset-all restores defaults and persists them", async () => {
    mount();
    await signInAs("user-a");
    act(() => api.updatePreferences({ largeText: true, reducedMotion: true, screenReader: true }));
    act(() => api.increaseTextSize());
    const root = document.documentElement;
    expect(root.classList.contains("a11y-large-text")).toBe(true);
    expect(root.classList.contains("a11y-reduced-motion")).toBe(true);
    expect(api.isScreenReaderEnabled).toBe(true);
    expect(api.textSize).toBeCloseTo(1.1);
    expect(root.style.fontSize).toBe("110%");

    act(() => api.resetAllAccessibility());
    expect(api.preferences.largeText).toBe(false);
    expect(api.textSize).toBe(1);
    expect(root.classList.contains("a11y-large-text")).toBe(false);
    const stored = parseA11yRecord(localStorage.getItem(a11yStorageKey("user-a")));
    expect(stored?.preferences.largeText).toBe(false);
    expect(stored?.textSize).toBe(1);
  });

  it("no keyboard shortcut can toggle a mode (Alt+R / Alt+3 removed)", async () => {
    mount();
    await signInAs("user-a");
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "r", altKey: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "3", altKey: true }));
    });
    expect(api.isEasyReadingEnabled).toBe(false);
    expect(api.isScreenReaderEnabled).toBe(false);
  });

  it("a server-stored record hydrates the account on a fresh browser (local empty)", async () => {
    h.serverRow = {
      setting_key: "accessibility_preferences",
      value: {
        preferences: { highContrast: true, largeText: false, reducedMotion: false, screenReader: false, dyslexiaFont: false },
        easyReading: true,
        textSize: 1.2,
      },
    };
    mount();
    await signInAs("user-c");
    await waitFor(() => expect(api.isEasyReadingEnabled).toBe(true));
    expect(api.preferences.highContrast).toBe(true);
    expect(api.textSize).toBeCloseTo(1.2);
  });
});
