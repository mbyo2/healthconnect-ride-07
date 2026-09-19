// Role-based permissions and route definitions
// Re-export from centralized config
export {
  USER_ROLES, COMMON_ROUTES, PROVIDER_CORE_ROUTES, INSTITUTION_OPERATIONAL_ROUTES,
  PUBLIC_ROUTES, ROLE_META, ROLE_PRIORITY,
  CONSULTABLE_PROVIDER_ROLES, ALL_CLINICIAN_ROLES, PRESCRIBING_ROLES,
  NURSING_ROLES, COMMUNITY_ROLES, PHARMACY_SIDE_ROLES, LAB_SIDE_ROLES,
} from '@/config/roleConfig';
export type { UserRole, RoleMeta } from '@/config/roleConfig';

import {
  USER_ROLES, COMMON_ROUTES, PROVIDER_CORE_ROUTES, INSTITUTION_OPERATIONAL_ROUTES,
  PUBLIC_ROUTES, ROLE_META, ROLE_PRIORITY,
} from '@/config/roleConfig';
import type { UserRole } from '@/config/roleConfig';

const dedupeRoutes = (routes: string[]) => [...new Set(routes)];

// ─── Per-role permissions ───────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  // ── Patient ──────────────────────────────────────────────
  [USER_ROLES.PATIENT]: dedupeRoutes([
    ...COMMON_ROUTES,
    '/symptoms',
    '/appointments',
    '/appointments/:id',
    '/appointment-reminders',
    '/chat',
    '/prescriptions',
    '/wallet',
    '/insurance-cards',
    '/cost-estimator',
    '/waitlist',
    '/emergency',
    '/healthcare-professionals',
    '/healthcare-institutions',
    '/connections',
    '/ai-diagnostics',
    '/health-analytics',
    '/emergency-response',
    '/telemedicine',
    '/map',
    '/search',
    '/medical-records',
    '/video-consultations',
    '/video-call/:roomId',
    '/health-dashboard',
    '/marketplace-users',
    '/marketplace',
    '/medications',
    '/intake-form',
    '/provider/:id',
    '/provider-profile/:id',
    '/booking-confirmed',
    '/iot-monitoring',
    '/mental-health',
    '/ar-anatomy',
  ]),

  // ── Doctor (Individual Consultant) ───────────────────────
  [USER_ROLES.DOCTOR]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/prescriptions',       // doctors can prescribe
    '/ai-diagnostics',      // clinical decision support
    '/telemedicine',
    '/medications',
    '/health-analytics',    // patient trends & outcomes
  ]),

  // ── Nurse (Solo Consultant) ──────────────────────────────
  [USER_ROLES.NURSE]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/medications',         // medication administration
    '/iot-monitoring',      // vitals monitoring
    '/health-analytics',    // patient health trends
    '/telemedicine',
  ]),

  // ── Radiologist ──────────────────────────────────────────
  [USER_ROLES.RADIOLOGIST]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/ai-diagnostics',      // imaging AI support
    '/medications',
    '/health-analytics',    // performance analytics
  ]),

  // ── Generic Health Personnel (legacy catch-all provider) ─
  [USER_ROLES.HEALTH_PERSONNEL]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/prescriptions',
    '/ai-diagnostics',
    '/telemedicine',
    '/health-analytics',
    '/medications',
    '/compliance-audit',
    // NOTE: removed pharmacy-portal, pharmacy-inventory, pharmacy-management,
    //       hospital-management, lab-management — those belong to their own roles
  ]),

  // ── Pharmacist (individual) ──────────────────────────────
  [USER_ROLES.PHARMACIST]: dedupeRoutes([
    ...COMMON_ROUTES,
    '/pharmacy-portal',
    '/pharmacy-inventory',
    '/pharmacy-management',
    '/prescriptions',
    '/wallet',
    '/marketplace',
    '/map',
    '/search',
    '/chat',
    '/medications',
    '/connections',         // customer records
  ]),

  // ── Pharmacy (business entity) ───────────────────────────
  [USER_ROLES.PHARMACY]: dedupeRoutes([
    ...COMMON_ROUTES,
    '/pharmacy-portal',
    '/pharmacy-inventory',
    '/pharmacy-management',
    '/prescriptions',
    '/wallet',
    '/marketplace',
    '/map',
    '/search',
    '/chat',
    '/medications',
    '/connections',         // customer records
  ]),

  // ── Lab Technician ───────────────────────────────────────
  [USER_ROLES.LAB_TECHNICIAN]: dedupeRoutes([
    ...COMMON_ROUTES,
    '/lab-management',
    '/ai-diagnostics',
    '/wallet',
    '/map',
    '/search',
    '/chat',
    '/medical-records',
    '/medications',
    '/connections',         // patient lookup
  ]),

  // ── Lab (business entity) ────────────────────────────────
  [USER_ROLES.LAB]: dedupeRoutes([
    ...COMMON_ROUTES,
    '/lab-management',
    '/ai-diagnostics',
    '/wallet',
    '/map',
    '/search',
    '/chat',
    '/medications',
    '/medical-records',     // results & reports
    '/connections',         // patient records
  ]),

  // ── Institution Admin ────────────────────────────────────
  [USER_ROLES.INSTITUTION_ADMIN]: dedupeRoutes([
    ...COMMON_ROUTES,
    '/institution-portal',
    '/institution-dashboard',
    '/institution-registration',
    '/institution-status',
    '/institution/personnel',
    '/institution/patients',
    '/institution/reports',
    '/institution/appointments',
    '/institution/settings',
    '/institution/devices',
    '/appointments',
    '/appointments/:id',
    '/chat',
    '/wallet',
    '/map',
    '/search',
    '/healthcare-institutions',
    '/hospital-management',
    '/pharmacy-inventory',     // medical supplies inventory
    '/medications',
  ]),

  // ── Institution Staff ────────────────────────────────────
  [USER_ROLES.INSTITUTION_STAFF]: dedupeRoutes([
    ...COMMON_ROUTES,
    '/institution-portal',
    '/institution-dashboard',
    '/institution/patients',
    '/institution/personnel',
    '/institution/reports',
    '/institution/appointments',
    '/institution/devices',
    '/appointments',
    '/appointments/:id',
    '/wallet',
    '/medical-records',
    '/hospital-management',
    '/pharmacy-inventory',
    '/medications',
  ]),

  // ── Admin ────────────────────────────────────────────────
  [USER_ROLES.ADMIN]: dedupeRoutes([
    ...COMMON_ROUTES,
    '/admin-dashboard',
    '/wallet',
    '/admin-wallet',
    '/compliance-audit',
    '/healthcare-application',
    '/hospital-management',
    '/pharmacy-management',
    '/lab-management',
    '/ai-diagnostics',
    '/advanced-dashboard',
    '/health-analytics',
    '/emergency-response',
    '/medications',
    '/provider-calendar',
    '/testing',
    '/documentation',
  ]),

  // ── Support ──────────────────────────────────────────────
  [USER_ROLES.SUPPORT]: dedupeRoutes([
    ...COMMON_ROUTES,
    '/admin-dashboard',
    '/chat',
    '/search',
    '/healthcare-application',
    '/medical-records',     // view patient records for support
    '/appointments',        // view appointments for support
  ]),

  // ── Medical Licentiate Practitioner (degree clinician, HPCZ) ──
  [USER_ROLES.MEDICAL_LICENTIATE]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/prescriptions',       // licensed to prescribe
    '/ai-diagnostics',      // clinical decision support
    '/telemedicine',
    '/medications',
    '/health-analytics',
  ]),

  // ── Clinical Officer General (HPCZ — primary-care backbone) ──
  [USER_ROLES.CLINICAL_OFFICER]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/prescriptions',       // licensed to prescribe
    '/ai-diagnostics',
    '/telemedicine',
    '/medications',
    '/health-analytics',
  ]),

  // ── Dentist / Dental Surgeon (HPCZ) ──────────────────────────
  [USER_ROLES.DENTIST]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/prescriptions',
    '/ai-diagnostics',
    '/telemedicine',
    '/medications',
    '/health-analytics',
  ]),

  // ── Dental Therapist / Hygienist (HPCZ) ──────────────────────
  [USER_ROLES.DENTAL_THERAPIST]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/telemedicine',
    '/health-analytics',
    '/medications',
  ]),

  // ── Registered Nurse (NMCZ) ──────────────────────────────────
  [USER_ROLES.REGISTERED_NURSE]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/medications',         // medication administration
    '/iot-monitoring',      // vitals monitoring
    '/health-analytics',
    '/telemedicine',
  ]),

  // ── Enrolled Nurse (NMCZ) ────────────────────────────────────
  [USER_ROLES.ENROLLED_NURSE]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/medications',
    '/iot-monitoring',
    '/health-analytics',
    '/telemedicine',
  ]),

  // ── Midwife — registered/enrolled (NMCZ) ─────────────────────
  [USER_ROLES.MIDWIFE]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/medications',
    '/iot-monitoring',
    '/health-analytics',
    '/telemedicine',
  ]),

  // ── Pharmacy Technologist / Dispenser (HPCZ) ─────────────────
  [USER_ROLES.PHARMACY_TECHNOLOGIST]: dedupeRoutes([
    ...COMMON_ROUTES,
    '/pharmacy-portal',
    '/pharmacy-inventory',
    '/pharmacy-management',
    '/prescriptions',
    '/wallet',
    '/marketplace',
    '/map',
    '/search',
    '/chat',
    '/medications',
    '/connections',
  ]),

  // ── Wholesale Pharmacy (ZAMRA-licensed distributor) ──────────
  // B2B supply only — no direct patient dispensing, no prescriptions.
  [USER_ROLES.WHOLESALE_PHARMACY]: dedupeRoutes([
    ...COMMON_ROUTES,
    '/pharmacy-inventory',
    '/pharmacy-management',
    '/marketplace',
    '/wallet',
    '/map',
    '/search',
    '/chat',
    '/medications',
    '/connections',
  ]),

  // ── Radiographer / Imaging Technologist (HPCZ) ───────────────
  [USER_ROLES.RADIOGRAPHER]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/ai-diagnostics',      // imaging AI support
    '/health-analytics',
    '/telemedicine',        // teleradiology
  ]),

  // ── Physiotherapist (HPCZ) ───────────────────────────────────
  [USER_ROLES.PHYSIOTHERAPIST]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/telemedicine',        // telerehabilitation
    '/health-analytics',
    '/iot-monitoring',      // rehab / activity monitoring
  ]),

  // ── Occupational Therapist (HPCZ) ────────────────────────────
  [USER_ROLES.OCCUPATIONAL_THERAPIST]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/telemedicine',
    '/health-analytics',
  ]),

  // ── Nutritionist & Dietician (HPCZ) ──────────────────────────
  [USER_ROLES.NUTRITIONIST]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/telemedicine',
    '/health-analytics',
  ]),

  // ── Optometrist / Optician (HPCZ) ────────────────────────────
  [USER_ROLES.OPTOMETRIST]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/telemedicine',
    '/health-analytics',
  ]),

  // ── Clinical Psychologist (HPCZ) ─────────────────────────────
  [USER_ROLES.PSYCHOLOGIST]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/telemedicine',        // telecounselling
    '/health-analytics',
  ]),

  // ── Environmental Health Officer (HPCZ) ──────────────────────
  [USER_ROLES.ENVIRONMENTAL_HEALTH_OFFICER]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/telemedicine',
    '/health-analytics',
  ]),

  // ── Community Health Worker / Assistant ──────────────────────
  [USER_ROLES.COMMUNITY_HEALTH_WORKER]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/symptoms',            // household screening
    '/telemedicine',
    '/health-analytics',
  ]),

  // ── Traditional Practitioner (THPCZ-registered) ──────────────
  // Consults + records + referrals only — no orthodox prescribing.
  [USER_ROLES.TRADITIONAL_PRACTITIONER]: dedupeRoutes([
    ...COMMON_ROUTES,
    ...PROVIDER_CORE_ROUTES,
    '/symptoms',
    '/telemedicine',
  ]),

  // ── Medical Records / Health Information Officer ─────────────
  [USER_ROLES.MEDICAL_RECORDS_OFFICER]: dedupeRoutes([
    ...INSTITUTION_OPERATIONAL_ROUTES,
    '/medical-records',
    '/wallet',
  ]),

  // ── Super Admin (everything) ─────────────────────────────
  [USER_ROLES.SUPER_ADMIN]: dedupeRoutes([
    ...COMMON_ROUTES,
    '/symptoms',
    '/appointments',
    '/appointments/:id',
    '/chat',
    '/prescriptions',
    '/wallet',
    '/emergency',
    '/healthcare-professionals',
    '/healthcare-institutions',
    '/connections',
    '/ai-diagnostics',
    '/iot-monitoring',
    '/health-analytics',
    '/telemedicine',
    '/blockchain-records',
    '/ar-anatomy',
    '/mental-health',
    '/genomic-analysis',
    '/smart-contracts',
    '/quantum-encryption',
    '/map',
    '/search',
    '/medical-records',
    '/video-consultations',
    '/health-dashboard',
    '/marketplace-users',
    '/marketplace',
    '/provider-dashboard',
    '/provider-portal',
    '/pharmacy-portal',
    '/pharmacy-inventory',
    '/compliance-audit',
    '/healthcare-application',
    '/lab-management',
    '/institution-portal',
    '/hospital-management',
    '/pharmacy-management',
    '/admin-dashboard',
    '/super-admin-dashboard',
    '/admin-wallet',
    '/create-admin',
    '/advanced-dashboard',
    '/emergency-response',
    '/medications',
    '/provider-calendar',
    '/testing',
    '/documentation',
    '/role-management',
  ])
};

