/**
 * Regressions from the 2026-10-24 QA waves:
 *  - Directory rendered "Dr. Dr. Wave Test" when a profile's first_name
 *    already contained the honorific — providerDisplayName must strip a
 *    leading title before prepending its own.
 *  - The app ErrorBoundary rendered the raw exception message
 *    ("s is not a function") to users — it must show plain language only.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { providerDisplayName, stripLeadingTitle } from "@/utils/providerDisplay";
import { ErrorBoundary } from "@/components/ErrorBoundary";

describe("providerDisplayName — leading-title stripping", () => {
  it("does not double the honorific when first_name contains 'Dr.'", () => {
    expect(
      providerDisplayName({ first_name: "Dr. Wave", last_name: "Test", role: "doctor" })
    ).toBe("Dr. Wave Test");
  });

  it("strips a spelled-out 'Doctor' title", () => {
    expect(
      providerDisplayName({ first_name: "Doctor", last_name: "Mwanza", role: "doctor" })
    ).toBe("Dr. Mwanza");
  });

  it("strips case-insensitively and also for non-doctoral cadres", () => {
    expect(
      providerDisplayName({ first_name: "dr. jane", last_name: "Banda", role: "nurse" })
    ).toBe("jane Banda");
  });

  it("leaves ordinary names untouched", () => {
    expect(
      providerDisplayName({ first_name: "Wave", last_name: "Test", role: "doctor" })
    ).toBe("Dr. Wave Test");
    expect(
      providerDisplayName({ first_name: "Drew", last_name: "Phiri", role: "doctor" })
    ).toBe("Dr. Drew Phiri");
    expect(stripLeadingTitle("Drew Phiri")).toBe("Drew Phiri");
  });
});

describe("ErrorBoundary — plain language only", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("never shows the raw exception message", () => {
    const Boom = () => {
      throw new Error("s is not a function");
    };
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
    expect(screen.queryByText(/s is not a function/)).not.toBeInTheDocument();
  });
});
