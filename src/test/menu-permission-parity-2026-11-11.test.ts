import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  getRoleNavigation, hasRoutePermission, USER_ROLES,
} from "@/utils/rolePermissions";
import type { UserRole } from "@/utils/rolePermissions";

// MENU ↔ PERMISSION-MATRIX PARITY (defect found in rendered verification
// 2026-11-11): an institution_admin (who is also a patient) was bounced
// from /pharmacy-management to /institution-dashboard by RouteGuard —
// getRoleNavigation offers that route (and /lab-management,
// /pharmacy-portal) to institution_admin, but ROLE_PERMISSIONS never
// granted them: institution_admin's list carries INSTITUTION_MANAGEMENT_
// ROUTES but not the operational module routes its peer roles receive.
// The menu is a promise: every role a menu item names must actually hold
// the route in the matrix, or the guard silently redirects the user away
// from a page their own menu offered. This pin walks EVERY menu item so
// the two sources can never drift apart again in the menu→matrix
// direction. (The reverse direction — matrix grants a route the menus
// don't list — is intentionally NOT pinned: menus are curated subsets.)

describe("menu → permission matrix parity", () => {
  const menu = getRoleNavigation([USER_ROLES.SUPER_ADMIN]);

  it("every role named on a menu item holds that route in the matrix", () => {
    const violations: string[] = [];
    for (const item of menu) {
      for (const role of item.roles) {
        if (!hasRoutePermission([role as UserRole], item.path)) {
          violations.push(`${item.path} promised to ${role} by menu "${item.label}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("institution_admin holds the module routes its menu offers (2026-11-11 defect)", () => {
    const admin = [USER_ROLES.INSTITUTION_ADMIN];
    expect(hasRoutePermission(admin, "/pharmacy-management")).toBe(true);
    expect(hasRoutePermission(admin, "/lab-management")).toBe(true);
    expect(hasRoutePermission(admin, "/pharmacy-portal")).toBe(true);
  });

  it("the reported QA role combo {patient, institution_admin} is not bounced", () => {
    const combo = [USER_ROLES.PATIENT, USER_ROLES.INSTITUTION_ADMIN];
    expect(hasRoutePermission(combo, "/pharmacy-management")).toBe(true);
    expect(hasRoutePermission(combo, "/lab-management")).toBe(true);
    expect(hasRoutePermission(combo, "/pharmacy-portal")).toBe(true);
  });
});

// STOCK CONTROL INSTITUTION GATE (defect found in rendered verification
// 2026-11-11): PharmacyPortal's Dashboard tab showed the institution
// correctly, but Stock Control claimed "No institution selected" for the
// institution's own admin. Cause: the six InventoryControlTabs panels read
// only institutionId from useInstitutionContext and rendered their
// no-institution state while the context was still resolving (institutionId
// is null during loading); PharmacyDashboard gates on `loading` first.
// Pin: every panel must destructure `loading` and gate on it BEFORE the
// !institutionId branch.
describe("stock control panels wait for institution resolution", () => {
  const panels = [
    "BatchInventory", "ExpiryRadar", "QualityControl",
    "StockAudit", "WriteOffs", "StockValuation",
  ];
  for (const name of panels) {
    it(`${name} gates on loading before the no-institution state`, () => {
      const src = readFileSync(
        resolve(__dirname, `../components/pharmacy/${name}.tsx`), "utf8");
      expect(src).toMatch(/const \{[^}]*\bloading\b[^}]*\} = useInstitutionContext\(\)/);
      const loadingGate = src.indexOf("if (loading)");
      const noInstGate = src.indexOf("if (!institutionId)");
      expect(loadingGate).toBeGreaterThan(-1);
      expect(noInstGate).toBeGreaterThan(-1);
      expect(loadingGate).toBeLessThan(noInstGate);
    });
  }
});
