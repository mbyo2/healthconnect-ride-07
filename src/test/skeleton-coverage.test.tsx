import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  SkeletonArticlePage,
  SkeletonAuthCard,
  SkeletonCallScreen,
  SkeletonFormPage,
  SkeletonKioskMenu,
  SkeletonListPage,
  SkeletonMarketplaceGrid,
  SkeletonQueueDisplay,
  SkeletonSplitShell,
  SkeletonTablePage,
} from "@/components/ui/skeleton-kit";
import {
  REDIRECT_ONLY_ROUTES,
  ROUTE_SKELETON_KINDS,
  resolveRouteSkeleton,
} from "@/lib/routeSkeleton";

/**
 * Skeleton coverage + contrast pins (CEO complaint 2026-10-30): the
 * route-level loader showed ONE generic dashboard frame for every
 * page ("missing elements"), and the shimmer tone sat at ~1.1:1
 * against card surfaces — effectively invisible in BOTH themes
 * ("white section with white words/buttons"). These tests fail if:
 *  - any App.tsx route loses its route-matched twin,
 *  - the --skeleton tone drifts back toward the card/background tone,
 *  - the eradicated white-on-white utility class creeps back anywhere,
 *  - bare bg-muted pulse slabs return as loading placeholders.
 */

const appSource = readFileSync(resolve(__dirname, "../App.tsx"), "utf8");
const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
const kit = readFileSync(
  resolve(__dirname, "../components/ui/skeleton-kit.tsx"),
  "utf8"
);

function appRoutePaths(): string[] {
  const paths = new Set<string>();
  for (const m of appSource.matchAll(/<Route\s+path="([^"]+)"/g)) {
    paths.add(m[1]);
  }
  return [...paths];
}

/** "/provider/:id" -> "/provider/x"; "/ambient-scribe/:id?" -> both forms. */
function concreteSamples(pattern: string): string[] {
  const filled = pattern.replace(/:[A-Za-z]+\??/g, "x");
  const samples = [filled];
  if (pattern.includes("?")) {
    samples.push(pattern.replace(/\/:[A-Za-z]+\?$/, ""));
  }
  return samples;
}

describe("route skeleton coverage — every App.tsx route has a twin", () => {
  it("finds the route table", () => {
    expect(appRoutePaths().length).toBeGreaterThan(100);
  });

  it("maps every non-redirect route to a skeleton kind", () => {
    const missing = appRoutePaths().filter(
      (p) =>
        !(REDIRECT_ONLY_ROUTES as readonly string[]).includes(p) &&
        !(p in ROUTE_SKELETON_KINDS)
    );
    expect(missing).toEqual([]);
  });

  it("resolves every route pattern (incl. dynamic segments) to a twin", () => {
    const unresolved: string[] = [];
    for (const pattern of appRoutePaths()) {
      if ((REDIRECT_ONLY_ROUTES as readonly string[]).includes(pattern)) {
        continue;
      }
      for (const sample of concreteSamples(pattern)) {
        if (!resolveRouteSkeleton(sample)) unresolved.push(sample);
      }
    }
    expect(unresolved).toEqual([]);
  });

  it("has no stale registry entries (every kind key is a real route)", () => {
    const routes = new Set(appRoutePaths());
    const stale = Object.keys(ROUTE_SKELETON_KINDS).filter(
      (k) => !routes.has(k)
    );
    expect(stale).toEqual([]);
  });

  it("keeps shell-less screens chrome-free (kiosk, queue display, call)", () => {
    expect(resolveRouteSkeleton("/kiosk")?.chrome).toBe(false);
    expect(resolveRouteSkeleton("/queue-display")?.chrome).toBe(false);
    expect(resolveRouteSkeleton("/video-call/room-1")?.chrome).toBe(false);
    expect(resolveRouteSkeleton("/home")?.chrome).toBe(true);
  });

  it("returns null for unknown paths so callers use the safe fallback", () => {
    expect(resolveRouteSkeleton("/definitely-not-a-page")).toBeNull();
  });
});

describe("shape-class twins render shimmer elements", () => {
  const twins: Array<[string, React.ReactElement]> = [
    ["table page", <SkeletonTablePage key="t" />],
    ["list page", <SkeletonListPage key="l" />],
    ["marketplace grid", <SkeletonMarketplaceGrid key="m" />],
    ["split shell", <SkeletonSplitShell key="s" />],
    ["auth card", <SkeletonAuthCard key="a" />],
    ["article page", <SkeletonArticlePage key="r" />],
    ["form page", <SkeletonFormPage key="f" />],
    ["kiosk menu", <SkeletonKioskMenu key="k" />],
    ["queue display", <SkeletonQueueDisplay key="q" />],
    ["call screen", <SkeletonCallScreen key="c" />],
  ];
  it.each(twins)("%s mounts with .doc-shimmer blocks", (_name, el) => {
    const { container, unmount } = render(el);
    expect(container.querySelectorAll(".doc-shimmer").length).toBeGreaterThan(2);
    unmount();
  });
});

