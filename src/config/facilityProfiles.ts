/**
 * Facility profiles
 * ------------------------------------------------------------------
 * Different kinds of facilities run very different patient journeys.
 * A solo consultant never needs bed wards; a lab never needs theatre;
 * a pharmacy never admits anyone.
 *
 * This file is the single source of truth for:
 *   - which HMS modules are core / optional / not typical per facility type
 *   - which staff roles that facility usually employs
 *   - the patient journey that facility runs
 *
 * Nothing here hides functionality: every module stays visible in the
 * workspace. Modules that are not typical are simply de-emphasised and
 * explained, and the facility can still open and use them.
 */

export type ModuleRelevance = 'core' | 'optional' | 'atypical';

export type FacilityArchetype =
  | 'solo_practice'
  | 'clinic'
  | 'specialty_hospital'
  | 'general_hospital'
  | 'pharmacy'
  | 'diagnostics'
  | 'long_term_care';

/** HMS module keys — these match the tab values in HospitalManagement. */
export const HMS_MODULES = [
  'dashboard',
  'notifications',
  'emr',
  'opd',
  'ipd',
  'emergency',
  'ot',
  'lab',
  'radiology',
  'pharmacy',
  'beds',
  'billing',
  'tariffs',
  'insurance',
  'discharge',
  'staff',
  'mis',
] as const;

export type HmsModule = (typeof HMS_MODULES)[number];

export interface FacilityProfile {
  archetype: FacilityArchetype;
  label: string;
  /** Short plain-language description of how this facility sees patients. */
  summary: string;
  /** Ordered steps of the patient journey for this facility type. */
  journey: string[];
  /** Staff roles this facility typically employs, most common first. */
  staffRoles: string[];
  /** Relevance of each HMS module for this facility type. */
  modules: Record<HmsModule, ModuleRelevance>;
}

/** Helper to build the module map with a default and explicit overrides. */
const modules = (
  defaultRelevance: ModuleRelevance,
  overrides: Partial<Record<HmsModule, ModuleRelevance>>
): Record<HmsModule, ModuleRelevance> => {
  const out = {} as Record<HmsModule, ModuleRelevance>;
  for (const m of HMS_MODULES) out[m] = overrides[m] ?? defaultRelevance;
  // These are universal — every facility needs them.
  out.dashboard = 'core';
  out.notifications = 'core';
  out.billing = out.billing === 'atypical' ? 'optional' : out.billing;
  return out;
};

