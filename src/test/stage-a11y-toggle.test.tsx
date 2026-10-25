/**
 * Regression (2026-10-25): Settings "Accessibility Easy Reading" toggle
 * always failed with "Failed to update accessibility settings" while the
 * SAME setting worked from the floating Accessibility menu.
 *
 * Root cause: the Settings handler awaited a divergent Supabase upsert into
 * `user_settings.accessibility_mode` before updating the context. The
 * `user_settings` table does not exist live — PostgREST answers PGRST205
 * ("Could not find the table 'public.user_settings' in the schema cache",
 * proven at API level as a QA patient) — so the write threw, the toast
 * showed, and enableEasyReading() never ran.
 *
 * Fix: BOTH surfaces write through the single persistence function —
 * AccessibilityContext enable/disableEasyReading (localStorage
 * `accessibility_easy_reading`). These tests pin that behaviour and wiring.
 */
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import "@testing-library/jest-dom/vitest";
import { AccessibilityProvider, useAccessibility } from "@/context/AccessibilityContext";

const readSrc = (p: string) => readFileSync(resolve(__dirname, "../../", p), "utf8");

let api: ReturnType<typeof useAccessibility>;
const Probe = () => {
  api = useAccessibility();
  return <div data-testid="easy-reading">{String(api.isEasyReadingEnabled)}</div>;
};

describe("A11y toggle · single persistence function", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("easy-reading");
  });

  it("enableEasyReading persists to localStorage and applies the class", () => {
    render(
      <AccessibilityProvider>
        <Probe />
      </AccessibilityProvider>
    );
    expect(screen.getByTestId("easy-reading")).toHaveTextContent("false");

    act(() => api.enableEasyReading());

    expect(screen.getByTestId("easy-reading")).toHaveTextContent("true");
    expect(localStorage.getItem("accessibility_easy_reading")).toBe("true");
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

  it("disableEasyReading persists the off state too", () => {
    localStorage.setItem("accessibility_easy_reading", "true");
    render(
      <AccessibilityProvider>
        <Probe />
      </AccessibilityProvider>
    );
    expect(screen.getByTestId("easy-reading")).toHaveTextContent("true");

    act(() => api.disableEasyReading());

    expect(screen.getByTestId("easy-reading")).toHaveTextContent("false");
    expect(localStorage.getItem("accessibility_easy_reading")).toBe("false");
    expect(document.documentElement.classList.contains("easy-reading")).toBe(false);
  });

  it("menu Vision & Motion writes go through the same context persistence", () => {
    render(
      <AccessibilityProvider>
        <Probe />
      </AccessibilityProvider>
    );
    act(() => api.updatePreferences({ dyslexiaFont: true }));
    expect(localStorage.getItem("accessibility_dyslexiafont")).toBe("true");
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
