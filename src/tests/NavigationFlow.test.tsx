import { describe, it, expect, vi } from 'vitest';
import { getRoleLandingPage, hasRoutePermission } from '@/utils/rolePermissions';

describe('Navigation Flow Tests', () => {
  /**
   * Test redirection from registration completion to Provider Dashboard
   * Requirements: 1.4
   */
  it('should redirect health_personnel role to provider dashboard', () => {
    const landingPage = getRoleLandingPage(['health_personnel']);
    expect(landingPage).toBe('/provider-dashboard');
  });

  /**
   * Test that health_personnel has access to provider routes
   * Requirements: 1.4
   */
  it('should allow health_personnel to access provider dashboard route', () => {
    const hasAccess = hasRoutePermission(['health_personnel'], '/provider-dashboard');
    expect(hasAccess).toBe(true);
  });

  /**
   * Test that unauthenticated users don't have access to protected routes
   * Requirements: 1.4
   */
  it('should deny access to protected routes for unauthenticated users', () => {
    const hasAccess = hasRoutePermission(null, '/provider-dashboard');
    expect(hasAccess).toBe(false);
  });

  /**
   * Test that healthcare application is publicly accessible
   * Requirements: 1.4
   */
  it('should allow public access to healthcare application route', () => {
    const hasAccess = hasRoutePermission(null, '/healthcare-application');
    expect(hasAccess).toBe(true);
  });

  /**
   * Test role-based redirection for different user roles
   * Requirements: 1.4
   */
  it('should redirect different roles to appropriate dashboards', () => {
    const testCases = [
      { roles: ['health_personnel'], expectedPath: '/provider-dashboard' },
      { roles: ['patient'], expectedPath: '/home' },
      { roles: ['admin'], expectedPath: '/admin-dashboard' },
      { roles: ['pharmacy'], expectedPath: '/pharmacy-portal' },
      { roles: ['institution_admin'], expectedPath: '/institution-portal' },
    ];

    testCases.forEach(({ roles, expectedPath }) => {
      const landingPage = getRoleLandingPage(roles);
      expect(landingPage).toBe(expectedPath);
    });
  });

  /**
   * Test that health_personnel has access to required routes
   * Requirements: 1.4
   */
  it('should allow health_personnel access to all required routes', () => {
    const requiredRoutes = [
      '/provider-dashboard',
      '/provider-portal',
      '/appointments',
      '/chat',
      '/prescriptions',
      '/profile',
      '/settings',
    ];

    requiredRoutes.forEach(route => {
      const hasAccess = hasRoutePermission(['health_personnel'], route);
      expect(hasAccess).toBe(true);
    });
  });

  /**
   * Test navigation priority for users with multiple roles
   * Requirements: 1.4
   */
  it('should prioritize admin role over health_personnel for navigation', () => {
    // User with both admin and health_personnel roles should go to admin dashboard
    const landingPage = getRoleLandingPage(['admin', 'health_personnel']);
    expect(landingPage).toBe('/admin-dashboard');
  });

  /**
   * Test that newly registered providers get correct role assignment
   * Requirements: 1.4
   */
  it('should correctly identify health_personnel role for provider registration', () => {
    // This tests the role that gets assigned during provider registration
    const providerRole = 'health_personnel';
    const landingPage = getRoleLandingPage([providerRole]);
    expect(landingPage).toBe('/provider-dashboard');
    
    // Verify they have access to provider-specific routes
    const hasProviderAccess = hasRoutePermission([providerRole], '/provider-dashboard');
    expect(hasProviderAccess).toBe(true);
  });
});