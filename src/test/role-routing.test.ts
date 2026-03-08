import { describe, it, expect } from 'vitest';
import { getRoleLandingPage, hasRoutePermission, PUBLIC_ROUTES } from '@/utils/rolePermissions';
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
  });
});
