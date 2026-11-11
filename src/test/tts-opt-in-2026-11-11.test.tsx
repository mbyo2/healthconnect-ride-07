/**
 * CEO bug (2026-11-11): "Search in doc0clock.online automatically turns on
 * the voice that reads out aloud even though you never turned it on."
 * Same defect family as the 2026-10-25 report ("accessibility sometimes
 * turns itself on even though he did not turn it on").
 *
 * Root cause: the 2026-10-25 rework gated the AccessibilityContext's
 * announcements behind the screen-reader flag (default OFF, per-account),
 * but the voice-command subsystem kept a PRIVATE, ungated speak() helper
 * (src/hooks/voice-command-speech.tsx) that talks straight to
 * window.speechSynthesis and never checks the flag. SearchResults called
 * that helper from a useEffect on every results load — so every search
 * spoke aloud with the setting OFF and no user gesture. The flag never
 * flipped; the speech simply bypassed it. The same ungated helper also
 * made every voice-command announcement speak twice (once via the gated
 * screenReaderAnnounce, once raw).
 *
 * Contract pinned here:
 *  1. window.speechSynthesis.speak / SpeechSynthesisUtterance exist ONLY
 *     in AccessibilityContext — one choke point for all audible speech.
 *  2. Ambient announcements (screenReaderAnnounce) are SPOKEN only when
 *     the user has explicitly turned screen reader mode ON.
 *  3. Turning screen reader mode OFF cancels any current speech at once.
 *  4. A stored screenReader:true predating this fix is reset to OFF once
 *     per account scope (one-time migration); a choice made after the
 *     reset persists exactly — the reset never fires twice.
 *  5. Search never speaks on load or on results rendering. Its "Read
 *     Results" button is an explicit one-shot through the context.
 */
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
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
  TTS_DEFAULT_OFF_RESET_PREFIX,
} from "@/context/AccessibilityContext";

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

let api: ReturnType<typeof useAccessibility>;
const Probe = () => {
  api = useAccessibility();
  return <div data-testid="sr">{String(api.isScreenReaderEnabled)}</div>;
};

const mount = () =>
  render(
    <AccessibilityProvider>
      <Probe />
    </AccessibilityProvider>
  );

const seedRecord = (scope: string, screenReader: boolean) => {
  localStorage.setItem(
    a11yStorageKey(scope),
    JSON.stringify({
      preferences: {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        screenReader,
        dyslexiaFont: false,
      },
      easyReading: false,
      textSize: 1,
    })
  );
};

beforeEach(() => {
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
  document.documentElement.className = "";
});

describe("TTS choke point — source pins", () => {
  it("speechSynthesis.speak and SpeechSynthesisUtterance exist ONLY in AccessibilityContext", () => {
    const files = readdirSync(SRC_ROOT, { recursive: true })
      .map(String)
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => !f.includes("test") && !f.includes("integrations/supabase/types"));
    const offenders: string[] = [];
    for (const rel of files) {
      const content = readFileSync(join(SRC_ROOT, rel), "utf8");
      if (content.includes("speechSynthesis.speak") || content.includes("SpeechSynthesisUtterance")) {
        offenders.push(rel.replace(/\\/g, "/"));
      }
    }
    expect(offenders).toEqual(["context/AccessibilityContext.tsx"]);
  });

  it("SearchResults never speaks on results load — no voice-command hook, no auto-announce", () => {
    const src = readSrc("src/components/SearchResults.tsx");
    expect(src).not.toContain("useVoiceCommands");
    expect(src).not.toContain("speechSynthesis");
    // The auto-announce template that spoke every result count is gone.
    expect(src).not.toContain("healthcare providers ${");
    expect(src).not.toMatch(/useEffect\([\s\S]{0,300}speak/);
    // The explicit Read Results one-shot goes through the context.
    expect(src).toContain("speakContent");
    expect(src).toContain("onClick={handleReadResults}");
  });

  it("voice-command speech paths route through the context, not a private speak()", () => {
    const hook = readSrc("src/hooks/use-voice-commands.tsx");
    expect(hook).not.toContain("voice-command-speech");
    const speechModule = readSrc("src/hooks/voice-command-speech.tsx");
    expect(speechModule).not.toContain("speechSynthesis");
    expect(speechModule).not.toContain("SpeechSynthesisUtterance");
    const executor = readSrc("src/hooks/voice-command-executor.tsx");
    // The executor may still import readPageContent (text extraction),
    // but never a speak function — speech arrives via its props.
    expect(executor).not.toMatch(/import\s*\{[^}]*\bspeak\b[^}]*\}\s*from '\.\/voice-command-speech'/);
    expect(executor).toContain("speak: (message: string) => void");
  });
});

