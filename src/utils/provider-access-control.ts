/**
 * Least-Privilege Provider Access Control - Complete 47-Role Matrix
 * 
 * Research-based access scopes for all 47 user roles in Doc'O Clock.
 * Based on: ~/workspace/goals/doc0clock-clinic-launch/files/47-roles-least-privilege-research.md
 * 
 * Principle: Each role sees ONLY what it needs for its function.
 * Safety-critical exceptions: Allergies visible to all clinical roles (prevents fatal interactions).
 */

export interface PatientDataScope {
  demographics: boolean;
  appointments: boolean;
  vitals: boolean;
  labResults: boolean;
  prescriptions: boolean;
  allergies: boolean;
  immunizations: boolean;
  clinicalNotes: boolean;
  billing: boolean;
  staffData: boolean;      // HR/staff records
  inventory: boolean;      // Stock/supplies
  analytics: boolean;      // Aggregated reports
}

// Full clinical access (doctors, nurses - need complete picture for safety)
const FULL_CLINICAL: PatientDataScope = {
  demographics: true, appointments: true, vitals: true, labResults: true,
  prescriptions: true, allergies: true, immunizations: true, clinicalNotes: true,
  billing: false, staffData: false, inventory: false, analytics: false,
};

// No patient data (operations, HR, finance, maintenance)
const NO_PATIENT_DATA: PatientDataScope = {
  demographics: false, appointments: false, vitals: false, labResults: false,
  prescriptions: false, allergies: false, immunizations: false, clinicalNotes: false,
  billing: false, staffData: false, inventory: false, analytics: false,
};

