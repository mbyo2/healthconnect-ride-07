import { describe, it, expect } from "vitest";
import {
  getRoleNavigation, hasRoutePermission, ROLE_PERMISSIONS, USER_ROLES,
} from "@/utils/rolePermissions";
import type { UserRole } from "@/utils/rolePermissions";

// BACK-OFFICE PERMISSION TRIM (CEO-approved 2026-11-11, follow-up to the
// institution-admin parity fix f60837a8): /pharmacy-management and
// /lab-management are module-owner surfaces. getRoleNavigation offers them
// only to the pharmacy/lab roles, institution_admin, admin and super_admin
// — but the facility back-office roles below held both routes silently via
// the INSTITUTION_OPERATIONAL_ROUTES bundle, so RouteGuard let them open
// pages their own menus never showed. They now compose from
// INSTITUTION_OPERATIONAL_ROUTES_BACK_OFFICE (the bundle minus the two
// routes); the bundle itself is unchanged so menu-listed roles keep full
// access. These pins lock both directions: trimmed roles must NOT hold the
// two routes, menu-listed roles MUST still hold them.

const TRIMMED_ROLES = [
  USER_ROLES.RECEPTIONIST,
  USER_ROLES.HR_MANAGER,
  USER_ROLES.CXO,
  USER_ROLES.BILLING_STAFF,
  USER_ROLES.FINANCE_MANAGER,
  USER_ROLES.INVENTORY_MANAGER,
  USER_ROLES.MAINTENANCE_MANAGER,
  USER_ROLES.MEDICAL_RECORDS_OFFICER,
] as const;

const TRIMMED_ROUTES = ["/pharmacy-management", "/lab-management"] as const;

describe("back-office trim: bundle-only holders lose the two module routes", () => {
  for (const role of TRIMMED_ROLES) {
    it(`${role} no longer holds /pharmacy-management or /lab-management`, () => {
      for (const route of TRIMMED_ROUTES) {
        expect(hasRoutePermission([role], route)).toBe(false);
        expect(ROLE_PERMISSIONS[role] ?? []).not.toContain(route);
      }
    });

    it(`${role} keeps the rest of the operational bundle (no over-trim)`, () => {
      for (const route of ["/institution-dashboard", "/hospital-management", "/pharmacy-inventory"]) {
        expect(hasRoutePermission([role], route)).toBe(true);
      }
    });
  }

  it("pharmacy-portal grants are untouched (billing_staff + inventory_manager keep it)", () => {
    expect(hasRoutePermission([USER_ROLES.BILLING_STAFF], "/pharmacy-portal")).toBe(true);
    expect(hasRoutePermission([USER_ROLES.INVENTORY_MANAGER], "/pharmacy-portal")).toBe(true);
    expect(hasRoutePermission([USER_ROLES.INSTITUTION_STAFF], "/pharmacy-portal")).toBe(true);
  });
});

describe("back-office trim: every menu-listed role keeps the two routes", () => {
  const menu = getRoleNavigation([USER_ROLES.SUPER_ADMIN]);

  for (const route of TRIMMED_ROUTES) {
    it(`all roles the menu names for ${route} still hold it`, () => {
      const items = menu.filter((i) => i.path === route);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        for (const role of item.roles) {
          expect(
            hasRoutePermission([role as UserRole], route),
            `${route} must stay granted to menu-listed role ${role}`,
          ).toBe(true);
        }
      }
    });
  }

  it("the named module-owner roles hold both routes explicitly", () => {
    for (const role of [
      USER_ROLES.PHARMACY, USER_ROLES.WHOLESALE_PHARMACY, USER_ROLES.PHARMACIST,
      USER_ROLES.PHARMACY_TECHNOLOGIST, USER_ROLES.INSTITUTION_ADMIN, USER_ROLES.ADMIN,
    ]) {
      expect(hasRoutePermission([role], "/pharmacy-management")).toBe(true);
    }
    for (const role of [
      USER_ROLES.LAB, USER_ROLES.LAB_TECHNICIAN, USER_ROLES.PATHOLOGIST,
      USER_ROLES.PHLEBOTOMIST, USER_ROLES.INSTITUTION_ADMIN, USER_ROLES.ADMIN,
    ]) {
      expect(hasRoutePermission([role], "/lab-management")).toBe(true);
    }
  });
});
