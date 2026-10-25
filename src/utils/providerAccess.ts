/**
 * ProviderDashboard access decision.
 *
 * Three independent, legitimate ways a signed-in clinician reaches the
 * provider console:
 *
 *  1. Independent provider approval — the platform reviewed their
 *     health-personnel application and set `profiles.is_verified = true`
 *     (ProviderApplications approval does exactly this, and only this).
 *  2. An approved health-personnel application row
 *     (`health_personnel_applications.status = 'approved'`) — the same
 *     signal AccountApprovalGate accepts.
 *  3. Facility employment — an ACTIVE staff post (`institution_staff`
 *     is_active, or legacy `institution_personnel` status 'active') at a
 *     VERIFIED institution. Facility staff are vetted by their employer
 *     institution, which the platform itself verified. The staff
 *     onboarding flows (`accept_staff_invitation` RPC and the facility
 *     "Add staff" screen) grant exactly the staff row + the app role —
 *     they never set `profiles.is_verified` and never create a provider
 *     application, so gating staff on path 1 alone locked every
 *     facility-employed clinician whose landing page is
 *     /provider-dashboard (nurses, midwives, doctors, allied cadres…)
 *     behind an "Application Under Review" screen for an application
 *     they were never part of. (Defect found 2026-10-25, completeness
 *     browser pass: fleet nurse, active staff of a verified hospital,
 *     is_verified=false.)
 *
 * Anything else — an unverified independent applicant whose application
 * is still pending — stays gated: that review gate is legitimate for its
 * own case and this helper must keep returning false for it.
 *
 * Deliberately NOT inputs: `profiles.role` (a stale signup default —
 * never gate on it) and the staff row alone without the institution's
 * verified status (a post at a facility the platform has not approved
 * does not by itself confer provider access).
 */
export interface ProviderAccessInputs {
  /** profiles.is_verified === true (set only by application approval). */
  profileIsVerified: boolean;
  /** health_personnel_applications.status for this user, if a row exists. */
  applicationStatus: string | null;
  /** Active staff post at a verified institution (either staff table). */
  hasActiveVerifiedStaffPost: boolean;
}

export function hasProviderDashboardAccess(inputs: ProviderAccessInputs): boolean {
  if (inputs.profileIsVerified) return true;
  if (inputs.applicationStatus === 'approved') return true;
  if (inputs.hasActiveVerifiedStaffPost) return true;
  return false;
}
