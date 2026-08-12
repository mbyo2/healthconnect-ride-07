// Document Requirements Configuration
// Country-specific and role-specific document requirements for provider/institution registration

export type CountryCode = 'ZM' | 'ZA' | 'BW' | 'MW' | 'TZ' | 'KE' | 'NG' | 'GB' | 'US';

export interface DocumentRequirement {
  label: string;
  description: string;
  required: boolean;
  acceptedFormats: string[];
}

export interface RoleDocumentRequirements {
  [key: string]: DocumentRequirement[];
}

export interface CountryDocumentRequirements {
  country: CountryCode;
  countryName: string;
  roles: RoleDocumentRequirements;
}

/**
 * Zambia - Document Requirements Configuration
 * Based on ZHIMA guidelines and Zambian regulatory requirements
 */
export const ZAMBIA_DOCUMENT_REQUIREMENTS: CountryDocumentRequirements = {
  country: 'ZM',
  countryName: 'Zambia',
  roles: {
    doctor: [
      {
        label: 'Medical Degree Certificate',
        description: 'Bachelor of Medicine/Doctor of Medicine degree from recognized institution',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Medical License / Practice Certificate',
        description: 'Current GMZ (General Medical Council of Zambia) registration certificate',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'ID / Passport',
        description: 'Valid National ID or Passport',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Proof of Specialization (Optional)',
        description: 'Additional qualification or specialization certificate if applicable',
        required: false,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
    ],
    nurse: [
      {
        label: 'Nursing License / Registration',
        description: 'Current NBMZ (Nursing and Midwifery Board of Zambia) registration',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Nursing Diploma / Degree',
        description: 'Nursing qualification from recognized institution',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'ID / Passport',
        description: 'Valid National ID or Passport',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'CPR / First Aid Certificate (Recommended)',
        description: 'Current CPR or First Aid certification',
        required: false,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
    ],
    pharmacist: [
      {
        label: 'Pharmacy License / Registration',
        description: 'Current ZPRA (Zambia Pharmaceutical Regulatory Authority) registration',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Pharmacy Degree',
        description: 'Bachelor of Pharmacy or equivalent degree',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'ID / Passport',
        description: 'Valid National ID or Passport',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
    ],
    lab_technician: [
      {
        label: 'Laboratory Technician Certificate/Diploma',
        description: 'Qualification in medical laboratory sciences',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Professional Registration',
        description: 'Registration with relevant laboratory professional body',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'ID / Passport',
        description: 'Valid National ID or Passport',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
    ],
    radiologist: [
      {
        label: 'Radiology License',
        description: 'Medical degree with radiology specialization and professional registration',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Medical Degree',
        description: 'Bachelor of Medicine/Doctor of Medicine',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'ID / Passport',
        description: 'Valid National ID or Passport',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
    ],
    health_personnel: [
      {
        label: 'Professional License',
        description: 'Valid professional license or registration in healthcare field',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'ID / Passport',
        description: 'Valid National ID or Passport',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
    ],
    pharmacy: [
      {
        label: 'Business Registration',
        description: 'PACRA business registration certificate for the pharmacy',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Pharmacy License',
        description: 'ZPRA (Zambia Pharmaceutical Regulatory Authority) pharmacy license',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Tax Registration',
        description: 'Valid ZRA tax identification number and certificate',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Premises Inspection Certificate',
        description: 'Pharmacy premises inspection and approval certificate',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
    ],
    lab: [
      {
        label: 'Laboratory License',
        description: 'License from appropriate regulatory body for laboratory operations',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Accreditation Certificate',
        description: 'ISO 15189 or equivalent accreditation for medical testing',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Tax Registration',
        description: 'Valid ZRA tax identification and certificate',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
    ],
    institution_admin: [
      {
        label: 'Business Registration',
        description: 'PACRA business registration or certificate of incorporation',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Operating License',
        description: 'Ministry of Health healthcare facility operating license',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Tax Registration',
        description: 'Valid ZRA tax identification and certificate',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Accreditation Certificate (Recommended)',
        description: 'Healthcare quality accreditation or standards compliance certificate',
        required: false,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
    ],
  },
};

/**
 * South Africa - Document Requirements Configuration
 * Based on HPCSA and NDoH guidelines
 */
export const SOUTH_AFRICA_DOCUMENT_REQUIREMENTS: CountryDocumentRequirements = {
  country: 'ZA',
  countryName: 'South Africa',
  roles: {
    doctor: [
      {
        label: 'Medical Degree',
        description: 'Bachelor of Medicine/Doctor of Medicine from accredited institution',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'HPCSA Registration Certificate',
        description: 'Current Health Professions Council of South Africa registration',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Proof of Identity',
        description: 'South African ID or Passport',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
    ],
    nurse: [
      {
        label: 'Nursing Qualification',
        description: 'Nurse diploma or degree from accredited institution',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'SANC Registration',
        description: 'South African Nursing Council registration',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Proof of Identity',
        description: 'South African ID or Passport',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
    ],
    pharmacist: [
      {
        label: 'Pharmacy Degree',
        description: 'Bachelor of Pharmacy from accredited institution',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'SAPC Registration',
        description: 'South African Pharmacy Council registration',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Proof of Identity',
        description: 'South African ID or Passport',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
    ],
    pharmacy: [
      {
        label: 'Business Registration',
        description: 'CIPC business registration',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Pharmacy License',
        description: 'SAPC pharmacy premises license',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Tax Registration',
        description: 'SARS tax compliance status',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
    ],
    institution_admin: [
      {
        label: 'Business Registration',
        description: 'CIPC business registration or certificate of incorporation',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Health Facilities License',
        description: 'Provincial health authority operating license',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
      {
        label: 'Tax Registration',
        description: 'SARS tax compliance status',
        required: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
      },
    ],
  },
};

// Document requirements map by country
export const COUNTRY_DOCUMENT_REQUIREMENTS: Record<CountryCode, CountryDocumentRequirements> = {
  ZM: ZAMBIA_DOCUMENT_REQUIREMENTS,
  ZA: SOUTH_AFRICA_DOCUMENT_REQUIREMENTS,
  BW: ZAMBIA_DOCUMENT_REQUIREMENTS, // Use Zambia as default for Botswana
  MW: ZAMBIA_DOCUMENT_REQUIREMENTS, // Use Zambia as default for Malawi
  TZ: ZAMBIA_DOCUMENT_REQUIREMENTS, // Use Zambia as default for Tanzania
  // Additional launch countries
  KE: {
    country: 'KE',
    countryName: 'Kenya',
    roles: {
      doctor: [
        { label: 'KMPDC Practicing License', description: 'KMPDC annual license', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'Certificate of Registration', description: 'KMPDC registration', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'National ID / Passport', description: 'ID document', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'Certificate of Good Conduct', description: 'Issued in last 12 months', required: false, acceptedFormats: ['pdf','jpg','png'] },
      ],
      nurse: [
        { label: 'NCK Registration', description: 'Nursing Council registration', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'Nursing Qualification', description: 'Diploma or degree', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'National ID / Passport', description: 'ID document', required: true, acceptedFormats: ['pdf','jpg','png'] },
      ],
      pharmacy: [
        { label: 'PPB Premises License', description: 'Pharmacy and Poisons Board license', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'Superintendent Pharmacist License', description: 'PPB practice license', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'Certificate of Incorporation', description: 'CR12/Company docs', required: true, acceptedFormats: ['pdf','jpg','png'] },
      ],
      institution_admin: [],
    }
  },
  NG: {
    country: 'NG',
    countryName: 'Nigeria',
    roles: {
      doctor: [
        { label: 'MDCN Registration Certificate', description: 'MDCN full registration', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'MDCN Annual Practicing License', description: 'Current license', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'Degree Certificate', description: 'MBBS / BDS', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'NIN / Passport', description: 'National ID', required: true, acceptedFormats: ['pdf','jpg','png'] },
      ],
      nurse: [],
      pharmacy: [
        { label: 'PCN Premises Registration', description: 'PCN premises certificate', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'Superintendent Pharmacist License', description: 'PCN annual license', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'CAC Registration', description: 'CAC business registration', required: true, acceptedFormats: ['pdf','jpg','png'] },
      ],
      institution_admin: [],
    }
  },
  GB: {
    country: 'GB',
    countryName: 'United Kingdom',
    roles: {
      doctor: [
        { label: 'GMC Reference / License', description: 'GMC registration and license to practise', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'DBS Check', description: 'Enhanced DBS disclosure', required: true, acceptedFormats: ['pdf'] },
        { label: 'Indemnity Insurance', description: 'MDU/MPS insurance certificate', required: true, acceptedFormats: ['pdf'] },
      ],
      nurse: [
        { label: 'NMC Registration', description: 'Nursing & Midwifery Council registration', required: true, acceptedFormats: ['pdf','jpg','png'] },
      ],
      pharmacy: [
        { label: 'GPhC Premises Registration', description: 'Pharmacy premises registration number', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'Superintendent Pharmacist GPhC Registration', description: 'Responsible pharmacist registration', required: true, acceptedFormats: ['pdf','jpg','png'] },
      ],
      institution_admin: [],
    }
  },
  US: {
    country: 'US',
    countryName: 'United States',
    roles: {
      doctor: [
        { label: 'State Medical License', description: 'State board license (active)', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'NPI Number Proof', description: 'NPI listing / screenshot', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'DEA Registration', description: 'If applicable (controlled substances)', required: false, acceptedFormats: ['pdf'] },
        { label: 'Malpractice Insurance', description: 'Proof of coverage', required: true, acceptedFormats: ['pdf'] },
      ],
      nurse: [],
      pharmacy: [
        { label: 'State Board Pharmacy License', description: 'Retail pharmacy license', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'NCPDP / NPI Numbers', description: 'Identifiers', required: true, acceptedFormats: ['pdf','jpg','png'] },
        { label: 'DEA Chemical Registration', description: 'If applicable', required: false, acceptedFormats: ['pdf'] },
      ],
      institution_admin: [],
    }
  },
};

/**
 * Get document requirements for a specific country and role
 * Falls back to Zambia if country not found
 */
export function getDocumentRequirements(
  countryCode: CountryCode = 'ZM',
  roleType: string
): DocumentRequirement[] {
  const countryConfig = COUNTRY_DOCUMENT_REQUIREMENTS[countryCode] || COUNTRY_DOCUMENT_REQUIREMENTS['ZM'];
  return countryConfig.roles[roleType] || [];
}

/**
 * Get only required documents for a role
 */
export function getRequiredDocuments(countryCode: CountryCode = 'ZM', roleType: string): string[] {
  const requirements = getDocumentRequirements(countryCode, roleType);
  return requirements
    .filter(doc => doc.required)
    .map(doc => doc.label);
}

/**
 * Get all documents (required + optional) for a role as simple string array
 * For backward compatibility with UI components
 */
export function getDocumentLabels(countryCode: CountryCode = 'ZM', roleType: string): string[] {
  const requirements = getDocumentRequirements(countryCode, roleType);
  return requirements.map(doc => doc.label);
}

/**
 * Check if all required documents have been uploaded
 */
export function areRequiredDocumentsComplete(
  countryCode: CountryCode = 'ZM',
  roleType: string,
  uploadedDocLabels: string[]
): boolean {
  const requiredDocs = getRequiredDocuments(countryCode, roleType);
  return requiredDocs.every(required =>
    uploadedDocLabels.some(uploaded => uploaded.includes(required))
  );
}

// Default export for easy importing
export default {
  ZAMBIA_DOCUMENT_REQUIREMENTS,
  SOUTH_AFRICA_DOCUMENT_REQUIREMENTS,
  COUNTRY_DOCUMENT_REQUIREMENTS,
  getDocumentRequirements,
  getRequiredDocuments,
  getDocumentLabels,
  areRequiredDocumentsComplete,
};