export const FACILITY_PROFILES: Record<FacilityArchetype, FacilityProfile> = {
  solo_practice: {
    archetype: 'solo_practice',
    label: 'Solo / Independent Consultant',
    summary:
      'One practitioner seeing booked and walk-in patients, writing notes and prescriptions, and being paid per consultation.',
    journey: [
      'Patient books online or walks in',
      'Reception or the practitioner checks them in to the day list',
      'Consultation is recorded in the patient record',
      'Prescription or referral is issued',
      'Payment is collected and the receipt is issued',
    ],
    staffRoles: ['doctor', 'receptionist', 'nurse', 'billing_clerk'],
    modules: modules('atypical', {
      emr: 'core',
      opd: 'core',
      billing: 'core',
      staff: 'optional',
      tariffs: 'optional',
      insurance: 'optional',
      lab: 'optional',
      radiology: 'optional',
      pharmacy: 'optional',
      mis: 'optional',
    }),
  },

  clinic: {
    archetype: 'clinic',
    label: 'Clinic / Small Practice',
    summary:
      'A small team running an outpatient day list, with a treatment room, some tests and dispensing, but no overnight stays.',
    journey: [
      'Patient books or arrives and is registered',
      'Triage or vitals are taken',
      'Consultation and treatment are recorded',
      'Tests or imaging are ordered where needed',
      'Medicines are dispensed or prescribed',
      'Payment and follow-up appointment',
    ],
    staffRoles: [
      'doctor',
      'nurse',
      'receptionist',
      'lab_technician',
      'pharmacist',
      'billing_clerk',
      'admin',
    ],
    modules: modules('atypical', {
      emr: 'core',
      opd: 'core',
      billing: 'core',
      staff: 'core',
      lab: 'optional',
      radiology: 'optional',
      pharmacy: 'optional',
      tariffs: 'optional',
      insurance: 'optional',
      emergency: 'optional',
      mis: 'optional',
    }),
  },

  specialty_hospital: {
    archetype: 'specialty_hospital',
    label: 'Specialised Hospital',
    summary:
      'A focused facility (eye, dental, maternity, orthopaedic and similar) running clinics, procedures and short stays in one specialty.',
    journey: [
      'Referral or direct booking into the specialty clinic',
      'Registration and pre-assessment',
      'Consultation and procedure planning',
      'Day case or short admission with theatre where needed',
      'Recovery, discharge notes and follow-up',
      'Billing, insurance claim and payment',
    ],
    staffRoles: [
      'doctor',
      'nurse',
      'receptionist',
      'pharmacist',
      'lab_technician',
      'radiologist',
      'billing_clerk',
      'admin',
    ],
    modules: modules('optional', {
      emr: 'core',
      opd: 'core',
      ot: 'core',
      billing: 'core',
      staff: 'core',
      discharge: 'core',
      ipd: 'optional',
      beds: 'optional',
      emergency: 'optional',
    }),
  },

  general_hospital: {
    archetype: 'general_hospital',
    label: 'General / Referral Hospital',
    summary:
      'A full hospital: casualty, outpatients, wards, theatre, its own lab, imaging and pharmacy, with departmental billing.',
    journey: [
      'Patient arrives at casualty, outpatients or by referral',
      'Triage sets the urgency',
      'Consultation, tests and imaging',
      'Admission to a ward and bed if required',
      'Ward rounds, medication rounds and theatre',
      'Discharge summary, billing and follow-up',
    ],
    staffRoles: [
      'doctor',
      'nurse',
      'receptionist',
      'lab_technician',
      'radiologist',
      'pharmacist',
      'billing_clerk',
      'admin',
      'housekeeping',
      'security',
    ],
    modules: modules('core', {}),
  },

  pharmacy: {
    archetype: 'pharmacy',
    label: 'Pharmacy / Dispensary',
    summary:
      'Receives prescriptions and online orders, checks stock, dispenses, and delivers or hands over at the counter.',
    journey: [
      'Prescription or online order arrives',
      'Pharmacist reviews it and checks interactions',
      'Stock is picked and dispensed',
      'Payment is taken at the counter or online',
      'Handover or delivery, and counselling notes are saved',
    ],
    staffRoles: ['pharmacist', 'billing_clerk', 'admin', 'other'],
    modules: modules('atypical', {
      pharmacy: 'core',
      billing: 'core',
      staff: 'optional',
      tariffs: 'optional',
      insurance: 'optional',
      mis: 'optional',
      emr: 'optional',
    }),
  },

  diagnostics: {
    archetype: 'diagnostics',
    label: 'Laboratory / Diagnostic & Imaging Centre',
    summary:
      'Works from test requests: collects samples or scans patients, runs the work, verifies results and releases them.',
    journey: [
      'Test or scan request arrives from a doctor, or the patient walks in',
      'Registration and payment or insurance check',
      'Sample collection or imaging appointment',
      'Analysis or scanning is performed',
      'Result is verified by the pathologist or radiologist',
      'Report is released to the patient and the referring doctor',
    ],
    staffRoles: [
      'lab_technician',
      'radiologist',
      'doctor',
      'receptionist',
      'billing_clerk',
      'admin',
    ],
    modules: modules('atypical', {
      lab: 'core',
      radiology: 'core',
      billing: 'core',
      emr: 'optional',
      opd: 'optional',
      staff: 'optional',
      tariffs: 'optional',
      insurance: 'optional',
      mis: 'optional',
    }),
  },

  long_term_care: {
    archetype: 'long_term_care',
    label: 'Nursing Home / Care Home',
    summary:
      'Residents stay long term: beds, daily care rounds, medication rounds and periodic reviews rather than one-off visits.',
    journey: [
      'Admission assessment and care plan',
      'Bed and room allocation',
      'Daily nursing and medication rounds',
      'Doctor reviews and family updates',
      'Transfer, discharge or ongoing monthly billing',
    ],
    staffRoles: ['nurse', 'doctor', 'admin', 'housekeeping', 'pharmacist', 'billing_clerk'],
    modules: modules('atypical', {
      emr: 'core',
      ipd: 'core',
      beds: 'core',
      billing: 'core',
      staff: 'core',
      pharmacy: 'optional',
      discharge: 'optional',
      insurance: 'optional',
      mis: 'optional',
      lab: 'optional',
    }),
  },
};

/** Maps a stored institution/provider type onto a facility archetype. */
const TYPE_TO_ARCHETYPE: Record<string, FacilityArchetype> = {
  // Solo practitioners
  doctor: 'solo_practice',
  dentist: 'solo_practice',
  optician: 'solo_practice',
  individual: 'solo_practice',
  solo_practice: 'solo_practice',
  private_practice: 'solo_practice',

  // Clinics
  clinic: 'clinic',
  dental_clinic: 'clinic',
  eye_clinic: 'clinic',
  skin_clinic: 'clinic',
  dermatology_clinic: 'clinic',
  physiotherapy: 'clinic',
  pediatric_center: 'clinic',
  health_center: 'clinic',
  health_post: 'clinic',

  // Specialised hospitals
  specialty_clinic: 'specialty_hospital',
  specialty_hospital: 'specialty_hospital',
  specialized_hospital: 'specialty_hospital',
  maternity_hospital: 'specialty_hospital',
  eye_hospital: 'specialty_hospital',

  // Full hospitals
  hospital: 'general_hospital',
  general_hospital: 'general_hospital',
  referral_hospital: 'general_hospital',
  teaching_hospital: 'general_hospital',

  // Pharmacies
  pharmacy: 'pharmacy',
  dispensary: 'pharmacy',
  drug_store: 'pharmacy',

  // Diagnostics
  laboratory: 'diagnostics',
  lab: 'diagnostics',
  diagnostic_center: 'diagnostics',
  radiology_center: 'diagnostics',
  imaging_center: 'diagnostics',

  // Long term care
  nursing_home: 'long_term_care',
  care_home: 'long_term_care',
  hospice: 'long_term_care',
};

export function getFacilityArchetype(type?: string | null): FacilityArchetype {
  if (!type) return 'clinic';
  const key = String(type).toLowerCase().trim().replace(/[\s-]+/g, '_');
  return TYPE_TO_ARCHETYPE[key] ?? 'clinic';
}

export function getFacilityProfile(type?: string | null): FacilityProfile {
  return FACILITY_PROFILES[getFacilityArchetype(type)];
}

export function getModuleRelevance(type: string | null | undefined, module: HmsModule): ModuleRelevance {
  return getFacilityProfile(type).modules[module] ?? 'optional';
}

/** Human label used in the "not typical" explanation. */
export function facilityTypeLabel(type?: string | null): string {
  return getFacilityProfile(type).label;
}
