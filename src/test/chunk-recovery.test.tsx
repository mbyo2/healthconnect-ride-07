/**
 * Regression for the 2026-10-29 live crash on /pharmacy-inventory:
 * a tab open across the day's deploys held a stale module map; navigating
 * to a route it had never visited requested the OLD build's chunk, the
 * (since-deleted) old deployment 404'd it, the dynamic import rejected,
 * and the error boundary was a dead end — its "Try Again" re-ran the
 * same doomed import. The page component itself renders the live data
 * fine (pinned in pharmacy-inventory-render.test.tsx); the defect was
 * the missing recovery path for chunk-load failures.
 *
 * The cure pinned here: chunk-load failures trigger ONE guarded full
 * reload onto the current build (never a loop), from both the router's
 * lazy wrapper (via reloadOnceForChunkError) and the ErrorBoundary.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { isChunkLoadError, reloadOnceForChunkError } from "@/lib/chunkRecovery";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const CHROME_MSG =
  "Failed to fetch dynamically imported module: https://www.doc0clock.online/assets/MedicationInventory-oldhash.js";
const FIREFOX_MSG = "error loading dynamically imported module";
const SAFARI_MSG = "Importing a module script failed.";

describe("isChunkLoadError", () => {
  it("matches Chrome/Edge dynamic-import failures", () => {
    expect(isChunkLoadError(new TypeError(CHROME_MSG))).toBe(true);
  });

  it("matches Firefox and Safari phrasings", () => {
    expect(isChunkLoadError(new Error(FIREFOX_MSG))).toBe(true);
    expect(isChunkLoadError(new Error(SAFARI_MSG))).toBe(true);
  });

  it("matches ChunkLoadError by name", () => {
    const err = new Error("Loading chunk 42 failed");
    err.name = "ChunkLoadError";
    expect(isChunkLoadError(err)).toBe(true);
  });

  it("does not match ordinary render/runtime errors", () => {
    expect(isChunkLoadError(new Error("s is not a function"))).toBe(false);
    expect(isChunkLoadError(new RangeError("Invalid time value"))).toBe(false);
    expect(isChunkLoadError(new TypeError("Failed to fetch"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
    expect(isChunkLoadError("Failed to fetch dynamically imported module")).toBe(false);
  });
});

describe("reloadOnceForChunkError", () => {
  let reloadSpy: ReturnType<typeof vi.fn>;
  let nowSpy: ReturnType<typeof vi.spyOn>;
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, reload: reloadSpy, assign: vi.fn() },
      configurable: true,
      writable: true,
    });
    nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
    nowSpy.mockRestore();
    sessionStorage.clear();
  });

  it("reloads on the first chunk-load failure", () => {
    expect(reloadOnceForChunkError(new TypeError(CHROME_MSG))).toBe(true);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("does not reload again inside the guard window (no reload loop)", () => {
    expect(reloadOnceForChunkError(new TypeError(CHROME_MSG))).toBe(true);
    nowSpy.mockReturnValue(1_000_000 + 5_000);
    expect(reloadOnceForChunkError(new TypeError(CHROME_MSG))).toBe(false);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("allows a fresh reload after the guard window passes", () => {
    expect(reloadOnceForChunkError(new TypeError(CHROME_MSG))).toBe(true);
    nowSpy.mockReturnValue(1_000_000 + 31_000);
    expect(reloadOnceForChunkError(new TypeError(CHROME_MSG))).toBe(true);
    expect(reloadSpy).toHaveBeenCalledTimes(2);
  });

  it("never reloads for non-chunk errors", () => {
    expect(reloadOnceForChunkError(new Error("boom"))).toBe(false);
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("does not auto-reload when sessionStorage is unavailable", () => {
    const getSpy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("storage disabled");
      });
    try {
      expect(reloadOnceForChunkError(new TypeError(CHROME_MSG))).toBe(false);
      expect(reloadSpy).not.toHaveBeenCalled();
    } finally {
      getSpy.mockRestore();
    }
  });
});

describe("ErrorBoundary — chunk failure recovery", () => {
  let reloadSpy: ReturnType<typeof vi.fn>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, reload: reloadSpy, assign: vi.fn() },
      configurable: true,
      writable: true,
    });
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
    consoleSpy.mockRestore();
    sessionStorage.clear();
  });

  it("auto-reloads once when a child throws a chunk-load error", () => {
    const Boom = () => {
      throw new TypeError(CHROME_MSG);
    };
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("shows the friendly boundary (no reload) for ordinary errors", () => {
    const Boom = () => {
      throw new Error("kaboom");
    };
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText(/kaboom/)).not.toBeInTheDocument();
  });

  it("Try Again performs a hard reload when the error was a chunk failure", () => {
    // Simulate the state after the automatic reload already happened once
    // (guard tripped): the boundary is visible, and its retry must reload
    // rather than reset state into the same failed import.
    sessionStorage.setItem("dococlock.chunk_reload_at", String(Date.now()));
    const Boom = () => {
      throw new TypeError(CHROME_MSG);
    };
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(reloadSpy).not.toHaveBeenCalled(); // guard suppressed the auto reload
    fireEvent.click(screen.getByText("Try Again"));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
