/**
 * Centralized role configuration — single source of truth for all role metadata.
 * Import from here instead of scattering role strings across the codebase.
 */

// ─── Role identifiers ──────────────────────────────────────────────
export const USER_ROLES = {
  PATIENT: 'patient',
  HEALTH_PERSONNEL: 'health_personnel',
  PHARMACY: 'pharmacy',
  INSTITUTION_ADMIN: 'institution_admin',
  INSTITUTION_STAFF: 'institution_staff',
  ADMIN: 'admin',
  LAB: 'lab',
  SUPER_ADMIN: 'super_admin',
  SUPPORT: 'support',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  RADIOLOGIST: 'radiologist',
  PHARMACIST: 'pharmacist',
  LAB_TECHNICIAN: 'lab_technician',
  RECEPTIONIST: 'receptionist',
  HR_MANAGER: 'hr_manager',
  CXO: 'cxo',
  OT_STAFF: 'ot_staff',
  PHLEBOTOMIST: 'phlebotomist',
  BILLING_STAFF: 'billing_staff',
  INVENTORY_MANAGER: 'inventory_manager',
  TRIAGE_STAFF: 'triage_staff',
  MAINTENANCE_MANAGER: 'maintenance_manager',
  SPECIALIST: 'specialist',
  AMBULANCE_STAFF: 'ambulance_staff',
  PATHOLOGIST: 'pathologist',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// ─── Role display metadata ─────────────────────────────────────────
export interface RoleMeta {
  label: string;
  icon: string;            // lucide icon name
  category: 'clinical' | 'institution' | 'admin' | 'patient' | 'lab' | 'pharmacy';
  landingPage: string;
}

export const ROLE_META: Record<UserRole, RoleMeta> = {
  [USER_ROLES.PATIENT]:             { label: 'Patient',             icon: 'User',            category: 'patient',     landingPage: '/home' },
  [USER_ROLES.DOCTOR]:              { label: 'Doctor',              icon: 'Stethoscope',     category: 'clinical',    landingPage: '/provider-dashboard' },
  [USER_ROLES.NURSE]:               { label: 'Nurse',               icon: 'Heart',           category: 'clinical',    landingPage: '/provider-dashboard' },
  [USER_ROLES.SPECIALIST]:          { label: 'Specialist',          icon: 'Award',           category: 'clinical',    landingPage: '/provider-dashboard' },
  [USER_ROLES.RADIOLOGIST]:         { label: 'Radiologist',         icon: 'Scan',            category: 'clinical',    landingPage: '/provider-dashboard' },
  [USER_ROLES.HEALTH_PERSONNEL]:    { label: 'Health Personnel',    icon: 'UserCheck',       category: 'clinical',    landingPage: '/provider-dashboard' },
  [USER_ROLES.PHARMACIST]:          { label: 'Pharmacist',          icon: 'Pill',            category: 'pharmacy',    landingPage: '/pharmacy-portal' },
  [USER_ROLES.PHARMACY]:            { label: 'Pharmacy',            icon: 'Building2',       category: 'pharmacy',    landingPage: '/pharmacy-portal' },
  [USER_ROLES.LAB_TECHNICIAN]:      { label: 'Lab Technician',      icon: 'FlaskConical',    category: 'lab',         landingPage: '/lab-management' },
  [USER_ROLES.LAB]:                 { label: 'Laboratory',          icon: 'FlaskConical',    category: 'lab',         landingPage: '/lab-management' },
  [USER_ROLES.PHLEBOTOMIST]:        { label: 'Phlebotomist',        icon: 'Droplet',         category: 'lab',         landingPage: '/lab-management' },
  [USER_ROLES.PATHOLOGIST]:         { label: 'Pathologist',          icon: 'Microscope',      category: 'lab',         landingPage: '/lab-management' },
  [USER_ROLES.INSTITUTION_ADMIN]:   { label: 'Institution Admin',   icon: 'Building',        category: 'institution', landingPage: '/institution-portal' },
  [USER_ROLES.INSTITUTION_STAFF]:   { label: 'Institution Staff',   icon: 'Building',        category: 'institution', landingPage: '/institution-dashboard' },
  [USER_ROLES.RECEPTIONIST]:        { label: 'Receptionist',        icon: 'Phone',           category: 'institution', landingPage: '/institution-dashboard' },
  [USER_ROLES.HR_MANAGER]:          { label: 'HR Manager',          icon: 'Users',           category: 'institution', landingPage: '/institution-dashboard' },
  [USER_ROLES.CXO]:                 { label: 'CXO',                 icon: 'Crown',           category: 'institution', landingPage: '/institution-dashboard' },
  [USER_ROLES.OT_STAFF]:            { label: 'OT Staff',            icon: 'Scissors',        category: 'institution', landingPage: '/institution-dashboard' },
  [USER_ROLES.BILLING_STAFF]:       { label: 'Billing Staff',       icon: 'Receipt',         category: 'institution', landingPage: '/institution-dashboard' },
  [USER_ROLES.INVENTORY_MANAGER]:   { label: 'Inventory Manager',   icon: 'Package',         category: 'institution', landingPage: '/institution-dashboard' },
  [USER_ROLES.TRIAGE_STAFF]:        { label: 'Triage Staff',        icon: 'AlertTriangle',   category: 'institution', landingPage: '/institution-dashboard' },
  [USER_ROLES.MAINTENANCE_MANAGER]: { label: 'Maintenance Manager', icon: 'Wrench',          category: 'institution', landingPage: '/institution-dashboard' },
  [USER_ROLES.AMBULANCE_STAFF]:     { label: 'Ambulance Staff',     icon: 'Truck',           category: 'institution', landingPage: '/institution-dashboard' },
  [USER_ROLES.ADMIN]:               { label: 'Admin',               icon: 'Shield',          category: 'admin',       landingPage: '/admin-dashboard' },
  [USER_ROLES.SUPER_ADMIN]:         { label: 'Super Admin',         icon: 'ShieldCheck',     category: 'admin',       landingPage: '/super-admin-dashboard' },
  [USER_ROLES.SUPPORT]:             { label: 'Support',             icon: 'Headphones',      category: 'admin',       landingPage: '/admin-dashboard' },
};

// ─── Role priority (lower = higher priority for landing page selection) ─
export const ROLE_PRIORITY: UserRole[] = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPPORT,
  USER_ROLES.CXO,
  USER_ROLES.INSTITUTION_ADMIN,
  USER_ROLES.INSTITUTION_STAFF,
  USER_ROLES.RECEPTIONIST,
  USER_ROLES.HR_MANAGER,
  USER_ROLES.BILLING_STAFF,
  USER_ROLES.TRIAGE_STAFF,
  USER_ROLES.OT_STAFF,
  USER_ROLES.MAINTENANCE_MANAGER,
  USER_ROLES.INVENTORY_MANAGER,
  USER_ROLES.AMBULANCE_STAFF,
  USER_ROLES.DOCTOR,
  USER_ROLES.NURSE,
  USER_ROLES.RADIOLOGIST,
  USER_ROLES.SPECIALIST,
  USER_ROLES.HEALTH_PERSONNEL,
  USER_ROLES.PATHOLOGIST,
  USER_ROLES.PHLEBOTOMIST,
  USER_ROLES.PHARMACIST,
  USER_ROLES.PHARMACY,
  USER_ROLES.LAB_TECHNICIAN,
  USER_ROLES.LAB,
  USER_ROLES.PATIENT,
];

