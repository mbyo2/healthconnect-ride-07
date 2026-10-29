import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SkeletonAppFrame,
  SkeletonHeaderBar,
  SkeletonBottomNav,
} from "@/components/ui/skeleton-kit";

/**
 * Header-in-skeleton pins (CEO complaint 2026-10-29): the full-page
 * loading gate replaces MobileLayout, so SkeletonAppFrame must carry
 * faithful twins of BOTH real headers (DesktopNav >1024px, mobile
 * Header ≤1024px) — logo mark + wordmark, the pill nav container,
 * the right-side action cluster for the signed-in AND signed-out
 * states — plus the floating BottomNav pill for signed-in users.
 * A header-less loading screen is the defect these tests lock out.
 */

const kit = readFileSync(
  resolve(__dirname, "../components/ui/skeleton-kit.tsx"),
  "utf8"
);
const loadingScreen = readFileSync(
  resolve(__dirname, "../components/LoadingScreen.tsx"),
  "utf8"
);

describe("SkeletonHeaderBar — desktop twin (DesktopNav)", () => {
  it("renders a desktop-only bar at the real header's chrome", () => {
    const { container } = render(<SkeletonHeaderBar variant="authed" />);
    const html = container.innerHTML;
    // Desktop shell: hidden below the JS breakpoint (1025px), sticky,
    // same translucent fill + border as DesktopNav's <header>.
    expect(html).toContain("min-[1025px]:block");
    expect(html).toContain("bg-white/90");
    expect(html).toContain("dark:bg-slate-900/90");
    expect(html).toContain("border-canvas-silk");
    // Real bar height: h-16, lg:h-[4.25rem].
    expect(html).toContain("lg:h-[4.25rem]");
  });

  it("mirrors AppLogo: 32px mark + wordmark-width bar", () => {
    const { container } = render(<SkeletonHeaderBar variant="authed" />);
    expect(container.innerHTML).toContain("h-8 w-8");
    expect(container.innerHTML).toContain("w-[104px]");
  });

  it("mirrors the pill nav container with icon+label items", () => {
    const { container } = render(<SkeletonHeaderBar variant="authed" />);
    const html = container.innerHTML;
    expect(html).toContain("rounded-nav");
    expect(html).toContain("bg-canvas-mist/60");
    // Patient nav labels: Dashboard / Find Care / My Appointments / Messages.
    expect(html).toContain("w-[112px]");
  });

  it("signed-in right cluster: search, currency, theme, bell, avatar", () => {
    const { container } = render(<SkeletonHeaderBar variant="authed" />);
    const html = container.innerHTML;
    expect(html).toContain("w-[52px]"); // CurrencyToggle h-8 chip
    // Guest CTAs must NOT appear in the signed-in twin.
    expect(html).not.toContain("w-[118px]");
  });

  it("signed-out right cluster: Sign In + Get Started pills", () => {
    const { container } = render(<SkeletonHeaderBar variant="guest" />);
    const html = container.innerHTML;
    expect(html).toContain("w-[88px]");
    expect(html).toContain("w-[118px]");
    // Signed-out desktop nav has five items (Home … Emergency).
    expect(html).toContain("w-[38px]");
  });
});

describe("SkeletonHeaderBar — mobile twin (Header)", () => {
  it("renders a mobile-only bar at h-16 with the wordmark hiding below 420px", () => {
    const { container } = render(<SkeletonHeaderBar variant="authed" />);
    const html = container.innerHTML;
    expect(html).toContain("min-[1025px]:hidden");
    expect(html).toContain("h-16");
    expect(html).toContain("min-[420px]:block");
  });

  it("signed-in cluster carries switcher, search, bell and avatar shapes", () => {
    const { container } = render(<SkeletonHeaderBar variant="authed" />);
    const html = container.innerHTML;
    expect(html).toContain("sm:w-[76px]"); // InstitutionSwitcher pill
    expect(html).toContain("rounded-pill");
  });
});

describe("SkeletonBottomNav + SkeletonAppFrame", () => {
  it("bottom nav twin is a floating pill with five slots, mobile-only", () => {
    const { container } = render(<SkeletonBottomNav />);
    const html = container.innerHTML;
    expect(html).toContain("max-w-md");
    expect(html).toContain("rounded-pill");
    expect(html).toContain("min-[400px]:block"); // labels join at 400px
    expect(html.match(/min-h-\[50px\]/g)?.length).toBe(5);
  });

  it("signed-in frame includes header + bottom nav; guest frame omits the nav", () => {
    const authed = render(<SkeletonAppFrame variant="authed" />);
    expect(authed.container.innerHTML).toContain("max-w-md");
    expect(authed.container.innerHTML).toContain("min-[1025px]:block");
    const guest = render(<SkeletonAppFrame variant="guest" />);
    expect(guest.container.innerHTML).not.toContain("max-w-md");
    expect(guest.container.innerHTML).toContain("w-[118px]");
  });

  it("frame defaults to the signed-in variant", () => {
    const { container } = render(<SkeletonAppFrame />);
    expect(container.innerHTML).toContain("max-w-md");
  });
});

describe("LoadingScreen wiring", () => {
  it("chooses the header variant from the auth session", () => {
    expect(loadingScreen).toContain('variant={user ? "authed" : "guest"}');
    expect(loadingScreen).toContain("useAuth");
  });

  it("kit keeps both header twins and the bottom nav in the shimmer system", () => {
    expect(kit).toContain("SkeletonDesktopHeader");
    expect(kit).toContain("SkeletonMobileHeader");
    expect(kit).toContain("SkeletonBottomNav");
    // No second shimmer system: twins compose the base Skeleton only.
    expect(kit).not.toContain("animate-pulse");
  });
});