// New role permissions (INSTITUTION_OPERATIONAL_ROUTES imported from config)

ROLE_PERMISSIONS[USER_ROLES.RECEPTIONIST] = dedupeRoutes([
  ...INSTITUTION_OPERATIONAL_ROUTES,
  '/appointments',
  '/appointments/:id',
]);

ROLE_PERMISSIONS[USER_ROLES.HR_MANAGER] = dedupeRoutes([
  ...INSTITUTION_OPERATIONAL_ROUTES,
  '/institution/personnel',
  '/institution/reports',
  '/institution/settings',
  '/wallet',
]);

ROLE_PERMISSIONS[USER_ROLES.CXO] = dedupeRoutes([
  ...INSTITUTION_OPERATIONAL_ROUTES,
  '/institution/reports',
  '/institution/personnel',
  '/institution/settings',
  '/institution/devices',
  '/hospital-management',
  '/wallet',
  '/admin-wallet',
  '/health-analytics',
  '/advanced-dashboard',
  '/compliance-audit',
]);

ROLE_PERMISSIONS[USER_ROLES.OT_STAFF] = dedupeRoutes([
  ...COMMON_ROUTES,
  '/institution-dashboard',
  '/appointments',
  '/appointments/:id',
  '/medical-records',
  '/chat',
  '/emergency',
]);

