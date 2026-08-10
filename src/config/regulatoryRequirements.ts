export interface DocumentRequirement {
  id: string;
  name: string;
  description: string;
  required: boolean;
  fileType?: string[];
  maxSizeMB?: number;
}

export interface CountryRequirements {
  countryCode: string;
  countryName: string;
  healthcareProfessionals: DocumentRequirement[];
  pharmacies: DocumentRequirement[];
  institutions: DocumentRequirement[];
}

export const REGULATORY_REQUIREMENTS: Record<string, CountryRequirements> = {
  ZM: {
    countryCode: 'ZM',
    countryName: 'Zambia',
    healthcareProfessionals: [
      {
        id: 'hpcz_registration',
        name: 'HPCZ Registration Certificate',
        description: 'Full or Provisional registration from Health Professions Council of Zambia',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'hpcz_practicing',
        name: 'Current Annual HPCZ Practicing Certificate',
        description: 'Valid for current charge year',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'academic_qualifications',
        name: 'Certified Academic Qualifications',
        description: 'MBChB, BDS, BNSc degree certificates',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'national_id',
        name: 'National Registration Card (NRC) or Passport',
        description: 'Valid identification document',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'internship_certificate',
        name: 'Proof of Internship Completion',
        description: 'For newly qualified doctors',
        required: false,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ],
    pharmacies: [
      {
        id: 'zamra_license',
        name: 'ZAMRA Pharmaceutical License',
        description: 'Certificate of Premises Registration from Zambia Medicines Regulatory Authority',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'superintendent_hpcz',
        name: 'Superintendent Pharmacist HPCZ Practicing Certificate',
        description: 'Current practicing certificate for responsible pharmacist',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'business_registration',
        name: 'PACRA Certificate of Incorporation',
        description: 'Business Registration Certificate',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'employment_contract',
        name: 'Signed Employment Contract',
        description: 'Contract of the Responsible Pharmacist',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'inspection_report',
        name: 'ZAMRA Inspection Report / Site Master File',
        description: 'Site inspection documentation',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ],
    institutions: [
      {
        id: 'institution_license',
        name: 'Health Facility License',
        description: 'License from Ministry of Health',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'business_registration',
        name: 'PACRA Certificate of Incorporation',
        description: 'Business Registration Certificate',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'premises_documentation',
        name: 'Premises Documentation',
        description: 'Proof of ownership or lease agreement',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ]
  },
  KE: {
    countryCode: 'KE',
    countryName: 'Kenya',
    healthcareProfessionals: [
      {
        id: 'kmpdc_retention',
        name: 'KMPDC Annual Retention Certificate',
        description: 'Practicing License from Kenya Medical Practitioners and Dentists Council',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'kmpdc_registration',
        name: 'Certificate of Registration',
        description: 'Registration as Medical Practitioner/Dentist',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'national_id',
        name: 'National ID / Alien ID / Passport',
        description: 'Valid identification document',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'good_conduct',
        name: 'Certificate of Good Conduct',
        description: 'DCI issued within last 12 months',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'epic_verification',
        name: 'EPIC Verification Report',
        description: 'For foreign-trained practitioners',
        required: false,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ],
    pharmacies: [
      {
        id: 'ppb_license',
        name: 'PPB Annual License to Practice',
        description: 'License to Operate Pharmaceutical Premises from Pharmacy and Poisons Board',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'superintendent_ppb',
        name: 'Superintendent Pharmacist PPB Practice License',
        description: 'Minimum 3 years post-enrolment',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'business_registration',
        name: 'Certificate of Incorporation (CR12)',
        description: 'Business registration document',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ],
    institutions: [
      {
        id: 'facility_license',
        name: 'Health Facility License',
        description: 'License from Ministry of Health',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'business_registration',
        name: 'Certificate of Incorporation (CR12)',
        description: 'Business registration document',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ]
  },
  NG: {
    countryCode: 'NG',
    countryName: 'Nigeria',
    healthcareProfessionals: [
      {
        id: 'mdcn_registration',
        name: 'MDCN Full Registration Certificate',
        description: 'Registration with Folio Number from Medical and Dental Council of Nigeria',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'mdcn_license',
        name: 'Current MDCN Annual Practicing License',
        description: 'Valid annual practicing license',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'degree_certificate',
        name: 'Degree Certificate',
        description: 'MBBS / BDS degree certificate',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'national_id',
        name: 'National ID (NIN) / International Passport',
        description: 'Valid identification document',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ],
    pharmacies: [
      {
        id: 'pcn_premises',
        name: 'PCN Annual Premises Registration Certificate',
        description: 'Registration from Pharmacy Council of Nigeria',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'superintendent_pcn',
        name: 'Superintendent Pharmacist PCN Annual License & Practice Seal',
        description: 'Valid license and practice seal',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'cac_registration',
        name: 'CAC Business Registration Certificate',
        description: 'Form CAC 1.1 / CAC 7',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ],
    institutions: [
      {
        id: 'facility_license',
        name: 'Health Facility License',
        description: 'License from Federal Ministry of Health',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'cac_registration',
        name: 'CAC Business Registration Certificate',
        description: 'Form CAC 1.1 / CAC 7',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ]
  },
  ZA: {
    countryCode: 'ZA',
    countryName: 'South Africa',
    healthcareProfessionals: [
      {
        id: 'hpcsa_registration',
        name: 'HPCSA Registration Certificate',
        description: 'Registration from Health Professions Council of South Africa',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'hpcsa_card',
        name: 'HPCSA Card',
        description: 'Current HPCSA registration card',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'fee_payment',
        name: 'Proof of Annual Fee Payment',
        description: 'Evidence of active practicing status',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'id_document',
        name: 'ID Document / Passport',
        description: 'Valid identification document',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ],
    pharmacies: [
      {
        id: 'sapc_recording',
        name: 'SAPC Pharmacy Recording / Registration Certificate',
        description: 'Certificate from South African Pharmacy Council',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'responsible_sapc',
        name: 'Responsible Pharmacist SAPC Registration',
        description: 'Registration and practice certificate',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'cipc_registration',
        name: 'CIPC Company Registration Certificate',
        description: 'Business registration document',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ],
    institutions: [
      {
        id: 'facility_license',
        name: 'Health Facility License',
        description: 'License from Department of Health',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'cipc_registration',
        name: 'CIPC Company Registration Certificate',
        description: 'Business registration document',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ]
  },
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    healthcareProfessionals: [
      {
        id: 'gmc_reference',
        name: 'GMC Reference Number & License to Practise',
        description: 'General Medical Council registration and license status',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'dbs_check',
        name: 'DBS Check',
        description: 'Enhanced Disclosure and Barring Service check',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'indemnity_insurance',
        name: 'Medical Defence Union Insurance',
        description: 'Indemnity insurance (MDU/MPS)',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ],
    pharmacies: [
      {
        id: 'gphc_premises',
        name: 'GPhC Pharmacy Premises Registration Number',
        description: 'General Pharmaceutical Council registration',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'superintendent_gphc',
        name: 'Superintendent Pharmacist GPhC Registration Number',
        description: 'GPhC registration number',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ],
    institutions: [
      {
        id: 'cqc_registration',
        name: 'CQC Registration',
        description: 'Care Quality Commission registration',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'companies_house',
        name: 'Companies House Registration',
        description: 'Business registration document',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ]
  },
  US: {
    countryCode: 'US',
    countryName: 'United States',
    healthcareProfessionals: [
      {
        id: 'state_license',
        name: 'State Medical Board License Certificate',
        description: 'Active state medical board license',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'npi_number',
        name: 'NPI Number',
        description: 'National Provider Identifier (verified on NPPES)',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'dea_registration',
        name: 'DEA Registration Number',
        description: 'Drug Enforcement Administration registration (if prescribing controlled substances)',
        required: false,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'malpractice_insurance',
        name: 'Malpractice Insurance Coverage Certificate',
        description: 'Proof of professional liability insurance',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ],
    pharmacies: [
      {
        id: 'state_pharmacy_license',
        name: 'State Board of Pharmacy Retail Pharmacy License',
        description: 'Valid state pharmacy license',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'npi_number',
        name: 'NPI Number',
        description: 'National Provider Identifier',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'ncpdp_number',
        name: 'NCPDP Number',
        description: 'National Council for Prescription Drug Programs number',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'dea_registration',
        name: 'DEA Chemical Registration',
        description: 'Drug Enforcement Administration registration',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ],
    institutions: [
      {
        id: 'state_license',
        name: 'State Health Facility License',
        description: 'License from state health department',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      },
      {
        id: 'business_registration',
        name: 'Business Registration',
        description: 'State business registration document',
        required: true,
        fileType: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeMB: 5
      }
    ]
  }
};

export const getCountryRequirements = (countryCode: string, entityType: 'healthcareProfessionals' | 'pharmacies' | 'institutions'): DocumentRequirement[] => {
  const country = REGULATORY_REQUIREMENTS[countryCode.toUpperCase()];
  if (!country) return [];
  return country[entityType] || [];
};

export const validateDocumentUpload = (uploadedDocs: Record<string, string>, requirements: DocumentRequirement[]): { valid: boolean; missing: string[] } => {
  const missing: string[] = [];
  
  for (const req of requirements) {
    if (req.required && !uploadedDocs[req.id]) {
      missing.push(req.name);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
};