/* ---- contrast: the --skeleton tone must separate from its surfaces ---- */

function cssBlock(selector: string, mustContain = "--background:"): string {
  // index.css has more than one :root block; the design-token block is
  // the one that defines --background.
  let from = 0;
  for (;;) {
    const start = css.indexOf(selector, from);
    expect(start, `selector ${selector} present in index.css`).toBeGreaterThan(-1);
    const open = css.indexOf("{", start);
    const close = css.indexOf("}", open);
    const block = css.slice(open, close);
    if (block.includes(mustContain)) return block;
    from = close;
  }
}

function token(block: string, name: string): [number, number, number] {
  const m = block.match(new RegExp(`${name}:\\s*([\\d.]+) ([\\d.]+)% ([\\d.]+)%`));
  expect(m, `token ${name} present`).not.toBeNull();
  return [Number(m![1]), Number(m![2]) / 100, Number(m![3]) / 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(h / 60) % 6;
  const rgb: Array<[number, number, number]> = [
    [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
  ];
  const [r, g, b] = rgb[seg];
  return [r + m, g + m, b + m];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: [number, number, number], b: [number, number, number]) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("skeleton tone contrast (both themes)", () => {
  const light = cssBlock(":root {");
  const dark = cssBlock(".dark {");

  it("light theme: skeleton separates from card and background ≥1.35:1", () => {
    const skel = hslToRgb(...token(light, "--skeleton"));
    expect(contrast(skel, hslToRgb(...token(light, "--card")))).toBeGreaterThanOrEqual(1.35);
    expect(contrast(skel, hslToRgb(...token(light, "--background")))).toBeGreaterThanOrEqual(1.35);
  });

  it("dark theme: skeleton separates from card and background ≥1.35:1", () => {
    const skel = hslToRgb(...token(dark, "--skeleton"));
    expect(contrast(skel, hslToRgb(...token(dark, "--card")))).toBeGreaterThanOrEqual(1.35);
    expect(contrast(skel, hslToRgb(...token(dark, "--background")))).toBeGreaterThanOrEqual(1.35);
  });

  it(".doc-shimmer is driven by --skeleton, never by --muted", () => {
    const shimmer = cssBlock(".doc-shimmer {", "var(--skeleton)");
    expect(shimmer).toContain("var(--skeleton)");
    expect(shimmer).not.toContain("var(--muted)");
  });
});

/* ---- white-on-white regression pins ---- */

function allSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "test") continue;
      out.push(...allSourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("eradicated white-on-white shapes stay eradicated", () => {
  const srcRoot = resolve(__dirname, "..");
  const corpus = allSourceFiles(srcRoot)
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");

  it("no solid-white surface with the dead dark overlay anywhere in src", () => {
    // The class behind the CEO's report: bg-white in light mode with a
    // token that only helped in dark mode, paired with white content.
    expect(corpus).not.toContain("bg-white dark:bg-slate-900/20");
    expect(corpus).not.toContain("hover:bg-white dark:bg-slate-900/20");
  });

  it("no bare bg-muted pulse slabs remain as loading placeholders", () => {
    expect(corpus).not.toContain("bg-muted animate-pulse");
    expect(corpus).not.toContain("bg-muted/50 animate-pulse");
  });

  it("skeleton kit carries no hardcoded light-gray blocks", () => {
    expect(kit).not.toContain("bg-gray-200");
    expect(kit).not.toContain("bg-slate-200");
  });

  it("fixed surfaces use translucent-white chips on coloured headers", () => {
    const sidebar = readFileSync(
      resolve(__dirname, "../components/workos/WorkOSSidebar.tsx"),
      "utf8"
    );
    expect(sidebar).toContain("bg-white/25 text-white");
    const offline = readFileSync(
      resolve(__dirname, "../components/OfflineAlert.tsx"),
      "utf8"
    );
    expect(offline).toContain("hover:bg-white/20");
    expect(offline).not.toContain("hover:bg-white ");
    const wallet = readFileSync(
      resolve(__dirname, "../components/home/WalletCard.tsx"),
      "utf8"
    );
    expect(wallet).toContain("bg-white/25");
  });
});