export const ROLE_DATA_SCOPES: Record<string, PatientDataScope> = {
  // ── Patient ──
  patient: {
    ...FULL_CLINICAL, billing: true, // Patients see own full record + own billing
    staffData: false, inventory: false, analytics: false,
  },

  // ── Medical Practitioners (HPCZ) - Full clinical for diagnosis ──
  doctor: FULL_CLINICAL,
  specialist: FULL_CLINICAL,
  medical_licentiate: FULL_CLINICAL,
  clinical_officer: FULL_CLINICAL,
  dentist: FULL_CLINICAL,           // Needs allergies for anesthesia safety
  dental_therapist: FULL_CLINICAL,

  // ── Nursing & Midwifery (NMCZ) - Full clinical for care ──
  nurse: FULL_CLINICAL,
  registered_nurse: FULL_CLINICAL,
  enrolled_nurse: FULL_CLINICAL,
  midwife: FULL_CLINICAL,           // Needs meds for teratogenicity check

  // ── Pharmacy - Meds + allergies (safety critical), no full notes ──
  pharmacist: {
    demographics: true, appointments: false, vitals: false,
    labResults: true,               // For drug monitoring (kidney, liver)
    prescriptions: true, allergies: true, // ALLERGIES CRITICAL
    immunizations: false, clinicalNotes: false,
    billing: false, staffData: false, inventory: true, analytics: false,
  },
  pharmacy_technologist: {
    demographics: true, appointments: false, vitals: false, labResults: false,
    prescriptions: true, allergies: true, // Safety check
    immunizations: false, clinicalNotes: false,
    billing: false, staffData: false, inventory: true, analytics: false,
  },
  pharmacy: {
    demographics: false, appointments: false, vitals: false, labResults: false,
    prescriptions: true, allergies: false, immunizations: false, clinicalNotes: false,
    billing: true, staffData: false, inventory: true, analytics: true,
  },
  wholesale_pharmacy: {
    ...NO_PATIENT_DATA, inventory: true, billing: true, analytics: true,
  },

  // ── Diagnostics - Orders + results, minimal history ──
  radiologist: {
    demographics: true, appointments: false, vitals: false,
    labResults: false, prescriptions: false, allergies: true, // Contrast allergy risk
    immunizations: false, clinicalNotes: true, // Need context for interpretation
    billing: false, staffData: false, inventory: false, analytics: false,
  },
  radiographer: {
    demographics: true, appointments: false, vitals: false, labResults: false,
    prescriptions: false, allergies: true, // Contrast safety
    immunizations: false, clinicalNotes: false,
    billing: false, staffData: false, inventory: false, analytics: false,
  },
  pathologist: {
    demographics: true, appointments: false, vitals: false,
    labResults: true, prescriptions: false, allergies: false,
    immunizations: false, clinicalNotes: true, // Need context
    billing: false, staffData: false, inventory: false, analytics: false,
  },
  lab_technician: {
    demographics: true, appointments: false, vitals: false,
    labResults: true, prescriptions: false, allergies: false,
    immunizations: false, clinicalNotes: false,
    billing: false, staffData: false, inventory: true, analytics: false,
  },
  phlebotomist: {
    demographics: true, appointments: false, vitals: false, labResults: false,
    prescriptions: false, allergies: false, immunizations: false, clinicalNotes: false,
    billing: false, staffData: false, inventory: false, analytics: false,
  },
  lab: {
    demographics: false, appointments: false, vitals: false,
    labResults: true, prescriptions: false, allergies: false,
    immunizations: false, clinicalNotes: false,
    billing: true, staffData: false, inventory: true, analytics: true,
  },

  // ── Allied Health - Role-specific, not full records ──
  physiotherapist: {
    demographics: true, appointments: true, vitals: true,
    labResults: false, prescriptions: true, // Pain meds
    allergies: true, immunizations: false,
    clinicalNotes: true, // Musculoskeletal notes
    billing: false, staffData: false, inventory: false, analytics: false,
  },
  occupational_therapist: {
    demographics: true, appointments: true, vitals: false,
    labResults: false, prescriptions: false, allergies: true,
    immunizations: false, clinicalNotes: true, // Functional notes
    billing: false, staffData: false, inventory: false, analytics: false,
  },
  nutritionist: {
    demographics: true, appointments: true, vitals: true, // Weight, BMI
    labResults: true, // Glucose, cholesterol
    prescriptions: false, allergies: true, // Food allergies
    immunizations: false, clinicalNotes: false,
    billing: false, staffData: false, inventory: false, analytics: false,
  },
  optometrist: {
    demographics: true, appointments: true, vitals: true, // BP for eye pressure
    labResults: false, prescriptions: true, // Eye meds
    allergies: true, immunizations: false, clinicalNotes: false,
    billing: false, staffData: false, inventory: false, analytics: false,
  },
  psychologist: {
    demographics: true, appointments: true, vitals: false,
    labResults: false, prescriptions: true, // Psych meds
    allergies: true, immunizations: false,
    clinicalNotes: true, // Mental health notes
    billing: false, staffData: false, inventory: false, analytics: false,
  },

  // ── Public & Community Health ──
  environmental_health_officer: {
    demographics: true, appointments: false, vitals: false, labResults: false,
    prescriptions: false, allergies: false, immunizations: true,
    clinicalNotes: false, billing: false, staffData: false, inventory: false,
    analytics: true, // Public health surveillance
  },
  community_health_worker: {
    demographics: true, appointments: true, vitals: true, // Basic vitals
    labResults: false, prescriptions: false, allergies: false,
    immunizations: true, clinicalNotes: false,
    billing: false, staffData: false, inventory: false, analytics: false,
  },
  traditional_practitioner: {
    demographics: true, appointments: true, vitals: false, labResults: false,
    prescriptions: false, allergies: false, immunizations: false, clinicalNotes: false,
    billing: false, staffData: false, inventory: false, analytics: false,
  },
  medical_records_officer: {
    ...FULL_CLINICAL, billing: true, analytics: true, // Records management
    staffData: false, inventory: false,
  },

  // ── Facility Operations - NO clinical data ──
  receptionist: {
    demographics: true, appointments: true, vitals: false, labResults: false,
    prescriptions: false, allergies: false, immunizations: false, clinicalNotes: false,
    billing: true, staffData: false, inventory: false, analytics: false,
  },
  hr_manager: {
    ...NO_PATIENT_DATA, staffData: true, analytics: true,
  },
  cxo: {
    ...NO_PATIENT_DATA, billing: true, analytics: true, // Executive dashboard
    staffData: true,
  },
  ot_staff: {
    demographics: true, appointments: true, vitals: true,
    labResults: false, prescriptions: false, allergies: true, // Anesthesia safety
    immunizations: false, clinicalNotes: false,
    billing: false, staffData: false, inventory: true, analytics: false,
  },
  billing_staff: {
    demographics: true, appointments: false, vitals: false, labResults: false,
    prescriptions: false, allergies: false, immunizations: false, clinicalNotes: false,
    billing: true, staffData: false, inventory: false, analytics: false,
  },
  finance_manager: {
    ...NO_PATIENT_DATA, billing: true, analytics: true, staffData: true,
  },
  inventory_manager: {
    ...NO_PATIENT_DATA, inventory: true, billing: true, analytics: true,
  },
  triage_staff: {
    demographics: true, appointments: false, vitals: true, // Acuity assessment
    labResults: false, prescriptions: false, allergies: true, // Safety
    immunizations: false, clinicalNotes: false,
    billing: false, staffData: false, inventory: false, analytics: false,
  },
  maintenance_manager: {
    ...NO_PATIENT_DATA, inventory: true, analytics: false,
  },
  ambulance_staff: {
    demographics: true, appointments: false, vitals: true,
    labResults: false, prescriptions: false, allergies: true, // Emergency safety
    immunizations: false, clinicalNotes: false,
    billing: false, staffData: false, inventory: false, analytics: false,
  },

  // ── System & Support ──
  institution_admin: {
    ...NO_PATIENT_DATA, billing: true, analytics: true, staffData: true, inventory: true,
  },
  institution_staff: {
    ...NO_PATIENT_DATA, // Base; specific permissions from assigned role
  },
  admin: {
    ...NO_PATIENT_DATA, analytics: true, staffData: true,
  },
  super_admin: {
    ...NO_PATIENT_DATA, billing: true, analytics: true, staffData: true, inventory: true,
    // Full system access but audit-logged; should not routinely browse patient data
  },
  support: {
    ...NO_PATIENT_DATA, // Case-by-case, ticket-related only
  },
  health_personnel: {
    ...FULL_CLINICAL, // Generic clinical; refined by specific profession
  },
  courier: {
    demographics: true, // Delivery address only
    appointments: false, vitals: false, labResults: false,
    prescriptions: false, allergies: false, immunizations: false, clinicalNotes: false,
    billing: false, staffData: false, inventory: false, analytics: false,
  },
};

