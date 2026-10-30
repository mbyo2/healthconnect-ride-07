import type { ReactNode } from "react";
import {
  SkeletonAppointmentsBoard,
  SkeletonArticlePage,
  SkeletonAuthCard,
  SkeletonCallScreen,
  SkeletonDashboardBody,
  SkeletonFormPage,
  SkeletonInstitutionDashboard,
  SkeletonKioskMenu,
  SkeletonListPage,
  SkeletonMarketplaceGrid,
  SkeletonPatientHome,
  SkeletonProviderCard,
  SkeletonProviderDashboard,
  SkeletonProviderProfile,
  SkeletonQueueDisplay,
  SkeletonSearchHeader,
  SkeletonSplitShell,
  SkeletonTablePage,
} from "@/components/ui/skeleton-kit";

/**
 * Route → skeleton twin resolution for the route-level loading gate
 * (LoadingScreen). Before this map existed, EVERY route loaded behind
 * the same generic dashboard frame — a chat, a form and a table all
 * wore stat cards, so elements the user expected were "missing" and
 * shapes jumped when content landed (CEO complaint, 2026-10-30).
 *
 * Every route in App.tsx maps to the twin of its own page shape:
 * bespoke twins for hero pages, shape-class twins (table / list /
 * form / split / article / auth / dashboard) for the long tail.
 * Coverage is pinned by src/test/skeleton-coverage.test.tsx, which
 * parses App.tsx and fails if a route resolves to nothing here.
 *
 * `chrome: false` = shell-less screens (kiosk, queue display, video
 * call): the twin replaces the whole viewport, no app header/nav.
 */
export type RouteSkeletonKind =
  | "patient-home"
  | "appointments"
  | "provider-dashboard"
  | "institution-dashboard"
  | "provider-profile"
  | "search"
  | "marketplace"
  | "table"
  | "list"
  | "dashboard"
  | "form"
  | "split"
  | "auth"
  | "article"
  | "kiosk"
  | "display"
  | "call";

export interface RouteSkeleton {
  kind: RouteSkeletonKind;
  chrome: boolean;
  /** Body twin; undefined for the dashboard shape (AppFrame default). */
  body?: ReactNode;
}

function searchBody(): ReactNode {
  return (
    <div className="space-y-5">
      <SkeletonSearchHeader />
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <SkeletonProviderCard key={i} />
        ))}
      </div>
    </div>
  );
}

const KINDS: Record<RouteSkeletonKind, Omit<RouteSkeleton, "kind">> = {
  "patient-home": { chrome: true, body: <SkeletonPatientHome /> },
  appointments: { chrome: true, body: <SkeletonAppointmentsBoard /> },
  "provider-dashboard": { chrome: true, body: <SkeletonProviderDashboard /> },
  "institution-dashboard": { chrome: true, body: <SkeletonInstitutionDashboard /> },
  "provider-profile": { chrome: true, body: <SkeletonProviderProfile /> },
  search: { chrome: true, body: searchBody() },
  marketplace: { chrome: true, body: <SkeletonMarketplaceGrid /> },
  table: { chrome: true, body: <SkeletonTablePage /> },
  list: { chrome: true, body: <SkeletonListPage /> },
  dashboard: { chrome: true, body: <SkeletonDashboardBody /> },
  form: { chrome: true, body: <SkeletonFormPage /> },
  split: { chrome: true, body: <SkeletonSplitShell /> },
  auth: { chrome: true, body: <SkeletonAuthCard /> },
  article: { chrome: true, body: <SkeletonArticlePage /> },
  kiosk: { chrome: false, body: <SkeletonKioskMenu /> },
  display: { chrome: false, body: <SkeletonQueueDisplay /> },
  call: { chrome: false, body: <SkeletonCallScreen /> },
};

