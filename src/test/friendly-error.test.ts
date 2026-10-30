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

  it("maps row-level-security system text to permission copy (never raw)", () => {
    const raw =
      'new row violates row-level security policy for table "appointments"';
    const msg = friendlyErrorMessage(new Error(raw), "Could not save.");
    expect(msg).toContain("don't have permission");
    expect(msg).not.toContain("row-level security");
  });

  it("maps duplicate-key violations to already-saved copy", () => {
    const raw =
      'duplicate key value violates unique constraint "patients_phone_key"';
    const msg = friendlyErrorMessage(new Error(raw), "Could not save.");
    expect(msg).toContain("already exists");
    expect(msg).not.toContain("duplicate key");
  });

  it("does NOT hijack crafted 'already exists' copy with sign-in wording", () => {
    const crafted = "A patient with this phone number already exists.";
    expect(friendlyErrorMessage(new Error(crafted))).toBe(crafted);
  });

  it("maps edge-function non-2xx failures to server copy", () => {
    const msg = friendlyErrorMessage(
      new Error("Edge Function returned a non-2xx status code"),
      "Fallback.",
    );
    expect(msg).toContain("couldn't be completed on the server");
  });

  it("maps timeouts to took-too-long copy", () => {
    expect(
      friendlyErrorMessage(new Error("The operation timed out")),
    ).toContain("took too long");
  });

  it("maps unsupported file types to choose-a-different-file copy", () => {
    const msg = friendlyErrorMessage(
      new Error('mime type "application/x-msdownload" is not supported'),
      "Fallback.",
    );
    expect(msg).toContain("file type isn't supported");
  });

  it("collapses schema-cache PostgREST text to the fallback", () => {
    const raw = "Could not find the table 'public.widgets' in the schema cache";
    expect(friendlyErrorMessage(new Error(raw), "Could not load.")).toBe(
      "Could not load.",
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
