import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";

// PAYPAL ANATOMY ROLLOUT — WAVE 4 (leftovers), CEO order 2026-11-11:
// the skeleton twins mirror the CURRENT surfaces (new mobile header,
// calm queue board, light appointments group header); auth rides the
// shared segmented Tabs primitive; the last content-surface heavy
// shadows come off (overlays/menus/dialogs keep functional elevation).
// Presentation only.
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

const kit = read("../components/ui/skeleton-kit.tsx");
const auth = read("../pages/Auth.tsx");
const reset = read("../pages/ResetPassword.tsx");
const paySuccess = read("../pages/PaymentSuccess.tsx");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx") || p.endsWith(".ts")) out.push(p);
  }
  return out;
}

describe("rollout wave 4: skeleton twins mirror the current surfaces", () => {
  it("mobile header twin: wordmark hides below sm; currency + language visible at every width", () => {
    expect(kit).toContain('wordmarkClassName="hidden sm:block"');
    expect(kit).not.toContain("min-[420px]:block");
    expect(kit).not.toContain("min-[560px]:block");
    expect(kit).toContain('className="h-9 w-9 rounded-md sm:w-[140px]"');
  });

  it("queue display twin rides the calm board with the sky hero", () => {
    expect(kit).toContain("flex min-h-screen flex-col bg-canvas");
    expect(kit).toContain("border border-[#60CDFF] bg-[#60CDFF]");
    expect(kit).not.toContain("flex min-h-screen flex-col bg-slate-950 p-6 font-sans");
  });

  it("appointments board twin has the light hairline group header", () => {
    expect(kit).toContain("border-b border-border px-5 py-4");
    expect(kit).not.toContain("bg-slate-900 px-5 py-4");
  });
});

describe("rollout wave 4: auth + leftover surfaces", () => {
  it("auth sign-in/register tabs ride the shared segmented primitive", () => {
    expect(auth).toContain('<TabsList className="grid w-full grid-cols-2 mb-6">');
    expect(auth).not.toContain("bg-canvas-bone rounded-xl border border-canvas-silk");
  });

  it("no page or component overrides tab actives with solid blue anymore", () => {
    const files = [
      ...walk(resolve(__dirname, "../pages")),
      ...walk(resolve(__dirname, "../components")),
    ];
    const offenders = files.filter((f) =>
      readFileSync(f, "utf8").includes("data-[state=active]:bg-primary-500"),
    );
    expect(offenders).toEqual([]);
  });

  it("reset password + payment success cards are flat hairline cards", () => {
    expect(reset).not.toContain("shadow-xl");
    expect(reset).not.toContain("border-t-primary");
    expect(paySuccess).not.toContain("shadow-2xl");
  });
});
