import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Contrast regression guard (CEO report, 2026-11-24): "Some tabs and pages
 * are having bad color contrast like Revenue Cycle and insurance."
 *
 * Root causes pinned here:
 *  1. AdvancedRevenueCycle (Revenue Cycle & Insurance tab) and
 *     MultiCenterAuditSuite (Governance tab) were written in a dark-only
 *     slate palette (text-white / text-slate-300/400 on bg-card) with zero
 *     theme tokens — in light mode the page heading measured 1.00:1 and
 *     body text 1.49:1 against the white card. Both components must stay
 *     on theme tokens / mode-paired accent shades: no slate-* classes and
 *     no unpaired light accent text shades (text-*-300/400 without dark:).
 *  2. White text on bright 400/500-shade status fills (bg-success-500,
 *     bg-warning-500, bg-error-500, …) measured 1.7–4.0:1 app-wide —
 *     below WCAG AA 4.5:1 for the text-xs bold pills that use them.
 *     Wherever a class string pairs text-white with a status fill, the
 *     fill must be an AA shade (600/700 family, all ≥4.8:1 on white text).
 */

const SRC = join(__dirname, "..");

function readSrc(rel: string): string {
  return readFileSync(join(SRC, rel), "utf8");
}

function listSources(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) listSources(p, acc);
    else if (/\.tsx?$/.test(entry)) acc.push(p);
  }
  return acc;
}

// Fills that fail WCAG AA with white text (measured: success-500 2.28:1,
// warning-500 2.15:1, error-500 4.03:1, purple-500 3.96:1, amber-500/600
// 2.15/3.19:1, success-600 3.30:1, warning-600 3.19:1, *-400 fills ≤3.0:1).
const FAILING_FILLS = [
  "success-500", "success-600", "warning-500", "warning-600",
  "error-500", "purple-500", "amber-500", "amber-600",
  "red-500", "blue-500", "emerald-500", "indigo-500", "green-500",
  "primary-400", "graphite-400", "slate-400", "amber-400",
];

describe("contrast: dark-only slate components stay converted", () => {
  const files = [
    "components/rcm/AdvancedRevenueCycle.tsx",
    "components/governance/MultiCenterAuditSuite.tsx",
  ];
  for (const f of files) {
    it(`${f} uses no slate-* palette classes`, () => {
      const src = readSrc(f);
      const hits = src.match(/[a-z-]*slate-[0-9]+[a-z/0-9-]*/g) || [];
      expect(hits, `slate classes remain: ${hits.join(", ")}`).toHaveLength(0);
    });
    it(`${f} has no unpaired light accent text (text-*-300/400 without dark:)`, () => {
      const src = readSrc(f);
      const unpaired = (src.match(/text-(?:blue|emerald|red|amber|green|purple|indigo|orange|gray)-[34]00/g) || [])
        .filter((cls) => !src.includes(`dark:${cls}`));
      expect(unpaired, `unpaired accent text: ${unpaired.join(", ")}`).toHaveLength(0);
    });
  }
});

describe("contrast: white text never sits on a sub-AA status fill", () => {
  it("no class string in src pairs text-white with a failing fill", () => {
    const offenders: string[] = [];
    for (const file of listSources(SRC)) {
      if (file.includes(`${join("src", "test")}`) || file.includes("/test/")) continue;
      const src = readFileSync(file, "utf8");
      const literals = src.match(/(["'`])((?:(?!\1).)*)\1/g) || [];
      for (const lit of literals) {
        if (!lit.includes("text-white")) continue;
        for (const fill of FAILING_FILLS) {
          const re = new RegExp(`(?:hover:|focus:|active:)?bg-${fill}(?![\\w/-])`);
          if (re.test(lit)) offenders.push(`${file.replace(SRC, "src")}: bg-${fill}`);
        }
      }
    }
    expect(offenders, `sub-AA white-on-fill pairs:\n${offenders.join("\n")}`).toHaveLength(0);
  });

  it("shared badge primitives use AA fills", () => {
    const badge = readSrc("components/ui/badge.tsx");
    expect(badge).toContain("bg-success-700");
    expect(badge).toContain("bg-warning-700");
    const status = readSrc("components/ui-custom/StatusBadge.tsx");
    expect(status).toContain("bg-success-700");
    expect(status).toContain("bg-warning-700");
    expect(status).toContain("bg-error-700");
    // Default variant: muted-foreground token flips light in dark mode, so
    // white text on it failed in dark — it must use the flipping fg/bg pair.
    expect(status).toContain("bg-foreground text-background");
  });
});