ROLE_PERMISSIONS[USER_ROLES.PHLEBOTOMIST] = dedupeRoutes([
  ...COMMON_ROUTES,
  '/lab-management',
  '/medical-records',
  '/connections',
  '/map',
  '/search',
  '/chat',
]);

ROLE_PERMISSIONS[USER_ROLES.BILLING_STAFF] = dedupeRoutes([
  ...INSTITUTION_OPERATIONAL_ROUTES,
  '/wallet',
  '/institution/reports',
  '/prescriptions',
]);

ROLE_PERMISSIONS[USER_ROLES.INVENTORY_MANAGER] = dedupeRoutes([
  ...INSTITUTION_OPERATIONAL_ROUTES,
  '/pharmacy-inventory',
  '/institution/reports',
  '/medications',
]);

ROLE_PERMISSIONS[USER_ROLES.TRIAGE_STAFF] = dedupeRoutes([
  ...COMMON_ROUTES,
  '/institution-dashboard',
  '/appointments',
  '/appointments/:id',
  '/medical-records',
  '/emergency',
  '/chat',
  '/search',
]);

ROLE_PERMISSIONS[USER_ROLES.MAINTENANCE_MANAGER] = dedupeRoutes([
  ...INSTITUTION_OPERATIONAL_ROUTES,
  '/institution/devices',
  '/institution/reports',
  '/institution/settings',
]);