/** Exact route-path → twin kind. Keys mirror App.tsx `path` values. */
export const ROUTE_SKELETON_KINDS: Record<string, RouteSkeletonKind> = {
  "/landing": "article",
  "/healthcare-professionals": "article",
  "/healthcare-institutions": "search",
  "/terms": "article",
  "/privacy": "article",
  "/about": "article",
  "/contact": "article",
  "/register": "auth",
  "/patient-registration": "auth",
  "/accept-invitation": "auth",
  "/search": "search",
  "/providers": "search",
  "/marketplace-users": "marketplace",
  "/provider/:id": "provider-profile",
  "/emergency": "kiosk",
  "/pricing": "article",
  "/workos": "dashboard",
  "/showcase": "dashboard",
  "/queue-display": "display",
  "/kiosk": "kiosk",
  "/booking-confirmed": "auth",
  "/payment-cancelled": "auth",
  "/payment-cancel": "auth",
  "/payment-success": "auth",
  "/reset-password": "auth",
  "/auth": "auth",
  "/": "dashboard",
  "/dashboard": "dashboard",
  "/onboarding": "auth",
  "/profile": "form",
  "/settings": "form",
  "/appointments": "appointments",
  "/appointments/:id": "appointments",
  "/admin-dashboard": "institution-dashboard",
  "/fhir-exchanges": "table",
  "/provider-dashboard": "provider-dashboard",
  "/super-admin-dashboard": "institution-dashboard",
  "/pharmacy-inventory": "table",
  "/connections": "list",
  "/chat": "split",
  "/shared-equipment": "table",
  "/prescriptions": "table",
  "/pharmacy-verify": "form",
  "/symptoms": "form",
  "/triage": "form",
  "/doc-o-clock": "form",
  "/video-dashboard": "dashboard",
  "/testing": "list",
  "/documentation": "article",
  "/map": "split",
  "/marketplace": "marketplace",
  "/pharmacy-portal": "institution-dashboard",
  "/healthcare-application": "form",
  "/create-admin": "form",
  "/ai-diagnostics": "dashboard",
  "/home": "patient-home",
  "/medical-records": "table",
  "/video-consultations": "list",
  "/health-dashboard": "dashboard",
  "/wallet": "dashboard",
  "/billing": "table",
  "/insurance-cards": "list",
  "/cost-estimator": "form",
  "/waitlist": "list",
  "/appointment-reminders": "list",
  "/advanced-dashboard": "dashboard",
  "/blockchain-records": "table",
  "/iot-monitoring": "dashboard",
  "/health-analytics": "dashboard",
  "/emergency-response": "dashboard",
  "/pharmacy-management": "institution-dashboard",
  "/hospital-management": "institution-dashboard",
  "/lab-management": "institution-dashboard",
  "/lab-orders": "table",
  "/referrals": "table",
  "/theatre": "institution-dashboard",
  "/opd": "institution-dashboard",
  "/icu": "institution-dashboard",
  "/maternal-child": "institution-dashboard",
  "/ipd-wards": "institution-dashboard",
  "/imaging": "institution-dashboard",
  "/drug-stock": "table",
  "/teaching-research": "dashboard",
  "/procurement": "table",
  "/notifications": "list",
  "/help": "article",
  "/privacy-security": "article",
  "/medications": "table",
  "/provider-calendar": "appointments",
  "/application-status": "auth",
  "/institution-portal": "institution-dashboard",
  "/institution-registration": "auth",
  "/institution-status": "auth",
  "/institution-dashboard": "institution-dashboard",
  "/staff-dashboard": "institution-dashboard",
  "/institution/personnel": "table",
  "/institution/patients": "table",
  "/institution/reports": "dashboard",
  "/institution/appointments": "appointments",
  "/institution/settings": "form",
  "/institution/devices": "table",
  "/multi-center": "institution-dashboard",
  "/financial-controls": "dashboard",
  "/patient-flow": "dashboard",
  "/enhanced-inventory": "table",
  "/procedure-management": "table",
  "/care-team": "list",
  "/enhanced-diagnostics": "dashboard",
  "/zambia-compliance": "list",
  "/enhanced-telemedicine": "list",
  "/analytics-reporting": "dashboard",
  "/enterprise-accounting": "dashboard",
  "/zra-smart-invoice": "table",
  "/paye-calculations": "table",
  "/medical-shift-hr": "table",
  "/denial-workqueue": "table",
  "/my-deliveries": "list",
  "/courier-deliveries": "dashboard",
  "/art": "table",
  "/camps": "table",
  "/indents": "table",
  "/email-campaigns": "list",
  "/provider-portal": "provider-dashboard",
  "/provider-profile/:id": "provider-profile",
  "/video-call/:roomId": "call",
  "/visit-summary/:consultationId": "article",
  "/ambient-scribe/:consultationId?": "split",
  "/role-management": "table",
  "/intake-form": "form",
  "*": "article",
};

/** Paths that only <Navigate> elsewhere — no page ever loads there. */
export const REDIRECT_ONLY_ROUTES = [
  "/login",
  "/profile-setup",
  "/pharmacy-rx",
  "/telemedicine",
  "/market",
] as const;

function patternToRegExp(pattern: string): RegExp {
  const parts = pattern
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith(":")) {
        // ":id" → one required segment; ":id?" → optional segment.
        return segment.endsWith("?") ? "(?:/[^/]+)?" : "/[^/]+";
      }
      return "/" + segment.replace(/[.*+^${}()|[\]\\]/g, "\\$&");
    });
  return new RegExp(`^${parts.join("")}/?$`);
}

const PATTERN_ENTRIES = Object.entries(ROUTE_SKELETON_KINDS)
  .filter(([pattern]) => pattern.includes(":"))
  .map(([pattern, kind]) => ({ regex: patternToRegExp(pattern), kind }));

/**
 * Resolve a concrete pathname (e.g. "/provider/abc-123") to its twin.
 * Returns null only for paths with no mapped page (unknown URLs) —
 * callers fall back to the dashboard frame for those.
 */
export function resolveRouteSkeleton(pathname: string): RouteSkeleton | null {
  const clean = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const direct = ROUTE_SKELETON_KINDS[clean];
  if (direct) return { kind: direct, ...KINDS[direct] };
  for (const entry of PATTERN_ENTRIES) {
    if (entry.regex.test(clean)) {
      return { kind: entry.kind, ...KINDS[entry.kind] };
    }
  }
  return null;
}
