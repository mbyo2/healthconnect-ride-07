/**
 * Completeness pass (2026-10-25) — the 48-role matrix, executable.
 *
 * Defects this pins shut (all found live in the role audit):
 *  - finance_manager had no ROLE_META / ROLE_PRIORITY entry: it landed on
 *    /home (patient home) and StaffDashboard had no config for it, so a
 *    finance manager saw the Reception Desk.
 *  - courier was missing from ROLE_PRIORITY.
 *  - The post-literal ROLE_PERMISSIONS assignments OVERWROTE the literal
 *    sets, demoting specialist below doctor (lost lab-orders, imaging,
 *    icu, theatre, opd, ambient-scribe) and stripping core routes from
 *    phlebotomist / facility roles. They are unions now.
 *  - Role expansion injected 'institution_admin' into pure pharmacy/lab
 *    business accounts, so they landed on /institution-dashboard — a
 *    surface their own permissions never granted — instead of their
 *    portals.
 *  - Permission sets named phantom routes that do not exist
 *    (/admin-wallet, /compliance-audit, /mental-health, /ar-anatomy,
 *    /genomic-analysis, /smart-contracts, /quantum-encryption) and
 *    '/courier-deliveries' was a COMMON route every role passed.
 *  - StaffDashboard quick actions pointed at /support, /ambulance,
 *    /maintenance, /inventory — all 404.
 *  - BottomNav/DesktopNav evaluated the generic clinician branch before
 *    pharmacy/lab branches, so pharmacy and lab staff (who carry the
 *    health_personnel expansion) got doctor navigation.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { USER_ROLES, ROLE_META, ROLE_PRIORITY } from "@/config/roleConfig";
import { ROLE_PERMISSIONS, getRoleLandingPage, hasRoutePermission } from "@/utils/rolePermissions";
import type { UserRole } from "@/config/roleConfig";

const readSrc = (p: string) => readFileSync(resolve(__dirname, "../../", p), "utf8");

const ALL_ROLES = Object.values(USER_ROLES) as UserRole[];

// Real routes from the router — the ground truth permissions must match.
const appSrc = readSrc("src/App.tsx");
const APP_ROUTES = new Set(
  [...appSrc.matchAll(/path="([^"]+)"/g)].map((m) => m[1])
);
const norm = (r: string) => r.replace(/:[^/]+/g, ":x").replace("?", "");
const APP_ROUTES_N = new Set([...APP_ROUTES].map(norm));
const routeExists = (perm: string) => {
  const base = norm(perm.split("?")[0]);
  if (APP_ROUTES_N.has(base)) return true;
  // a permission for the static parent of an optional/dynamic route
  // (e.g. /ambient-scribe for /ambient-scribe/:consultationId?) exists
  return [...APP_ROUTES_N].some((r) => r.startsWith(base + "/"));
};

describe("48-role matrix · config completeness", () => {
  it("taxonomy has 48 roles and every role has metadata + a priority slot", () => {
    expect(ALL_ROLES.length).toBe(48);
    for (const role of ALL_ROLES) {
      expect(ROLE_META[role], `ROLE_META missing ${role}`).toBeTruthy();
      expect(ROLE_PRIORITY, `ROLE_PRIORITY missing ${role}`).toContain(role);
      expect(ROLE_PERMISSIONS[role]?.length, `ROLE_PERMISSIONS empty ${role}`).toBeGreaterThan(0);
    }
  });

  it("every role lands on its ROLE_META page and is allowed to be there", () => {
    for (const role of ALL_ROLES) {
      const landing = getRoleLandingPage([role]);
      expect(landing, `${role} landing`).toBe(ROLE_META[role].landingPage);
      expect(hasRoutePermission([role], landing), `${role} bounced off own landing ${landing}`).toBe(true);
    }
  });

  it("every permission route in every role's set actually exists in the router", () => {
    const phantoms: string[] = [];
    for (const role of ALL_ROLES) {
      for (const perm of ROLE_PERMISSIONS[role] || []) {
        if (!routeExists(perm)) phantoms.push(`${role}: ${perm}`);
      }
    }
    expect(phantoms).toEqual([]);
  });

  it("business entities land on their own portals, not the institution dashboard", () => {
    expect(getRoleLandingPage(["pharmacy", "pharmacist"] as UserRole[])).toBe("/pharmacy-portal");
    expect(getRoleLandingPage(["lab", "lab_technician"] as UserRole[])).toBe("/lab-management");
    expect(getRoleLandingPage(["finance_manager"] as UserRole[])).toBe("/staff-dashboard");
    expect(getRoleLandingPage(["courier"] as UserRole[])).toBe("/courier-deliveries");
  });

  it("courier deliveries are the courier's surface only", () => {
    expect(hasRoutePermission(["courier"] as UserRole[], "/courier-deliveries")).toBe(true);
    expect(hasRoutePermission(["patient"] as UserRole[], "/courier-deliveries")).toBe(false);
    expect(hasRoutePermission(["doctor"] as UserRole[], "/courier-deliveries")).toBe(false);
  });

  it("specialist keeps the full doctor-class clinical scope (no overwrite demotion)", () => {
    const spec = ROLE_PERMISSIONS[USER_ROLES.SPECIALIST];
    for (const route of ["/lab-orders", "/imaging", "/referrals", "/icu", "/theatre", "/opd", "/ambient-scribe", "/teaching-research"]) {
      expect(spec, `specialist lost ${route}`).toContain(route);
    }
    const phleb = ROLE_PERMISSIONS[USER_ROLES.PHLEBOTOMIST];
    expect(phleb).toContain("/ai-diagnostics");
    const triage = ROLE_PERMISSIONS[USER_ROLES.TRIAGE_STAFF];
    expect(triage).toContain("/triage");
    expect(triage).toContain("/staff-dashboard");
    const receptionist = ROLE_PERMISSIONS[USER_ROLES.RECEPTIONIST];
    expect(receptionist).toContain("/opd");
    expect(receptionist).toContain("/staff-dashboard");
  });

  it("role expansion no longer injects institution_admin into pharmacy/lab accounts", () => {
    const ctx = readSrc("src/context/UserRolesContext.tsx");
    const pharmacyBlock = ctx.slice(ctx.indexOf("roleStr === 'pharmacy'"), ctx.indexOf("roleStr === 'pharmacist'"));
    const labBlock = ctx.slice(ctx.indexOf("roleStr === 'lab'"), ctx.indexOf("roleStr === 'lab_technician'"));
    expect(pharmacyBlock).not.toContain("expandedRoles.add('institution_admin')");
    expect(labBlock).not.toContain("expandedRoles.add('institution_admin')");
  });
});

describe("48-role matrix · surfaces", () => {
  it("StaffDashboard has a config for every staff role incl. finance_manager, and no dead quick actions", () => {
    const dash = readSrc("src/pages/StaffDashboard.tsx");
    for (const role of ["receptionist", "billing_staff", "hr_manager", "cxo", "support", "ambulance_staff", "triage_staff", "ot_staff", "maintenance_manager", "inventory_manager", "finance_manager"]) {
      expect(dash, `StaffDashboard config missing ${role}`).toContain(`${role}: {`);
    }
    const quickPaths = [...dash.matchAll(/quickActions:[\s\S]*?\]/g)].flatMap((block) =>
      [...block[0].matchAll(/path: "([^"]+)"/g)].map((m) => m[1])
    );
    expect(quickPaths.length).toBeGreaterThan(10);
    for (const p of quickPaths) {
      expect(routeExists(p), `quick action 404: ${p}`).toBe(true);
    }
  });

  it("nav evaluates pharmacy/lab before the generic clinician branch in both navs", () => {
    for (const file of ["src/components/BottomNav.tsx", "src/components/DesktopNav.tsx"]) {
      const src = readSrc(file);
      const clinicianIdx = src.indexOf("isHealthPersonnel || availableRoles.some(r => (ALL_CLINICIAN_ROLES");
      const pharmacyIdx = src.search(/\/\/ Pharmacy/);
      const labIdx = src.search(/\/\/ Lab/);
      expect(pharmacyIdx, `${file} pharmacy branch`).toBeGreaterThan(-1);
      expect(labIdx, `${file} lab branch`).toBeGreaterThan(-1);
      expect(pharmacyIdx, `${file} pharmacy after clinician`).toBeLessThan(clinicianIdx);
      expect(labIdx, `${file} lab after clinician`).toBeLessThan(clinicianIdx);
      expect(src, `${file} finance branch`).toContain("finance_manager");
      expect(src, `${file} courier branch`).toContain("courier");
    }
  });
});
