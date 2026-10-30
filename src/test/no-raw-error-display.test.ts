import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Raw-error display pins (CEO standing rule, sweep 2026-10-30): a user
 * must NEVER see raw browser/system/exception/PostgREST text. Every
 * user-facing error channel (sonner toasts, shadcn toasts, inline
 * set*Error state) must route the error through friendlyErrorMessage —
 * raw text may only go to the console. This suite scans src with the
 * same call-shape detection used in the sweep and fails if a new raw
 * `.message` reaches a display call.
 *
 * Allowlisted exceptions are DOMAIN messages, not exceptions: device
 * alert text, the dose engine's crafted clinical warnings, and the
 * payment-workflow module's own crafted result strings. Each is pinned
 * by file + exact snippet so the allowance cannot quietly grow.
 */

const SRC = resolve(__dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "test") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

/** Extract the argument text of every call matching `pattern` (paren-matched). */
function callArgs(source: string, pattern: RegExp): string[] {
  const args: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(pattern.source, "g");
  while ((m = re.exec(source)) !== null) {
    let depth = 1;
    let i = re.lastIndex;
    const start = i;
    while (i < source.length && depth > 0) {
      const c = source[i];
      if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") depth--;
      i++;
    }
    args.push(source.slice(start, i - 1));
  }
  return args;
}

const ALLOWLIST: Array<{ file: string; snippet: string }> = [
  // DeviceAlert.message — authored device-alert text from the device_alerts
  // table (domain data), not an exception.
  { file: "hooks/useIoT.ts", snippet: "`Alert: ${alert.message}`" },
  { file: "hooks/useIoT.ts", snippet: "`Device Alert: ${alert.message}`" },
  // Dose engine result messages — crafted clinical warnings.
  { file: "pages/Prescriptions.tsx", snippet: "a.result.message" },
  // payment-workflows' own crafted PaymentTransitionResult strings.
  { file: "utils/payment-workflows.ts", snippet: "result.message" },
];

function violations(): string[] {
  const found: string[] = [];
  for (const file of walk(SRC)) {
    const rel = file.slice(SRC.length + 1);
    if (rel === "utils/friendly-error.ts") continue;
    const source = readFileSync(file, "utf8");
    const channels: Array<[string, RegExp]> = [
      ["toast", /toast\.(?:error|warning)\s*\(/],
      ["setError", /\bset\w*Error\w*\s*\(/],
      ["shadcn-toast", /(?<!\.)\btoast\s*\(\s*\{/],
    ];
    for (const [label, pattern] of channels) {
      for (const arg of callArgs(source, pattern)) {
        if (!arg.includes(".message")) continue;
        if (arg.includes("friendlyErrorMessage")) continue;
        const flat = arg.replace(/\s+/g, " ");
        const allowed = ALLOWLIST.some(
          (a) => rel === a.file && flat.includes(a.snippet.replace(/\s+/g, " ")),
        );
        if (!allowed) {
          found.push(`${rel} [${label}]: ${flat.slice(0, 120)}`);
        }
      }
    }
  }
  return found;
}

describe("no raw error text reaches a user-facing display call", () => {
  it("finds zero un-routed .message flows into toasts / error state", () => {
    expect(violations()).toEqual([]);
  });
});

/**
 * Per-surface regression pins for the high-traffic flows: these files
 * previously rendered raw error text; each must route through
 * friendlyErrorMessage and must not contain the old raw ternary shape.
 */
const HIGH_TRAFFIC: Array<{ file: string; label: string }> = [
  { file: "components/booking/BookingModal.tsx", label: "booking" },
  { file: "components/marketplace/PharmacyPayment.tsx", label: "pharmacy payment" },
  { file: "components/video/VideoConsultationBooking.tsx", label: "video booking" },
  { file: "hooks/useLencoPayment.ts", label: "Lenco payment initiation" },
  { file: "hooks/useWalletPayment.ts", label: "wallet payment" },
  { file: "components/billing/DoctorFractions.tsx", label: "billing" },
  { file: "components/pharmacy/PrescriptionFulfillment.tsx", label: "dispensary" },
  { file: "pages/Auth.tsx", label: "sign-in" },
];

describe("high-traffic surfaces route errors through friendlyErrorMessage", () => {
  for (const { file, label } of HIGH_TRAFFIC) {
    it(`${label} (${file})`, () => {
      const source = readFileSync(join(SRC, file), "utf8");
      expect(source).toContain("friendlyErrorMessage(");
      expect(source).not.toMatch(
        /instanceof Error && \w+\.message \? \w+\.message/,
      );
      expect(source).not.toMatch(/toast\.error\(e\?\.message/);
      expect(source).not.toMatch(/toast\.error\(error\.message/);
      expect(source).not.toMatch(/toast\.error\(err\?\.message/);
    });
  }
});