ROLE_PERMISSIONS[USER_ROLES.SPECIALIST] = dedupeRoutes([
  ...COMMON_ROUTES,
  ...PROVIDER_CORE_ROUTES,
  '/prescriptions',
  '/ai-diagnostics',
  '/telemedicine',
  '/health-analytics',
  '/medications',
]);

ROLE_PERMISSIONS[USER_ROLES.AMBULANCE_STAFF] = dedupeRoutes([
  ...COMMON_ROUTES,
  '/institution-dashboard',
  '/emergency',
  '/emergency-response',
  '/map',
  '/chat',
  '/appointments',
]);

ROLE_PERMISSIONS[USER_ROLES.PATHOLOGIST] = dedupeRoutes([
  ...COMMON_ROUTES,
  '/lab-management',
  '/medical-records',
  '/connections',
  '/wallet',
  '/map',
  '/search',
  '/ai-diagnostics',
]);

Object.keys(ROLE_PERMISSIONS).forEach(role => {
  ROLE_PERMISSIONS[role] = dedupeRoutes(ROLE_PERMISSIONS[role] || []);
});

// Default landing pages for each role
export const ROLE_LANDING_PAGES: Record<string, string> = {
  [USER_ROLES.PATIENT]: '/home',
  [USER_ROLES.HEALTH_PERSONNEL]: '/provider-dashboard',
  [USER_ROLES.ADMIN]: '/admin-dashboard',
  [USER_ROLES.LAB]: '/lab-management',
  [USER_ROLES.PHARMACY]: '/pharmacy-portal',
  [USER_ROLES.INSTITUTION_ADMIN]: '/institution-portal',
  [USER_ROLES.INSTITUTION_STAFF]: '/institution-dashboard',
  [USER_ROLES.SUPER_ADMIN]: '/super-admin-dashboard',
  [USER_ROLES.SUPPORT]: '/admin-dashboard',
  [USER_ROLES.DOCTOR]: '/provider-dashboard',
  [USER_ROLES.SPECIALIST]: '/provider-dashboard',
  [USER_ROLES.MEDICAL_LICENTIATE]: '/provider-dashboard',
  [USER_ROLES.CLINICAL_OFFICER]: '/provider-dashboard',
  [USER_ROLES.DENTIST]: '/provider-dashboard',
  [USER_ROLES.DENTAL_THERAPIST]: '/provider-dashboard',
  [USER_ROLES.NURSE]: '/provider-dashboard',
  [USER_ROLES.REGISTERED_NURSE]: '/provider-dashboard',
  [USER_ROLES.ENROLLED_NURSE]: '/provider-dashboard',
  [USER_ROLES.MIDWIFE]: '/provider-dashboard',
  [USER_ROLES.RADIOLOGIST]: '/provider-dashboard',
  [USER_ROLES.RADIOGRAPHER]: '/provider-dashboard',
  [USER_ROLES.PHYSIOTHERAPIST]: '/provider-dashboard',
  [USER_ROLES.OCCUPATIONAL_THERAPIST]: '/provider-dashboard',
  [USER_ROLES.NUTRITIONIST]: '/provider-dashboard',
  [USER_ROLES.OPTOMETRIST]: '/provider-dashboard',
  [USER_ROLES.PSYCHOLOGIST]: '/provider-dashboard',
  [USER_ROLES.ENVIRONMENTAL_HEALTH_OFFICER]: '/provider-dashboard',
  [USER_ROLES.COMMUNITY_HEALTH_WORKER]: '/provider-dashboard',
  [USER_ROLES.TRADITIONAL_PRACTITIONER]: '/provider-dashboard',
  [USER_ROLES.PHARMACIST]: '/pharmacy-portal',
  [USER_ROLES.PHARMACY_TECHNOLOGIST]: '/pharmacy-portal',
  [USER_ROLES.WHOLESALE_PHARMACY]: '/pharmacy-portal',
  [USER_ROLES.LAB_TECHNICIAN]: '/lab-management',
  [USER_ROLES.MEDICAL_RECORDS_OFFICER]: '/institution-dashboard',
  [USER_ROLES.RECEPTIONIST]: '/institution-dashboard',
  [USER_ROLES.HR_MANAGER]: '/institution-dashboard',
  [USER_ROLES.CXO]: '/institution-dashboard',
  [USER_ROLES.OT_STAFF]: '/institution-dashboard',
  [USER_ROLES.PHLEBOTOMIST]: '/lab-management',
  [USER_ROLES.BILLING_STAFF]: '/institution-dashboard',
  [USER_ROLES.INVENTORY_MANAGER]: '/institution-dashboard',
  [USER_ROLES.TRIAGE_STAFF]: '/institution-dashboard',
  [USER_ROLES.MAINTENANCE_MANAGER]: '/institution-dashboard',
  [USER_ROLES.SPECIALIST]: '/provider-dashboard',
  [USER_ROLES.AMBULANCE_STAFF]: '/institution-dashboard',
  [USER_ROLES.PATHOLOGIST]: '/lab-management',
};

