import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hasProviderDashboardAccess } from '../utils/providerAccess';

// Nurse landing-gate defect (2026-10-25, completeness browser pass):
// a facility-employed nurse (active institution_staff of a verified
// hospital, profiles.is_verified=false, no provider application) landed
// on /provider-dashboard and got "Application Under Review" — the page
// gated on profiles.is_verified ONLY. That flag is set solely by the
// independent-provider application approval (ProviderApplications.tsx)
// or an institution-applicant approval; the staff onboarding flows
// (accept_staff_invitation RPC, facility "Add staff") grant only the
// staff row + app role, so a staff clinician could NEVER open the gate
// without a separate provider application. These tests pin the fixed
// decision (src/utils/providerAccess.ts) and its wiring.

const readSrc = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

describe('provider dashboard access · the three legitimate paths', () => {
  it('independent approved provider passes (is_verified)', () => {
    expect(hasProviderDashboardAccess({
      profileIsVerified: true, applicationStatus: 'pending', hasActiveVerifiedStaffPost: false,
    })).toBe(true);
  });

  it('approved application passes even before the profile flag lands', () => {
    expect(hasProviderDashboardAccess({
      profileIsVerified: false, applicationStatus: 'approved', hasActiveVerifiedStaffPost: false,
    })).toBe(true);
  });

  it('THE FIX: active staff of a verified institution passes with no application at all', () => {
    // Exactly the fleet nurse state, modulo the staff-post input which the
    // page now computes from institution_staff + institution verification.
    expect(hasProviderDashboardAccess({
      profileIsVerified: false, applicationStatus: null, hasActiveVerifiedStaffPost: true,
    })).toBe(true);
    expect(hasProviderDashboardAccess({
      profileIsVerified: false, applicationStatus: 'pending', hasActiveVerifiedStaffPost: true,
    })).toBe(true);
  });
});

describe('provider dashboard access · the gate still gates its own case', () => {
  it('unverified independent applicant with a pending application stays gated', () => {
    expect(hasProviderDashboardAccess({
      profileIsVerified: false, applicationStatus: 'pending', hasActiveVerifiedStaffPost: false,
    })).toBe(false);
  });

  it('rejected applicant stays gated', () => {
    expect(hasProviderDashboardAccess({
      profileIsVerified: false, applicationStatus: 'rejected', hasActiveVerifiedStaffPost: false,
    })).toBe(false);
  });

  it('no signals at all stays gated', () => {
    expect(hasProviderDashboardAccess({
      profileIsVerified: false, applicationStatus: null, hasActiveVerifiedStaffPost: false,
    })).toBe(false);
  });
});

describe('provider dashboard access · wiring in ProviderDashboard.tsx', () => {
  const page = readSrc('src/pages/ProviderDashboard.tsx');

  it('the page decides through the shared helper, not profiles.role or is_verified alone', () => {
    expect(page).toContain('hasProviderDashboardAccess');
    expect(page).toContain('.from("institution_staff")');
    expect(page).toContain('.from("health_personnel_applications")');
    expect(page).toContain('.from("healthcare_institutions")');
  });

  it('the staff path requires an ACTIVE post', () => {
    expect(page).toContain('.eq("is_active", true)');
    expect(page).toContain('.eq("status", "active")');
  });
});
