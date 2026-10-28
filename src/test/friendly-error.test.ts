import { describe, it, expect } from "vitest";
import { friendlyErrorMessage } from "@/utils/friendly-error";

/**
 * friendlyErrorMessage (W1 sweep, 2026-10-28): raw Supabase/PostgREST
 * system messages must never reach a toast verbatim — known auth errors
 * get crafted copy, technical messages collapse to the caller's crafted
 * fallback, and short plain-language messages pass through.
 */
describe("friendlyErrorMessage", () => {
  it("maps wrong-password to crafted copy (no raw 'Invalid login credentials')", () => {
    const msg = friendlyErrorMessage(new Error("Invalid login credentials"));
    expect(msg).toContain("don't match");
    expect(msg).not.toContain("Invalid login credentials");
  });

  it("maps unconfirmed email to check-your-inbox copy", () => {
    expect(friendlyErrorMessage({ message: "Email not confirmed" })).toContain(
      "confirm your email",
    );
  });

  it("maps duplicate signup to sign-in copy", () => {
    expect(
      friendlyErrorMessage(new Error("User already registered")),
    ).toContain("already exists");
  });

  it("maps network failures to connection copy", () => {
    expect(friendlyErrorMessage(new TypeError("Failed to fetch"))).toContain(
      "couldn't reach the server",
    );
  });

  it("collapses row-level-security system text to the fallback", () => {
    const raw =
      'new row violates row-level security policy for table "appointments"';
    expect(friendlyErrorMessage(new Error(raw), "Could not save.")).toBe(
      "Could not save.",
    );
  });

  it("collapses PostgREST error JSON to the fallback", () => {
    const raw =
      '{"code":"PGRST301","details":null,"hint":null,"message":"JWT expired"}';
    expect(friendlyErrorMessage(raw, "Please try again.")).toBe(
      "Please try again.",
    );
  });

  it("passes through short plain-language messages crafted upstream", () => {
    const crafted = "A licence number is required for Dentists.";
    expect(friendlyErrorMessage(new Error(crafted))).toBe(crafted);
  });

  it("returns the fallback for empty/unknown error shapes", () => {
    expect(friendlyErrorMessage(null, "Nope.")).toBe("Nope.");
    expect(friendlyErrorMessage(undefined, "Nope.")).toBe("Nope.");
    expect(friendlyErrorMessage({}, "Nope.")).toBe("Nope.");
  });

  it("maps rate limiting to wait-and-retry copy", () => {
    expect(
      friendlyErrorMessage(new Error("Request rate limit reached")),
    ).toContain("wait a moment");
  });
});