// PUBLIC_ROUTES imported from config

// Check if a user has permission to access a route (supports multiple roles)
export const hasRoutePermission = (userRoles: UserRole[] | null, route: string): boolean => {
  if (!userRoles || userRoles.length === 0) return PUBLIC_ROUTES.includes(route);

  // Super admin has access to everything
  if (userRoles.includes(USER_ROLES.SUPER_ADMIN)) return true;

  // Check if any of the user's roles has permission for this route
  return userRoles.some(role => {
    const permissions = ROLE_PERMISSIONS[role] || [];

    // Exact match
    if (permissions.includes(route)) return true;

    // Dynamic route match (e.g., /appointments/:id)
    return permissions.some(p => {
      if (p.includes(':')) {
        const pattern = p.split('/:')[0];
        return route.startsWith(pattern + '/');
      }
      return false;
    });
  });
};

// Check if user has a specific role
export const hasRole = (userRoles: UserRole[] | null, role: UserRole): boolean => {
  if (!userRoles) return false;
  return userRoles.includes(role);
};

// Check if user has any of the specified roles
export const hasAnyRole = (userRoles: UserRole[] | null, roles: UserRole[]): boolean => {
  if (!userRoles) return false;
  return roles.some(role => userRoles.includes(role));
};

// Get the appropriate landing page based on user's primary role
export const getRoleLandingPage = (userRoles: UserRole[] | null): string => {
  if (!userRoles || userRoles.length === 0) return '/auth';

  // Priority order: admin > pharmacy/lab (specific portals) > institution_admin > clinical providers > patient
  if (userRoles.includes(USER_ROLES.SUPER_ADMIN)) return '/admin-dashboard';
  if (userRoles.includes(USER_ROLES.ADMIN)) return '/admin-dashboard';
  if (userRoles.includes(USER_ROLES.CXO)) return '/institution-dashboard';

  // Specific institution portals FIRST (before generic institution_admin)
  if (userRoles.includes(USER_ROLES.PHARMACY) || userRoles.includes(USER_ROLES.PHARMACIST) || userRoles.includes(USER_ROLES.PHARMACY_TECHNOLOGIST) || userRoles.includes(USER_ROLES.WHOLESALE_PHARMACY)) return '/pharmacy-portal';
  if (userRoles.includes(USER_ROLES.LAB) || userRoles.includes(USER_ROLES.LAB_TECHNICIAN)) return '/lab-management';
  if (userRoles.includes(USER_ROLES.PATHOLOGIST) || userRoles.includes(USER_ROLES.PHLEBOTOMIST)) return '/lab-management';

  // Generic institution admin/staff routes
  // Institution admins should land on the institution portal (not the dashboard)
  if (userRoles.includes(USER_ROLES.INSTITUTION_ADMIN)) return '/institution-portal';
  if (userRoles.includes(USER_ROLES.INSTITUTION_STAFF)) return '/institution-dashboard';
  if (userRoles.includes(USER_ROLES.MEDICAL_RECORDS_OFFICER)) return '/institution-dashboard';
  if (userRoles.includes(USER_ROLES.RECEPTIONIST)) return '/institution-dashboard';
  if (userRoles.includes(USER_ROLES.HR_MANAGER)) return '/institution-dashboard';
  if (userRoles.includes(USER_ROLES.BILLING_STAFF)) return '/institution-dashboard';
  if (userRoles.includes(USER_ROLES.TRIAGE_STAFF)) return '/institution-dashboard';
  if (userRoles.includes(USER_ROLES.OT_STAFF)) return '/institution-dashboard';
  if (userRoles.includes(USER_ROLES.MAINTENANCE_MANAGER)) return '/institution-dashboard';
  if (userRoles.includes(USER_ROLES.INVENTORY_MANAGER)) return '/institution-dashboard';
  if (userRoles.includes(USER_ROLES.AMBULANCE_STAFF)) return '/institution-dashboard';

  // Clinical providers (any consultable/allied/community cadre or legacy catch-all)
  if (
    userRoles.includes(USER_ROLES.HEALTH_PERSONNEL) ||
    userRoles.includes(USER_ROLES.DOCTOR) ||
    userRoles.includes(USER_ROLES.SPECIALIST) ||
    userRoles.includes(USER_ROLES.MEDICAL_LICENTIATE) ||
    userRoles.includes(USER_ROLES.CLINICAL_OFFICER) ||
    userRoles.includes(USER_ROLES.DENTIST) ||
    userRoles.includes(USER_ROLES.DENTAL_THERAPIST) ||
    userRoles.includes(USER_ROLES.NURSE) ||
    userRoles.includes(USER_ROLES.REGISTERED_NURSE) ||
    userRoles.includes(USER_ROLES.ENROLLED_NURSE) ||
    userRoles.includes(USER_ROLES.MIDWIFE) ||
    userRoles.includes(USER_ROLES.RADIOLOGIST) ||
    userRoles.includes(USER_ROLES.RADIOGRAPHER) ||
    userRoles.includes(USER_ROLES.PHYSIOTHERAPIST) ||
    userRoles.includes(USER_ROLES.OCCUPATIONAL_THERAPIST) ||
    userRoles.includes(USER_ROLES.NUTRITIONIST) ||
    userRoles.includes(USER_ROLES.OPTOMETRIST) ||
    userRoles.includes(USER_ROLES.PSYCHOLOGIST) ||
    userRoles.includes(USER_ROLES.ENVIRONMENTAL_HEALTH_OFFICER) ||
    userRoles.includes(USER_ROLES.COMMUNITY_HEALTH_WORKER) ||
    userRoles.includes(USER_ROLES.TRADITIONAL_PRACTITIONER)
  ) return '/provider-dashboard';
  if (userRoles.includes(USER_ROLES.PATIENT)) return '/home';

  return '/home';
};

