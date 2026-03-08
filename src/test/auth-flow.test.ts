import { describe, it, expect } from 'vitest';
import { getRoleLandingPage, hasRoutePermission, PUBLIC_ROUTES, ROLE_PERMISSIONS, USER_ROLES } from '@/utils/rolePermissions';
import type { UserRole } from '@/utils/rolePermissions';

describe('Auth Flow & Role Routing', () => {
  // ── Unauthenticated users ──────────────────────────────────────
  describe('Unauthenticated access', () => {
    it('allows all PUBLIC_ROUTES without roles', () => {
      PUBLIC_ROUTES.forEach(route => {
        expect(hasRoutePermission(null, route)).toBe(true);
      });
    });

    it('denies protected dashboards', () => {
      ['/admin-dashboard', '/provider-dashboard', '/home', '/pharmacy-portal', '/lab-management'].forEach(route => {
        expect(hasRoutePermission(null, route)).toBe(false);
      });
    });

    it('redirects to /auth when no roles', () => {
      expect(getRoleLandingPage(null)).toBe('/auth');
      expect(getRoleLandingPage([])).toBe('/auth');
    });
  });

  // ── Role-based landing pages ───────────────────────────────────
  describe('Role-based landing pages', () => {
    const cases: [UserRole[], string][] = [
      [['patient'], '/home'],
      [['doctor'], '/provider-dashboard'],
      [['nurse'], '/provider-dashboard'],
      [['radiologist'], '/provider-dashboard'],
      [['health_personnel'], '/provider-dashboard'],
      [['pharmacist'], '/pharmacy-portal'],
      [['pharmacy'], '/pharmacy-portal'],
      [['lab_technician'], '/lab-management'],
      [['lab'], '/lab-management'],
      [['admin'], '/admin-dashboard'],
      [['super_admin'], '/admin-dashboard'],
      [['institution_admin'], '/institution-portal'],
      [['institution_staff'], '/institution-dashboard'],
    ];

    cases.forEach(([roles, expected]) => {
      it(`${roles.join('+')} → ${expected}`, () => {
        expect(getRoleLandingPage(roles)).toBe(expected);
      });
    });
  });

  // ── Multi-role priority ────────────────────────────────────────
  describe('Multi-role priority', () => {
    it('admin takes priority over patient', () => {
      expect(getRoleLandingPage(['patient', 'admin'])).toBe('/admin-dashboard');
    });

    it('doctor takes priority over patient', () => {
      expect(getRoleLandingPage(['patient', 'doctor'])).toBe('/provider-dashboard');
    });

    it('institution_admin takes priority over doctor', () => {
      expect(getRoleLandingPage(['doctor', 'institution_admin'])).toBe('/institution-portal');
    });

    it('super_admin takes priority over everything', () => {
      expect(getRoleLandingPage(['patient', 'doctor', 'super_admin'])).toBe('/admin-dashboard');
    });
  });

  // ── Route permissions per role ─────────────────────────────────
  describe('Route permission enforcement', () => {
    it('patient can access /symptoms, /appointments, /medical-records', () => {
      expect(hasRoutePermission(['patient'], '/symptoms')).toBe(true);
      expect(hasRoutePermission(['patient'], '/appointments')).toBe(true);
      expect(hasRoutePermission(['patient'], '/medical-records')).toBe(true);
    });

    it('patient cannot access /admin-dashboard or /pharmacy-portal', () => {
      expect(hasRoutePermission(['patient'], '/admin-dashboard')).toBe(false);
      expect(hasRoutePermission(['patient'], '/pharmacy-portal')).toBe(false);
    });

    it('doctor can access /prescriptions and /ai-diagnostics', () => {
      expect(hasRoutePermission(['doctor'], '/prescriptions')).toBe(true);
      expect(hasRoutePermission(['doctor'], '/ai-diagnostics')).toBe(true);
    });

    it('doctor cannot access /pharmacy-portal', () => {
      expect(hasRoutePermission(['doctor'], '/pharmacy-portal')).toBe(false);
    });

    it('pharmacist can access /pharmacy-portal and /pharmacy-inventory', () => {
      expect(hasRoutePermission(['pharmacist'], '/pharmacy-portal')).toBe(true);
      expect(hasRoutePermission(['pharmacist'], '/pharmacy-inventory')).toBe(true);
    });

    it('lab_technician can access /lab-management', () => {
      expect(hasRoutePermission(['lab_technician'], '/lab-management')).toBe(true);
    });

    it('super_admin can access any route', () => {
      ['/admin-dashboard', '/pharmacy-portal', '/lab-management', '/provider-dashboard', '/institution-portal'].forEach(route => {
        expect(hasRoutePermission(['super_admin'], route)).toBe(true);
      });
    });

    it('institution_admin can access /hospital-management', () => {
      expect(hasRoutePermission(['institution_admin'], '/hospital-management')).toBe(true);
    });

    it('institution_staff cannot access /institution-registration', () => {
      expect(hasRoutePermission(['institution_staff'], '/institution-registration')).toBe(false);
    });
  });

  // ── Dynamic route matching ─────────────────────────────────────
  describe('Dynamic route matching', () => {
    it('patient can access /appointments/:id', () => {
      expect(hasRoutePermission(['patient'], '/appointments/some-uuid-123')).toBe(true);
    });

    it('unauthenticated cannot access /appointments/:id', () => {
      expect(hasRoutePermission(null, '/appointments/some-uuid')).toBe(false);
    });
  });

  // ── Every role has its landing page in its permissions ─────────
  describe('Landing page consistency', () => {
    const allRoles = Object.values(USER_ROLES) as UserRole[];

    allRoles.forEach(role => {
      it(`${role} can access its own landing page`, () => {
        const landing = getRoleLandingPage([role]);
        if (landing === '/auth') return; // no landing for unauthenticated
        expect(hasRoutePermission([role], landing)).toBe(true);
      });
    });
  });
});
