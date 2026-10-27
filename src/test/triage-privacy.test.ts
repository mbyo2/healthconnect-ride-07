import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Privacy pins for the Meta triage path (CEO rule, 2026-10-27):
 *  1. The intake type has no identifier fields — nowhere to put personal data.
 *  2. The edge function persists NOTHING (no table writes of any kind),
 *     sends NO analytics events, and never logs request/response bodies.
 *  3. The caller's Supabase credentials are used only to authenticate the
 *     caller to OUR function and are never forwarded to Meta.
 * These read the shipped sources so a future edit that breaks the contract
 * fails the suite instead of silently shipping.
 */

const fnSource = readFileSync(
  resolve(__dirname, "../../supabase/functions/meta-triage/index.ts"),
  "utf8",
);
const typesSource = readFileSync(resolve(__dirname, "../lib/triage/types.ts"), "utf8");
const pageSource = readFileSync(resolve(__dirname, "../pages/TriageAssistant.tsx"), "utf8");

describe("meta-triage edge function — privacy contract in source", () => {
  it("performs no database writes or reads of patient data", () => {
    expect(fnSource).not.toMatch(/\.from\(/);
    expect(fnSource).not.toMatch(/\.insert\(|\.upsert\(|\.update\(|\.delete\(/);
    expect(fnSource).not.toContain("patient_triage_sessions");
    expect(fnSource).not.toContain("ai_diagnosis_history");
  });

  it("sends no analytics events", () => {
    expect(fnSource).not.toContain("track-analytics");
    expect(fnSource.toLowerCase()).not.toContain("posthog");
    expect(fnSource.toLowerCase()).not.toContain("mixpanel");
  });

  it("never logs request or response bodies", () => {
    // Any console.* call may only reference coarse counters/status, never
    // the parsed body, the raw request text, or the model output.
    const logLines = fnSource.split("\n").filter((l) => /console\.(log|error|warn|info)/.test(l));
    for (const line of logLines) {
      expect(line).not.toMatch(/body|payload|chiefComplaint|symptoms|content|messages/);
    }
  });

  it("builds the Meta request headers fresh — caller credentials are never forwarded", () => {
    expect(fnSource).not.toMatch(/headers:\s*req\.headers/);
    expect(fnSource).not.toMatch(/req\.headers\.get\(["']authorization["']\)[\s\S]{0,200}fetch\(/);
    expect(fnSource).toContain("META_API_KEY");
  });

  it("reads the Meta key from secrets, with no other provider fallback", () => {
    expect(fnSource).toContain('Deno.env.get("META_API_KEY")');
    expect(fnSource).not.toContain("OPENROUTER");
    expect(fnSource).not.toContain("LOVABLE");
    expect(fnSource).not.toContain("HF_TOKEN");
  });
});

describe("triage intake + page — privacy contract in source", () => {
  it("the intake type declares no identifier fields", () => {
    const intakeBlock = typesSource.slice(typesSource.indexOf("interface TriageIntake"));
    for (const field of ["name", "email", "phone", "nrc", "address", "userId", "user_id", "dob", "dateOfBirth", "location"]) {
      expect(intakeBlock).not.toMatch(new RegExp(`\\b${field}\\b`));
    }
  });

  it("the page writes nothing to any database table", () => {
    expect(pageSource).not.toMatch(/\.from\([^)]*\)\s*\.(insert|upsert|update)/);
    expect(pageSource).not.toContain("patient_triage_sessions");
    expect(pageSource).not.toContain("ai_diagnosis_history");
  });

  it("the page does not stash triage content in web storage either", () => {
    expect(pageSource).not.toMatch(/localStorage\.setItem|sessionStorage\.setItem/);
  });
});
