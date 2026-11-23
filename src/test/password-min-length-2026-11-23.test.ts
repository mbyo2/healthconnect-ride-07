import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// Server auth config requires password_min_length=10 (actioned 2026-11-20).
// Every client surface that sets a password must enforce the same floor
// locally, otherwise a 6–9 character password passes client validation and
// only fails at GoTrue with weak_password. Regression found 2026-11-23
// (swarm/platform): Auth.tsx signup schemas, AuthForm, PatientRegistration,
// ResetPassword, CreateAdmin and ProviderRegistrationService all used 6 or 8.
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("password minimum length matches server (10)", () => {
  it("Auth.tsx signup schemas require 10 (login schema is exempt)", () => {
    const src = read("src/pages/Auth.tsx");
    expect(src).toContain('password: z.string().min(10, "Password must be at least 10 characters")');
    expect(src.match(/min\(10, "Password must be at least 10 characters"\)/g)?.length).toBe(3);
  });
  it("PatientRegistration requires 10", () => {
    const src = read("src/pages/PatientRegistration.tsx");
    expect(src).toContain('min(10, "Password must be at least 10 characters")');
    expect(src).not.toContain("at least 8 characters");
  });
  it("ResetPassword requires 10", () => {
    const src = read("src/pages/ResetPassword.tsx");
    expect(src).toContain('min(10, { message: "Password must be at least 10 characters" })');
  });
  it("CreateAdmin requires 10", () => {
    const src = read("src/pages/CreateAdmin.tsx");
    expect(src).toContain("form.password.length < 10");
    expect(src).toContain("Password must be at least 10 characters");
  });
  it("AuthForm requires 10", () => {
    const src = read("src/components/auth/AuthForm.tsx");
    expect(src).toContain("password.length < 10");
    expect(src).toContain("Password must be at least 10 characters");
  });
  it("ProviderRegistrationService requires 10", () => {
    const src = read("src/services/ProviderRegistrationService.ts");
    expect(src).toContain("data.password.length < 10");
    expect(src).toContain("Password must be at least 10 characters long");
  });
  it("friendly-error copy says at least 10 characters", () => {
    const src = read("src/utils/friendly-error.ts");
    expect(src).toContain("at least 10 characters");
    expect(src).not.toContain("at least 6 characters");
  });
});
