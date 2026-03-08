import { describe, it, expect } from 'vitest';
import { getRoleLandingPage, hasRoutePermission, PUBLIC_ROUTES, USER_ROLES, ROLE_PERMISSIONS } from '@/utils/rolePermissions';
import type { UserRole } from '@/utils/rolePermissions';

describe('Role Routing', () => {
  describe('getRoleLandingPage', () => {
    it('returns /auth for no roles', () => {
      expect(getRoleLandingPage(null)).toBe('/auth');
      expect(getRoleLandingPage([])).toBe('/auth');
    });

    it('routes patient to /home', () => {
      expect(getRoleLandingPage(['patient'])).toBe('/home');
    });

    it('routes doctor to /provider-dashboard', () => {
      expect(getRoleLandingPage(['doctor'])).toBe('/provider-dashboard');
    });

    it('routes nurse to /provider-dashboard', () => {
      expect(getRoleLandingPage(['nurse'])).toBe('/provider-dashboard');
    });

    it('routes pharmacist to /pharmacy-portal', () => {
      expect(getRoleLandingPage(['pharmacist'])).toBe('/pharmacy-portal');
    });

    it('routes lab_technician to /lab-management', () => {
      expect(getRoleLandingPage(['lab_technician'])).toBe('/lab-management');
    });

    it('routes admin to /admin-dashboard', () => {
      expect(getRoleLandingPage(['admin'])).toBe('/admin-dashboard');
    });

    it('routes super_admin to /admin-dashboard', () => {
      expect(getRoleLandingPage(['super_admin'])).toBe('/admin-dashboard');
    });

    it('routes institution_admin to /institution-portal', () => {
      expect(getRoleLandingPage(['institution_admin'])).toBe('/institution-portal');
    });

    it('prioritizes admin over patient when user has both', () => {
      expect(getRoleLandingPage(['patient', 'admin'])).toBe('/admin-dashboard');
    });

    it('prioritizes doctor over patient when user has both', () => {
      expect(getRoleLandingPage(['patient', 'doctor'])).toBe('/provider-dashboard');
    });

    // ─── All 26 roles land on a valid page ─────────────────
    const allRoles = Object.values(USER_ROLES);
    allRoles.forEach(role => {
      it(`${role} landing page is accessible by that role`, () => {
        const landing = getRoleLandingPage([role as UserRole]);
        expect(landing).toBeTruthy();
        // The landing page should be in that role's permissions or be a common route
        const hasAccess = hasRoutePermission([role as UserRole], landing);
        expect(hasAccess).toBe(true);
      });
    });
  });

  describe('hasRoutePermission', () => {
    it('allows public routes for unauthenticated users', () => {
      PUBLIC_ROUTES.forEach(route => {
        expect(hasRoutePermission(null, route)).toBe(true);
      });
    });

    it('denies protected routes for unauthenticated users', () => {
      expect(hasRoutePermission(null, '/admin-dashboard')).toBe(false);
      expect(hasRoutePermission(null, '/provider-dashboard')).toBe(false);
    });

    it('allows patient routes for patients', () => {
      expect(hasRoutePermission(['patient'], '/symptoms')).toBe(true);
      expect(hasRoutePermission(['patient'], '/appointments')).toBe(true);
      expect(hasRoutePermission(['patient'], '/medical-records')).toBe(true);
    });

    it('denies admin routes for patients', () => {
      expect(hasRoutePermission(['patient'], '/admin-dashboard')).toBe(false);
      expect(hasRoutePermission(['patient'], '/super-admin-dashboard')).toBe(false);
    });

    it('allows all routes for super_admin', () => {
      expect(hasRoutePermission(['super_admin'], '/admin-dashboard')).toBe(true);
      expect(hasRoutePermission(['super_admin'], '/pharmacy-portal')).toBe(true);
      expect(hasRoutePermission(['super_admin'], '/lab-management')).toBe(true);
    });

    it('allows pharmacy routes for pharmacist', () => {
      expect(hasRoutePermission(['pharmacist'], '/pharmacy-portal')).toBe(true);
      expect(hasRoutePermission(['pharmacist'], '/pharmacy-inventory')).toBe(true);
    });

    it('denies pharmacy routes for doctor', () => {
      expect(hasRoutePermission(['doctor'], '/pharmacy-portal')).toBe(false);
    });

    it('supports dynamic routes like /appointments/:id', () => {
      expect(hasRoutePermission(['patient'], '/appointments/some-uuid')).toBe(true);
    });

    it('allows pricing for everyone (public)', () => {
      expect(hasRoutePermission(null, '/pricing')).toBe(true);
    });

    // ─── institution_staff must NOT access /institution/settings ────
    it('denies /institution/settings for institution_staff', () => {
      expect(hasRoutePermission(['institution_staff'], '/institution/settings')).toBe(false);
    });

    it('allows /institution/settings for institution_admin', () => {
      expect(hasRoutePermission(['institution_admin'], '/institution/settings')).toBe(true);
    });

    // ─── Cross-role isolation checks ───────────────────────
    it('denies lab routes for pharmacist', () => {
      expect(hasRoutePermission(['pharmacist'], '/lab-management')).toBe(false);
    });

    it('denies admin-dashboard for doctor', () => {
      expect(hasRoutePermission(['doctor'], '/admin-dashboard')).toBe(false);
    });

    it('denies provider-dashboard for receptionist', () => {
      expect(hasRoutePermission(['receptionist'], '/provider-dashboard')).toBe(false);
    });

    it('allows institution-dashboard for billing_staff', () => {
      expect(hasRoutePermission(['billing_staff'], '/institution-dashboard')).toBe(true);
    });

    it('denies create-admin for support role', () => {
      expect(hasRoutePermission(['support'], '/create-admin')).toBe(false);
    });
  });

  describe('Permission completeness', () => {
    const allRoles = Object.values(USER_ROLES);

    it('every role has a permissions entry', () => {
      allRoles.forEach(role => {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
        expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
      });
    });

    it('no role has duplicate routes', () => {
      allRoles.forEach(role => {
        const routes = ROLE_PERMISSIONS[role];
        const unique = new Set(routes);
        expect(unique.size).toBe(routes.length);
      });
    });
  });
});
