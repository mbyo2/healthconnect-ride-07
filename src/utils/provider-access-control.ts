/**
 * Least-Privilege Provider Access Control
 * 
 * Defines what each provider role can see about a patient.
 * This enforces the principle of least privilege: providers see
 * only what they need for their role, not the full patient record.
 */

export type ProviderRole = 
  | "receptionist"
  | "pharmacist"
  | "lab_technician"
  | "nurse"
  | "doctor"
  | "admin";

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
}

/**
 * Defines the data scope for each provider role.
 * This is the core of least-privilege access.
 */
export const ROLE_DATA_SCOPES: Record<ProviderRole, PatientDataScope> = {
  receptionist: {
    demographics: true,      // Need for check-in
    appointments: true,      // Need for scheduling
    vitals: false,
    labResults: false,
    prescriptions: false,
    allergies: false,        // Could be true for safety, but receptionist doesn't need
    immunizations: false,
    clinicalNotes: false,
    billing: true,           // Need for payment collection
  },
  pharmacist: {
    demographics: true,      // Need for patient identification
    appointments: false,
    vitals: false,
    labResults: true,        // Need for drug monitoring (e.g., kidney function)
    prescriptions: true,     // Core role
    allergies: true,         // Critical for safety - MUST see
    immunizations: false,
    clinicalNotes: false,    // Don't need full notes
    billing: false,
  },
  lab_technician: {
    demographics: true,      // Need for sample identification
    appointments: false,
    vitals: false,
    labResults: true,        // Core role
    prescriptions: false,
    allergies: false,
    immunizations: false,
    clinicalNotes: false,
    billing: false,
  },
  nurse: {
    demographics: true,
    appointments: true,
    vitals: true,            // Core role
    labResults: true,        // Need for patient care
    prescriptions: true,     // Need for medication administration
    allergies: true,         // Critical for safety
    immunizations: true,     // Often administers
    clinicalNotes: true,     // Need for care continuity
    billing: false,
  },
  doctor: {
    demographics: true,
    appointments: true,
    vitals: true,
    labResults: true,
    prescriptions: true,
    allergies: true,
    immunizations: true,
    clinicalNotes: true,     // Full access for diagnosis/treatment
    billing: false,
  },
  admin: {
    demographics: true,
    appointments: true,
    vitals: false,           // Admin doesn't need clinical data
    labResults: false,
    prescriptions: false,
    allergies: false,
    immunizations: false,
    clinicalNotes: false,
    billing: true,           // Need for financial oversight
  },
};

/**
 * Checks if a role can access a specific data category.
 */
export function canAccess(
  role: ProviderRole,
  category: keyof PatientDataScope
): boolean {
  return ROLE_DATA_SCOPES[role]?.[category] ?? false;
}

/**
 * Filters patient data based on provider role.
 * Returns only the fields the role is authorized to see.
 */
export function filterPatientDataByRole<T extends Record<string, any>>(
  data: T,
  role: ProviderRole,
  category: keyof PatientDataScope
): Partial<T> | null {
  if (!canAccess(role, category)) {
    return null; // No access
  }
  return data;
}

/**
 * Gets the human-readable description of what a role can access.
 * Useful for UI to explain access levels.
 */
export function getRoleAccessDescription(role: ProviderRole): string[] {
  const scope = ROLE_DATA_SCOPES[role];
  const accessible: string[] = [];
  if (scope.demographics) accessible.push("Demographics");
  if (scope.appointments) accessible.push("Appointments");
  if (scope.vitals) accessible.push("Vital Signs");
  if (scope.labResults) accessible.push("Lab Results");
  if (scope.prescriptions) accessible.push("Prescriptions");
  if (scope.allergies) accessible.push("Allergies");
  if (scope.immunizations) accessible.push("Immunizations");
  if (scope.clinicalNotes) accessible.push("Clinical Notes");
  if (scope.billing) accessible.push("Billing");
  return accessible;
}
