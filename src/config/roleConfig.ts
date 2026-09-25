/**
 * Centralized role configuration — single source of truth for all role metadata.
 * Import from here instead of scattering role strings across the codebase.
 */

// ─── Role identifiers ──────────────────────────────────────────────
// Taxonomy sources:
//  - HPCZ (Health Professions Council of Zambia) registrable professions
//  - NMCZ (Nursing & Midwifery Council of Zambia) cadres
//  - ZAMRA licensed premises (retail / hospital / wholesale pharmacy)
//  - MOH Zambia facility pyramid (HP → health centre → L1/L2/L3 hospitals)
//  - WHO ISCO-08 health occupation groups (221x, 222x, 2240, 226x, 32xx)
export const USER_ROLES = {
  PATIENT: 'patient',
  HEALTH_PERSONNEL: 'health_personnel',
  PHARMACY: 'pharmacy',
  WHOLESALE_PHARMACY: 'wholesale_pharmacy',
  INSTITUTION_ADMIN: 'institution_admin',
  INSTITUTION_STAFF: 'institution_staff',
  ADMIN: 'admin',
  LAB: 'lab',
  SUPER_ADMIN: 'super_admin',
  SUPPORT: 'support',
  // ── Medical practitioners (HPCZ) ──
  DOCTOR: 'doctor',
  SPECIALIST: 'specialist',
  MEDICAL_LICENTIATE: 'medical_licentiate',
  CLINICAL_OFFICER: 'clinical_officer',
  DENTIST: 'dentist',
  DENTAL_THERAPIST: 'dental_therapist',
  // ── Nursing & midwifery (NMCZ) ──
  NURSE: 'nurse',
  REGISTERED_NURSE: 'registered_nurse',
  ENROLLED_NURSE: 'enrolled_nurse',
  MIDWIFE: 'midwife',
  // ── Pharmacy personnel (HPCZ) ──
  PHARMACIST: 'pharmacist',
  PHARMACY_TECHNOLOGIST: 'pharmacy_technologist',
  // ── Diagnostics & imaging ──
  RADIOLOGIST: 'radiologist',
  RADIOGRAPHER: 'radiographer',
  PATHOLOGIST: 'pathologist',
  LAB_TECHNICIAN: 'lab_technician',
  PHLEBOTOMIST: 'phlebotomist',
  // ── Allied health (HPCZ) ──
  PHYSIOTHERAPIST: 'physiotherapist',
  OCCUPATIONAL_THERAPIST: 'occupational_therapist',
  NUTRITIONIST: 'nutritionist',
  OPTOMETRIST: 'optometrist',
  PSYCHOLOGIST: 'psychologist',
  // ── Public & community health ──
  ENVIRONMENTAL_HEALTH_OFFICER: 'environmental_health_officer',
  COMMUNITY_HEALTH_WORKER: 'community_health_worker',
  TRADITIONAL_PRACTITIONER: 'traditional_practitioner',
  MEDICAL_RECORDS_OFFICER: 'medical_records_officer',
  // ── Facility operations ──
  RECEPTIONIST: 'receptionist',
  HR_MANAGER: 'hr_manager',
  CXO: 'cxo',
  OT_STAFF: 'ot_staff',
  BILLING_STAFF: 'billing_staff',
  INVENTORY_MANAGER: 'inventory_manager',
  TRIAGE_STAFF: 'triage_staff',
  MAINTENANCE_MANAGER: 'maintenance_manager',
  AMBULANCE_STAFF: 'ambulance_staff',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// ─── Role display metadata ─────────────────────────────────────────
// Categories follow the workforce taxonomy:
// patient · clinical (doctors/dentists) · nursing (NMCZ cadres) ·
// allied (HPCZ allied professions) · pharmacy · lab · community
// (public/community health) · institution (facility operations) · admin
export interface RoleMeta {
  label: string;
  icon: string;            // lucide icon name
  category: 'clinical' | 'nursing' | 'allied' | 'institution' | 'admin' | 'patient' | 'lab' | 'pharmacy' | 'community';
  landingPage: string;
}

export const ROLE_META: Record<UserRole, RoleMeta> = {
  [USER_ROLES.PATIENT]:             { label: 'Patient',             icon: 'User',            category: 'patient',     landingPage: '/home' },
  // ── Medical practitioners ──
  [USER_ROLES.DOCTOR]:              { label: 'Doctor',              icon: 'Stethoscope',     category: 'clinical',    landingPage: '/provider-dashboard' },
  [USER_ROLES.SPECIALIST]:          { label: 'Specialist',          icon: 'Award',           category: 'clinical',    landingPage: '/provider-dashboard' },
  [USER_ROLES.MEDICAL_LICENTIATE]:  { label: 'Medical Licentiate',  icon: 'GraduationCap',   category: 'clinical',    landingPage: '/provider-dashboard' },
  [USER_ROLES.CLINICAL_OFFICER]:    { label: 'Clinical Officer',    icon: 'ClipboardList',   category: 'clinical',    landingPage: '/provider-dashboard' },
  [USER_ROLES.DENTIST]:             { label: 'Dentist',             icon: 'Smile',           category: 'clinical',    landingPage: '/provider-dashboard' },
  [USER_ROLES.DENTAL_THERAPIST]:    { label: 'Dental Therapist',    icon: 'SmilePlus',       category: 'allied',      landingPage: '/provider-dashboard' },
  [USER_ROLES.HEALTH_PERSONNEL]:    { label: 'Health Personnel',    icon: 'UserCheck',       category: 'clinical',    landingPage: '/provider-dashboard' },
  // ── Nursing & midwifery ──
  [USER_ROLES.NURSE]:               { label: 'Nurse',               icon: 'Heart',           category: 'nursing',     landingPage: '/provider-dashboard' },
  [USER_ROLES.REGISTERED_NURSE]:    { label: 'Registered Nurse',    icon: 'HeartPulse',      category: 'nursing',     landingPage: '/provider-dashboard' },
  [USER_ROLES.ENROLLED_NURSE]:      { label: 'Enrolled Nurse',      icon: 'Heart',           category: 'nursing',     landingPage: '/provider-dashboard' },
  [USER_ROLES.MIDWIFE]:             { label: 'Midwife',             icon: 'Baby',            category: 'nursing',     landingPage: '/provider-dashboard' },
  // ── Pharmacy ──
  [USER_ROLES.PHARMACIST]:          { label: 'Pharmacist',          icon: 'Pill',            category: 'pharmacy',    landingPage: '/pharmacy-portal' },
  [USER_ROLES.PHARMACY_TECHNOLOGIST]: { label: 'Pharmacy Technologist', icon: 'Tablets',     category: 'pharmacy',    landingPage: '/pharmacy-portal' },
  [USER_ROLES.PHARMACY]:            { label: 'Retail Pharmacy',     icon: 'Building2',       category: 'pharmacy',    landingPage: '/pharmacy-portal' },
  [USER_ROLES.WHOLESALE_PHARMACY]:  { label: 'Wholesale Pharmacy',  icon: 'Truck',           category: 'pharmacy',    landingPage: '/pharmacy-portal' },
  // ── Diagnostics & imaging ──
  [USER_ROLES.RADIOLOGIST]:         { label: 'Radiologist',         icon: 'Scan',            category: 'clinical',    landingPage: '/provider-dashboard' },
  [USER_ROLES.RADIOGRAPHER]:        { label: 'Radiographer',        icon: 'ScanLine',        category: 'allied',      landingPage: '/provider-dashboard' },
  [USER_ROLES.LAB_TECHNICIAN]:      { label: 'Lab Technician',      icon: 'FlaskConical',    category: 'lab',         landingPage: '/lab-management' },
  [USER_ROLES.LAB]:                 { label: 'Laboratory',          icon: 'FlaskConical',    category: 'lab',         landingPage: '/lab-management' },
  [USER_ROLES.PHLEBOTOMIST]:        { label: 'Phlebotomist',        icon: 'Droplet',         category: 'lab',         landingPage: '/lab-management' },
  [USER_ROLES.PATHOLOGIST]:         { label: 'Pathologist',          icon: 'Microscope',      category: 'lab',         landingPage: '/lab-management' },
  // ── Allied health ──
  [USER_ROLES.PHYSIOTHERAPIST]:     { label: 'Physiotherapist',     icon: 'Activity',        category: 'allied',      landingPage: '/provider-dashboard' },
  [USER_ROLES.OCCUPATIONAL_THERAPIST]: { label: 'Occupational Therapist', icon: 'Hand',      category: 'allied',      landingPage: '/provider-dashboard' },
  [USER_ROLES.NUTRITIONIST]:        { label: 'Nutritionist',        icon: 'Apple',           category: 'allied',      landingPage: '/provider-dashboard' },
  [USER_ROLES.OPTOMETRIST]:         { label: 'Optometrist',         icon: 'Eye',             category: 'allied',      landingPage: '/provider-dashboard' },
  [USER_ROLES.PSYCHOLOGIST]:        { label: 'Psychologist',        icon: 'Brain',           category: 'allied',      landingPage: '/provider-dashboard' },
  // ── Public & community health ──
  [USER_ROLES.ENVIRONMENTAL_HEALTH_OFFICER]: { label: 'Environmental Health Officer', icon: 'Leaf', category: 'community', landingPage: '/provider-dashboard' },
  [USER_ROLES.COMMUNITY_HEALTH_WORKER]: { label: 'Community Health Worker', icon: 'Home', category: 'community', landingPage: '/provider-dashboard' },
  [USER_ROLES.TRADITIONAL_PRACTITIONER]: { label: 'Traditional Practitioner', icon: 'Sprout', category: 'community', landingPage: '/provider-dashboard' },
  [USER_ROLES.MEDICAL_RECORDS_OFFICER]: { label: 'Medical Records Officer', icon: 'FolderArchive', category: 'institution', landingPage: '/institution-dashboard' },
  // ── Facility operations ──
  [USER_ROLES.INSTITUTION_ADMIN]:   { label: 'Institution Admin',   icon: 'Building',        category: 'institution', landingPage: '/institution-dashboard' },
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
  // ── Platform administration ──
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
  USER_ROLES.MEDICAL_RECORDS_OFFICER,
  USER_ROLES.DOCTOR,
  USER_ROLES.SPECIALIST,
  USER_ROLES.MEDICAL_LICENTIATE,
  USER_ROLES.CLINICAL_OFFICER,
  USER_ROLES.DENTIST,
  USER_ROLES.NURSE,
  USER_ROLES.REGISTERED_NURSE,
  USER_ROLES.ENROLLED_NURSE,
  USER_ROLES.MIDWIFE,
  USER_ROLES.RADIOLOGIST,
  USER_ROLES.RADIOGRAPHER,
  USER_ROLES.DENTAL_THERAPIST,
  USER_ROLES.PHYSIOTHERAPIST,
  USER_ROLES.OCCUPATIONAL_THERAPIST,
  USER_ROLES.NUTRITIONIST,
  USER_ROLES.OPTOMETRIST,
  USER_ROLES.PSYCHOLOGIST,
  USER_ROLES.ENVIRONMENTAL_HEALTH_OFFICER,
  USER_ROLES.COMMUNITY_HEALTH_WORKER,
  USER_ROLES.TRADITIONAL_PRACTITIONER,
  USER_ROLES.HEALTH_PERSONNEL,
  USER_ROLES.PATHOLOGIST,
  USER_ROLES.PHLEBOTOMIST,
  USER_ROLES.PHARMACIST,
  USER_ROLES.PHARMACY_TECHNOLOGIST,
  USER_ROLES.PHARMACY,
  USER_ROLES.WHOLESALE_PHARMACY,
  USER_ROLES.LAB_TECHNICIAN,
  USER_ROLES.LAB,
  USER_ROLES.PATIENT,
];

// ─── Role groups — single source of truth ────────────────────────────
// Import these instead of hardcoding role arrays in pages/components.
// They mirror the taxonomy above so directories, booking flows and
// role expansion stay in sync when roles are added.

/** Individual clinicians bookable for consultations (incl. video/teledoctor). */
export const CONSULTABLE_PROVIDER_ROLES: UserRole[] = [
  USER_ROLES.DOCTOR,
  USER_ROLES.SPECIALIST,
  USER_ROLES.MEDICAL_LICENTIATE,
  USER_ROLES.CLINICAL_OFFICER,
  USER_ROLES.DENTIST,
  USER_ROLES.NURSE,
  USER_ROLES.REGISTERED_NURSE,
  USER_ROLES.ENROLLED_NURSE,
  USER_ROLES.MIDWIFE,
  USER_ROLES.RADIOLOGIST,
  USER_ROLES.PSYCHOLOGIST,
  USER_ROLES.NUTRITIONIST,
  USER_ROLES.OPTOMETRIST,
  USER_ROLES.PHYSIOTHERAPIST,
  USER_ROLES.OCCUPATIONAL_THERAPIST,
  USER_ROLES.DENTAL_THERAPIST,
  USER_ROLES.TRADITIONAL_PRACTITIONER,
  USER_ROLES.HEALTH_PERSONNEL,
];

/** Every individual clinical cadre (for directories & search filters). */
export const ALL_CLINICIAN_ROLES: UserRole[] = [
  ...CONSULTABLE_PROVIDER_ROLES,
  USER_ROLES.PHARMACIST,
  USER_ROLES.PHARMACY_TECHNOLOGIST,
  USER_ROLES.RADIOGRAPHER,
  USER_ROLES.PATHOLOGIST,
  USER_ROLES.LAB_TECHNICIAN,
  USER_ROLES.PHLEBOTOMIST,
  USER_ROLES.ENVIRONMENTAL_HEALTH_OFFICER,
  USER_ROLES.COMMUNITY_HEALTH_WORKER,
];

/** Roles legally permitted to issue orthodox prescriptions in Zambia. */
export const PRESCRIBING_ROLES: UserRole[] = [
  USER_ROLES.DOCTOR,
  USER_ROLES.SPECIALIST,
  USER_ROLES.MEDICAL_LICENTIATE,
  USER_ROLES.CLINICAL_OFFICER,
  USER_ROLES.DENTIST,
];

/** Nursing & midwifery cadres (NMCZ). */
export const NURSING_ROLES: UserRole[] = [
  USER_ROLES.NURSE,
  USER_ROLES.REGISTERED_NURSE,
  USER_ROLES.ENROLLED_NURSE,
  USER_ROLES.MIDWIFE,
];

/** Community & public-health field roles. */
export const COMMUNITY_ROLES: UserRole[] = [
  USER_ROLES.ENVIRONMENTAL_HEALTH_OFFICER,
  USER_ROLES.COMMUNITY_HEALTH_WORKER,
  USER_ROLES.TRADITIONAL_PRACTITIONER,
];

/** Pharmacy-side roles (retail, wholesale, professionals). */
export const PHARMACY_SIDE_ROLES: UserRole[] = [
  USER_ROLES.PHARMACY,
  USER_ROLES.WHOLESALE_PHARMACY,
  USER_ROLES.PHARMACIST,
  USER_ROLES.PHARMACY_TECHNOLOGIST,
];

/** Lab-side roles. */
export const LAB_SIDE_ROLES: UserRole[] = [
  USER_ROLES.LAB,
  USER_ROLES.LAB_TECHNICIAN,
  USER_ROLES.PATHOLOGIST,
  USER_ROLES.PHLEBOTOMIST,
];

// ─── Shared route groups ────────────────────────────────────────────
export const COMMON_ROUTES = [
  '/',
  '/home',
  '/dashboard',
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
  '/provider-profile/:id',
  '/appointments',
  '/appointments/:id',
  '/appointment-reminders',
  '/chat',
  '/connections',
  '/medical-records',
  '/provider-calendar',
  '/wallet',
  '/emergency',
  '/video-consultations',
  '/video-dashboard',
  '/video-call/:roomId',
  '/application-status',
  '/healthcare-application',
  '/intake-form',
  '/insurance-cards',
  '/map',
  '/search',
];

export const INSTITUTION_OPERATIONAL_ROUTES = [
  ...COMMON_ROUTES,
  '/institution-dashboard',
  '/institution-portal',
  '/institution/patients',
  '/institution/appointments',
  '/appointments',
  '/appointments/:id',
  '/appointment-reminders',
  '/hospital-management',
  '/lab-management',
  '/pharmacy-management',
  '/pharmacy-inventory',
  '/insurance-cards',
  '/cost-estimator',
  '/chat',
  '/video-call/:roomId',
  '/map',
  '/search',
];

export const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/login',
  '/register',
  '/landing',
  '/healthcare-professionals',
  '/healthcare-institutions',
  '/terms',
  '/privacy',
  '/about',
  '/contact',
  '/search',
  '/providers',
  '/marketplace-users',
  '/emergency',
  '/provider/:id',
  '/pricing',
  '/reset-password',
  '/patient-registration',
  '/accept-invitation',
];