/**
 * Checks if a role can access a specific data category.
 */
export function canAccess(
  role: string,
  category: keyof PatientDataScope
): boolean {
  return ROLE_DATA_SCOPES[role]?.[category] ?? false;
}

/**
 * Gets the list of accessible categories for a role.
 */
export function getAccessibleCategories(role: string): string[] {
  const scope = ROLE_DATA_SCOPES[role];
  if (!scope) return [];
  return (Object.keys(scope) as (keyof PatientDataScope)[]).filter(k => scope[k]);
}

/**
 * Validates that a role's access doesn't break critical workflows.
 * Returns warnings for potentially unsafe restrictions.
 */
export function validateRoleAccess(role: string): string[] {
  const warnings: string[] = [];
  const scope = ROLE_DATA_SCOPES[role];
  if (!scope) return [`Unknown role: ${role}`];

  // Safety-critical: clinical roles must see allergies
  const clinicalRoles = ['doctor', 'nurse', 'pharmacist', 'midwife', 'clinical_officer'];
  if (clinicalRoles.includes(role) && !scope.allergies) {
    warnings.push(`SAFETY: ${role} cannot see allergies - risk of fatal interactions`);
  }

  // Usability: doctors need full history for diagnosis
  if (['doctor', 'specialist'].includes(role) && !scope.clinicalNotes) {
    warnings.push(`USABILITY: ${role} cannot see clinical notes - diagnosis impaired`);
  }

  return warnings;
}