// ─── Shared route groups ────────────────────────────────────────────
export const COMMON_ROUTES = [
  '/',
  '/home',
  '/onboarding',
  '/profile',
  '/settings',
  '/notifications',
  '/privacy-security',
  '/payment-success',
  '/payment-cancel',
];

export const PROVIDER_CORE_ROUTES = [
  '/provider-dashboard',
  '/provider-portal',
  '/appointments',
  '/appointments/:id',
  '/chat',
  '/connections',
  '/medical-records',
  '/provider-calendar',
  '/wallet',
  '/emergency',
  '/video-consultations',
  '/application-status',
  '/healthcare-application',
  '/map',
  '/search',
];

export const INSTITUTION_OPERATIONAL_ROUTES = [
  ...COMMON_ROUTES,
  '/institution-dashboard',
  '/institution-portal',
  '/institution/patients',
  '/institution/appointments',
  '/chat',
  '/map',
  '/search',
];

export const PUBLIC_ROUTES = [
  '/auth',
  '/login',
  '/register',
  '/landing',
  '/healthcare-professionals',
  '/healthcare-institutions',
  '/healthcare-application',
  '/terms',
  '/privacy',
  '/contact',
  '/search',
  '/providers',
  '/marketplace-users',
  '/emergency',
  '/provider/:id',
  '/booking-confirmed',
  '/pricing',
  '/reset-password',
];