describe("TTS opt-in behaviour", () => {
  it("announcements are NOT spoken while screen reader mode is OFF (the default)", () => {
    mount();
    expect(screen.getByTestId("sr")).toHaveTextContent("false");
    act(() => api.screenReaderAnnounce("Found 5 healthcare providers"));
    expect(speakSpy).not.toHaveBeenCalled();
  });

  it("announcements ARE spoken after the user explicitly turns screen reader mode ON", () => {
    mount();
    act(() => api.setScreenReaderEnabled(true));
    act(() => api.screenReaderAnnounce("Welcome"));
    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect((speakSpy.mock.calls[0][0] as FakeUtterance).text).toBe("Welcome");
  });

  it("explicit one-shot speakContent works (Test Voice / Read Results buttons)", () => {
    mount();
    act(() => api.speakContent("Reading your results"));
    expect(speakSpy).toHaveBeenCalledTimes(1);
  });

  it("turning screen reader mode OFF cancels current speech immediately", () => {
    mount();
    act(() => api.setScreenReaderEnabled(true));
    act(() => api.speakContent("Reading a long page aloud"));
    expect(speakSpy).toHaveBeenCalledTimes(1);
    const cancelsBefore = cancelSpy.mock.calls.length;
    act(() => api.setScreenReaderEnabled(false));
    expect(cancelSpy.mock.calls.length).toBeGreaterThan(cancelsBefore);
  });
});

describe("One-time reset of a stale stored ON", () => {
  it("a stored screenReader:true from before the fix is reset to OFF on first load", () => {
    seedRecord("guest", true);
    mount();
    expect(screen.getByTestId("sr")).toHaveTextContent("false");
    const stored = parseA11yRecord(localStorage.getItem(a11yStorageKey("guest")));
    expect(stored?.preferences.screenReader).toBe(false);
    expect(localStorage.getItem(`${TTS_DEFAULT_OFF_RESET_PREFIX}guest`)).toBe("1");
  });

  it("other stored preferences survive the reset untouched", () => {
    localStorage.setItem(
      a11yStorageKey("guest"),
      JSON.stringify({
        preferences: {
          highContrast: true,
          largeText: false,
          reducedMotion: false,
          screenReader: true,
          dyslexiaFont: false,
        },
        easyReading: true,
        textSize: 1.2,
      })
    );
    mount();
    expect(api.preferences.screenReader).toBe(false);
    expect(api.preferences.highContrast).toBe(true);
    expect(api.isEasyReadingEnabled).toBe(true);
    expect(api.textSize).toBe(1.2);
  });

  it("a choice made AFTER the reset persists exactly across reloads", () => {
    seedRecord("guest", true);
    const first = mount();
    expect(screen.getByTestId("sr")).toHaveTextContent("false");
    act(() => api.setScreenReaderEnabled(true));
    expect(screen.getByTestId("sr")).toHaveTextContent("true");
    first.unmount();

    mount();
    expect(screen.getByTestId("sr")).toHaveTextContent("true");
  });

  it("with the reset marker already present, a stored ON is respected as a real choice", () => {
    seedRecord("guest", true);
    localStorage.setItem(`${TTS_DEFAULT_OFF_RESET_PREFIX}guest`, "1");
    mount();
    expect(screen.getByTestId("sr")).toHaveTextContent("true");
  });
});
