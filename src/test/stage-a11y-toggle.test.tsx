/**
 * Regression (2026-10-25): Settings "Accessibility Easy Reading" toggle
 * always failed with "Failed to update accessibility settings" while the
 * SAME setting worked from the floating Accessibility menu.
 *
 * Root cause: the Settings handler awaited a divergent Supabase upsert into
 * `user_settings.accessibility_mode` before updating the context. The
 * `user_settings` table did not exist live (PGRST205, proven 2026-10-25),
 * so the write threw, the toast showed, and enableEasyReading() never ran.
 *
 * Fix then: BOTH surfaces write through the single context path.
 * Fix now (completeness pass, 2026-10-25): that context path itself was
 * reworked — persistence is a PER-ACCOUNT record (`a11y.v2.<scope>`),
 * never the old browser-global `accessibility_*` keys, which leaked one
 * person's modes to the next user of the same browser and were never
 * cleared on sign-out (the CEO's "it turns itself on" bug). These tests
 * pin the wiring AND the new storage contract; per-account isolation is
 * pinned in stage-accessibility-accounts.test.tsx.
 */
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import "@testing-library/jest-dom/vitest";
import {
  AccessibilityProvider,
  useAccessibility,
  a11yStorageKey,
  parseA11yRecord,
} from "@/context/AccessibilityContext";

const readSrc = (p: string) => readFileSync(resolve(__dirname, "../../", p), "utf8");

let api: ReturnType<typeof useAccessibility>;
const Probe = () => {
  api = useAccessibility();
  return <div data-testid="easy-reading">{String(api.isEasyReadingEnabled)}</div>;
};

describe("A11y toggle · single persistence function", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.style.fontSize = "";
  });

  it("enableEasyReading persists to the per-scope record and applies the class", () => {
    render(
      <AccessibilityProvider>
        <Probe />
      </AccessibilityProvider>
    );
    expect(screen.getByTestId("easy-reading")).toHaveTextContent("false");

    act(() => api.enableEasyReading());

    expect(screen.getByTestId("easy-reading")).toHaveTextContent("true");
    const stored = parseA11yRecord(localStorage.getItem(a11yStorageKey("guest")));
    expect(stored?.easyReading).toBe(true);
    // The leaky global key is never written again.
    expect(localStorage.getItem("accessibility_easy_reading")).toBeNull();
    expect(document.documentElement.classList.contains("easy-reading")).toBe(true);
  });

  it("persisted value is read back on a fresh mount (survives reload)", () => {
    const first = render(
      <AccessibilityProvider>
        <Probe />
      </AccessibilityProvider>
    );
    act(() => api.enableEasyReading());
    first.unmount();

    render(
      <AccessibilityProvider>
        <Probe />
      </AccessibilityProvider>
    );
    expect(screen.getByTestId("easy-reading")).toHaveTextContent("true");
  });

  it("legacy global keys are ignored and deleted — never adopted as a choice", () => {
    localStorage.setItem("accessibility_easy_reading", "true");
    localStorage.setItem("accessibility_high_contrast", "true");
    render(
      <AccessibilityProvider>
        <Probe />
      </AccessibilityProvider>
    );
    expect(screen.getByTestId("easy-reading")).toHaveTextContent("false");
    expect(api.preferences.highContrast).toBe(false);
    expect(localStorage.getItem("accessibility_easy_reading")).toBeNull();
    expect(localStorage.getItem("accessibility_high_contrast")).toBeNull();
  });

  it("disableEasyReading persists the off state too", () => {
    render(
      <AccessibilityProvider>
        <Probe />
      </AccessibilityProvider>
    );
    act(() => api.enableEasyReading());
    expect(screen.getByTestId("easy-reading")).toHaveTextContent("true");

    act(() => api.disableEasyReading());

    expect(screen.getByTestId("easy-reading")).toHaveTextContent("false");
    const stored = parseA11yRecord(localStorage.getItem(a11yStorageKey("guest")));
    expect(stored?.easyReading).toBe(false);
    expect(document.documentElement.classList.contains("easy-reading")).toBe(false);
  });

  it("menu Vision & Motion writes go through the same context persistence", () => {
    render(
      <AccessibilityProvider>
        <Probe />
      </AccessibilityProvider>
    );
    act(() => api.updatePreferences({ dyslexiaFont: true }));
    const stored = parseA11yRecord(localStorage.getItem(a11yStorageKey("guest")));
    expect(stored?.preferences.dyslexiaFont).toBe(true);
    expect(localStorage.getItem("accessibility_dyslexiafont")).toBeNull();
  });
});

describe("A11y toggle · wiring — no divergent Settings write path", () => {
  it("Settings toggle routes through enable/disableEasyReading only", () => {
    const settings = readSrc("src/pages/Settings.tsx");
    // The divergent write that hit the missing table is gone (the string
    // `accessibility_mode` may survive only inside the explanatory comment
    // above the handler — never as an actual upsert payload).
    expect(settings).not.toContain("{ accessibility_mode");
    expect(settings).not.toContain("accessibility_mode: checked");
    // The toggle handler is the context persistence function, same as the menu.
    expect(settings).toContain("onCheckedChange={handleAccessibilityToggle}");
    const handler = settings.slice(settings.indexOf("const handleAccessibilityToggle"));
    const handlerBody = handler.slice(0, handler.indexOf("};") + 2);
    expect(handlerBody).toContain("enableEasyReading()");
    expect(handlerBody).toContain("disableEasyReading()");
    expect(handlerBody).not.toContain("upsertUserSettings");
    expect(handlerBody).not.toContain("supabase");
  });

  it("floating Accessibility menu uses the same persistence functions", () => {
    const menu = readSrc("src/components/AccessibilityMenu.tsx");
    expect(menu).toContain("enableEasyReading()");
    expect(menu).toContain("disableEasyReading()");
    expect(menu).not.toContain("user_settings");
  });
});