// Get navigation items based on user's roles (supports multiple roles)
export const getRoleNavigation = (userRoles: UserRole[] | null) => {
  // Derived from the taxonomy — never a hardcoded list, so new roles are
  // automatically included in base navigation.
  const allRoles = Object.values(USER_ROLES);
  const baseNavigation = [
    { path: '/profile', label: 'Profile', icon: 'User', roles: allRoles },
    { path: '/settings', label: 'Settings', icon: 'Settings', roles: allRoles }
  ];

  const allNavigationItems = [
    // ── Patient-only routes ──
    { path: '/symptoms', label: 'Symptoms', icon: 'Heart', roles: ['patient', 'super_admin'] },
    { path: '/healthcare-professionals', label: 'Find Providers', icon: 'Search', roles: ['patient', 'super_admin'] },
    { path: '/connections', label: 'My Providers', icon: 'Users', roles: ['patient', 'super_admin'] },
    { path: '/marketplace-users', label: 'Healthcare Marketplace', icon: 'ShoppingCart', roles: ['patient', 'super_admin'] },
    { path: '/health-dashboard', label: 'Health Dashboard', icon: 'LayoutDashboard', roles: ['patient', 'super_admin'] },

    // ── Shared patient + provider routes ──
    // (clinical/allied/community cadres included via spread groups below)
    { path: '/appointments', label: 'Appointments', icon: 'Calendar', roles: ['patient', 'health_personnel', 'doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist', 'dental_therapist', 'nurse', 'registered_nurse', 'enrolled_nurse', 'midwife', 'radiologist', 'radiographer', 'physiotherapist', 'occupational_therapist', 'nutritionist', 'optometrist', 'psychologist', 'environmental_health_officer', 'community_health_worker', 'traditional_practitioner', 'institution_admin', 'institution_staff', 'medical_records_officer', 'super_admin'] },
    { path: '/chat', label: 'Messages', icon: 'MessageCircle', roles: ['patient', 'health_personnel', 'doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist', 'nurse', 'registered_nurse', 'enrolled_nurse', 'midwife', 'radiologist', 'psychologist', 'community_health_worker', 'admin', 'institution_admin', 'institution_staff', 'medical_records_officer', 'super_admin'] },
    { path: '/prescriptions', label: 'Prescriptions', icon: 'Pill', roles: ['patient', 'health_personnel', 'doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist', 'pharmacy', 'pharmacist', 'pharmacy_technologist', 'super_admin'] },
    { path: '/map', label: 'Map', icon: 'MapPin', roles: ['patient', 'health_personnel', 'doctor', 'nurse', 'registered_nurse', 'enrolled_nurse', 'midwife', 'radiologist', 'community_health_worker', 'environmental_health_officer', 'pharmacy', 'pharmacist', 'wholesale_pharmacy', 'lab', 'lab_technician', 'admin', 'super_admin'] },
    { path: '/wallet', label: 'Wallet', icon: 'Wallet', roles: ['patient', 'health_personnel', 'doctor', 'nurse', 'registered_nurse', 'radiologist', 'pharmacy', 'pharmacist', 'wholesale_pharmacy', 'lab', 'lab_technician', 'super_admin'] },
    { path: '/emergency', label: 'Emergency', icon: 'AlertTriangle', roles: ['patient', 'health_personnel', 'doctor', 'nurse', 'registered_nurse', 'midwife', 'clinical_officer', 'community_health_worker', 'super_admin'] },
    { path: '/medical-records', label: 'Medical Records', icon: 'FileText', roles: ['patient', 'health_personnel', 'doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist', 'nurse', 'registered_nurse', 'enrolled_nurse', 'midwife', 'radiologist', 'radiographer', 'lab_technician', 'medical_records_officer', 'super_admin'] },
    { path: '/video-consultations', label: 'Video Consultations', icon: 'Video', roles: ['patient', 'health_personnel', 'doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist', 'nurse', 'registered_nurse', 'enrolled_nurse', 'midwife', 'radiologist', 'psychologist', 'nutritionist', 'physiotherapist', 'super_admin'] },
    { path: '/medications', label: 'Medications', icon: 'Pill', roles: ['patient', 'nurse', 'registered_nurse', 'enrolled_nurse', 'midwife', 'doctor', 'clinical_officer', 'pharmacy', 'pharmacist', 'pharmacy_technologist', 'wholesale_pharmacy', 'super_admin'] },

    // ── AI & advanced (clinical roles only) ──
    { path: '/ai-diagnostics', label: 'AI Diagnostics', icon: 'Brain', roles: ['health_personnel', 'doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist', 'radiologist', 'radiographer', 'admin', 'super_admin'] },
    { path: '/health-analytics', label: 'Health Analytics', icon: 'BarChart3', roles: ['patient', 'health_personnel', 'doctor', 'specialist', 'nurse', 'registered_nurse', 'midwife', 'clinical_officer', 'physiotherapist', 'admin', 'super_admin'] },
    { path: '/iot-monitoring', label: 'IoT Monitoring', icon: 'Activity', roles: ['patient', 'nurse', 'registered_nurse', 'enrolled_nurse', 'midwife', 'physiotherapist', 'admin', 'super_admin'] },
    { path: '/emergency-response', label: 'Emergency Response', icon: 'AlertTriangle', roles: ['patient', 'health_personnel', 'doctor', 'nurse', 'registered_nurse', 'clinical_officer', 'admin', 'super_admin'] },

    // ── Provider routes (all consultable cadres + legacy catch-all) ──
    { path: '/provider-dashboard', label: 'Dashboard', icon: 'LayoutDashboard', roles: ['health_personnel', 'doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist', 'dental_therapist', 'nurse', 'registered_nurse', 'enrolled_nurse', 'midwife', 'radiologist', 'radiographer', 'physiotherapist', 'occupational_therapist', 'nutritionist', 'optometrist', 'psychologist', 'environmental_health_officer', 'community_health_worker', 'traditional_practitioner', 'super_admin'] },
    { path: '/provider-portal', label: 'Provider Portal', icon: 'Building2', roles: ['health_personnel', 'doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist', 'nurse', 'registered_nurse', 'midwife', 'super_admin'] },
    { path: '/provider-calendar', label: 'Schedule', icon: 'Calendar', roles: ['health_personnel', 'doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist', 'nurse', 'registered_nurse', 'enrolled_nurse', 'midwife', 'radiologist', 'super_admin'] },

    // ── Pharmacy routes (retail, wholesale, professionals) ──
    { path: '/pharmacy-portal', label: 'Pharmacy Portal', icon: 'Building2', roles: ['pharmacy', 'wholesale_pharmacy', 'pharmacist', 'pharmacy_technologist', 'institution_admin', 'super_admin'] },
    { path: '/pharmacy-management', label: 'Pharmacy Management', icon: 'Pill', roles: ['pharmacy', 'wholesale_pharmacy', 'pharmacist', 'pharmacy_technologist', 'institution_admin', 'super_admin'] },
    { path: '/pharmacy-inventory', label: 'Inventory', icon: 'Package', roles: ['pharmacy', 'wholesale_pharmacy', 'pharmacist', 'pharmacy_technologist', 'institution_admin', 'institution_staff', 'super_admin'] },

    // ── Lab routes (lab/lab_technician) ──
    { path: '/lab-management', label: 'Lab Management', icon: 'FlaskConical', roles: ['lab', 'lab_technician', 'pathologist', 'phlebotomist', 'institution_admin', 'admin', 'super_admin'] },

    // ── Hospital/Clinic/Nursing Home routes ──
    { path: '/hospital-management', label: 'Hospital Management', icon: 'Building', roles: ['admin', 'institution_admin', 'institution_staff', 'super_admin'] },

    // ── General Institution routes ──
    { path: '/institution-dashboard', label: 'Institution Dashboard', icon: 'LayoutDashboard', roles: ['institution_admin', 'institution_staff', 'medical_records_officer', 'cxo', 'receptionist', 'hr_manager', 'billing_staff', 'triage_staff', 'ot_staff', 'maintenance_manager', 'inventory_manager', 'ambulance_staff', 'super_admin'] },
    { path: '/institution/personnel', label: 'Personnel', icon: 'Users', roles: ['institution_admin', 'institution_staff', 'hr_manager', 'super_admin'] },
    { path: '/institution/patients', label: 'Patients', icon: 'Users', roles: ['institution_admin', 'institution_staff', 'super_admin'] },
    { path: '/institution/reports', label: 'Reports', icon: 'BarChart', roles: ['institution_admin', 'institution_staff', 'cxo', 'billing_staff', 'super_admin'] },
    { path: '/institution/appointments', label: 'Appointments', icon: 'Calendar', roles: ['institution_admin', 'institution_staff', 'receptionist', 'triage_staff', 'super_admin'] },
    { path: '/institution/settings', label: 'Settings', icon: 'Settings', roles: ['institution_admin', 'super_admin'] },

    // ── Admin routes ──
    { path: '/admin-dashboard', label: 'Admin Dashboard', icon: 'LayoutDashboard', roles: ['admin', 'support', 'super_admin'] },
    { path: '/super-admin-dashboard', label: 'Super Admin', icon: 'Shield', roles: ['super_admin'] },
    { path: '/create-admin', label: 'Create Admin', icon: 'UserPlus', roles: ['super_admin'] },
    { path: '/admin-wallet', label: 'Admin Wallet', icon: 'Wallet', roles: ['admin', 'super_admin'] },
    { path: '/compliance-audit', label: 'Compliance', icon: 'FileCheck', roles: ['admin', 'health_personnel', 'super_admin'] },
    { path: '/pharmacy-management', label: 'Pharmacy Management', icon: 'Pill', roles: ['admin', 'pharmacy', 'pharmacist', 'super_admin'] },

    ...baseNavigation
  ];

  if (!userRoles || userRoles.length === 0) {
    return baseNavigation;
  }

  // Super admin gets everything
  if (userRoles.includes(USER_ROLES.SUPER_ADMIN)) {
    return allNavigationItems;
  }

  // Filter navigation items based on user's roles
  return allNavigationItems.filter(item =>
    item.roles.some(role => userRoles.includes(role as UserRole))
  );
};
