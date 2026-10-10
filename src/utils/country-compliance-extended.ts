/**
 * Extended country compliance profiles — high-value expansion markets.
 * Appends to the base COUNTRY_COMPLIANCE in country-compliance.ts.
 *
 * Covers: USA, Canada, UK, Australia, UAE, India, Botswana, Namibia.
 * Each profile is fully implemented: insurance, tax, data protection,
 * payments, medical regulation, languages.
 */

import type { CountryCompliance } from "./country-compliance";

export const EXTENDED_COUNTRIES: Record<string, CountryCompliance> = {
  // ═══════════════════════════════════════════════════════════
  // UNITED STATES
  // ═══════════════════════════════════════════════════════════
  US: {
    code: "US",
    name: "United States",
    currency: "US Dollar",
    currencySymbol: "$",
    currencyCode: "USD",
    statutoryScheme: {
      name: "Multi-payer (Medicare/Medicaid/ACA/Employer)",
      shortName: "Medicare/Medicaid/ACA",
      mandatory: false,
      dependants: "Varies by plan (typically spouse + children to age 26)",
      notes: "No universal coverage. Medicare (65+), Medicaid (low-income), ACA marketplace, employer-sponsored. 2026 ACA OOP max: $10,600 individual / $21,200 family. CMS FHIR prior-auth APIs mandatory Jan 2027. HIPAA e-attachments rule: compliance by Jan 2027.",
    },
    vat: {
      rate: 0,
      name: "Sales Tax (state-level)",
      medicalExempt: true,
      notes: "No federal VAT. State sales tax 0-10%; healthcare generally exempt. Billing uses CPT/HCPCS codes.",
    },
    dataProtection: {
      law: "HIPAA + state laws (CCPA/CPRA)",
      consentRequired: true,
      retentionYears: 6,
      crossBorderRestricted: true,
      notes: "HIPAA Privacy + Security Rules. Breach notification 60 days (internal flag 24h per 2026 guidance). Penalties $100-$50,000+ per violation. BAAs required for all vendors.",
    },
    mobileMoney: [],
    paymentNotes: "Cards (Stripe), ACH, HSA/FSA cards. Insurance EDI 837P/835.",
    medicalRegulator: "State Medical Boards (FSMB)",
    facilityAccreditation: "Joint Commission / CMS CoP. NPI required for billing.",
    languages: ["English", "Spanish"],
    defaultLanguage: "English",
  },

  // ═══════════════════════════════════════════════════════════
  // CANADA
  // ═══════════════════════════════════════════════════════════
  CA: {
    code: "CA",
    name: "Canada",
    currency: "Canadian Dollar",
    currencySymbol: "C$",
    currencyCode: "CAD",
    statutoryScheme: {
      name: "Provincial Health Insurance (OHIP/MSP/RAMQ/AHCIP)",
      shortName: "Provincial (OHIP/MSP/RAMQ)",
      mandatory: true,
      dependants: "Spouse + dependants (varies by province)",
      notes: "Universal, tax-funded, provincially administered. OHIP (Ontario), MSP (BC), RAMQ (Quebec), AHCIP (Alberta). Covers medically necessary hospital + physician services. Prescription drugs: provincial plans vary (OHIP+ for under-25). Private supplementary for dental/vision/drugs.",
    },
    vat: {
      rate: 5,
      name: "GST + PST/HST",
      medicalExempt: true,
      notes: "Federal GST 5% + provincial PST/HST (combined up to 15%). Healthcare services exempt. Medical devices may be zero-rated.",
    },
    dataProtection: {
      law: "PIPEDA + provincial health laws (PHIPA Ontario, HIA Alberta, Law 25 Quebec)",
      consentRequired: true,
      retentionYears: 10,
      crossBorderRestricted: true,
      notes: "No single health privacy law. Ontario: PHIPA governs custodians. Quebec Law 25: strictest, PIAs mandatory, large fines. Federal PIPEDA as baseline.",
    },
    mobileMoney: [],
    paymentNotes: "Interac e-Transfer dominant. Cards (Stripe). Provincial billing via HSO codes.",
    medicalRegulator: "Provincial Colleges (CPSO Ontario, CPSBC, CMQ Quebec)",
    facilityAccreditation: "Provincial ministry licensing. CPSO facility accreditation for private clinics.",
    languages: ["English", "French"],
    defaultLanguage: "English",
  },

  // ═══════════════════════════════════════════════════════════
  // UNITED KINGDOM
  // ═══════════════════════════════════════════════════════════
  GB: {
    code: "GB",
    name: "United Kingdom",
    currency: "British Pound",
    currencySymbol: "£",
    currencyCode: "GBP",
    statutoryScheme: {
      name: "National Health Service",
      shortName: "NHS",
      mandatory: true,
      dependants: "All UK residents",
      notes: "Universal, tax-funded, free at point of use. Funded via National Insurance + general taxation. Private top-up: Bupa, AXA Health, Aviva. NHS number required for records.",
    },
    vat: {
      rate: 20,
      name: "VAT",
      medicalExempt: true,
      notes: "Healthcare VAT-exempt. Standard VAT 20% on non-medical.",
    },
    dataProtection: {
      law: "UK GDPR + Data Protection Act 2018",
      consentRequired: true,
      retentionYears: 8,
      crossBorderRestricted: true,
      notes: "ICO enforced. Health data = special category. NHS Data Security and Protection Toolkit for providers. Caldicott Principles for data sharing.",
    },
    mobileMoney: [],
    paymentNotes: "Faster Payments, Direct Debit. Private billing via standard invoices.",
    medicalRegulator: "General Medical Council (GMC)",
    facilityAccreditation: "Care Quality Commission (CQC) registration mandatory for providers.",
    languages: ["English"],
    defaultLanguage: "English",
  },

  // ═══════════════════════════════════════════════════════════
  // AUSTRALIA
  // ═══════════════════════════════════════════════════════════
  AU: {
    code: "AU",
    name: "Australia",
    currency: "Australian Dollar",
    currencySymbol: "A$",
    currencyCode: "AUD",
    statutoryScheme: {
      name: "Medicare + Pharmaceutical Benefits Scheme",
      shortName: "Medicare/PBS",
      mandatory: true,
      employeeContributionPct: 2,
      dependants: "Spouse + dependent children",
      notes: "Universal via 2% Medicare levy on taxable income. Covers public hospital, GP (bulk-billed), PBS subsidised drugs. Private: Bupa, Medibank, HCF for choice/waitlist bypass. IHI (Individual Healthcare Identifier) required.",
    },
    vat: {
      rate: 10,
      name: "GST",
      medicalExempt: true,
      notes: "Healthcare GST-free. Standard GST 10%.",
    },
    dataProtection: {
      law: "Privacy Act 1988 + My Health Records Act 2012",
      consentRequired: true,
      retentionYears: 7,
      crossBorderRestricted: true,
      notes: "OAIC enforced. Health = sensitive information. My Health Record opt-out system. Notifiable Data Breaches scheme.",
    },
    mobileMoney: [],
    paymentNotes: "Cards, BPAY, Medicare Easyclaim (real-time rebates).",
    medicalRegulator: "AHPRA (Australian Health Practitioner Regulation Agency)",
    facilityAccreditation: "NSQHS Standards accreditation for hospitals.",
    languages: ["English"],
    defaultLanguage: "English",
  },

  // ═══════════════════════════════════════════════════════════
  // UNITED ARAB EMIRATES
  // ═══════════════════════════════════════════════════════════
  AE: {
    code: "AE",
    name: "United Arab Emirates",
    currency: "UAE Dirham",
    currencySymbol: "AED",
    currencyCode: "AED",
    statutoryScheme: {
      name: "Mandatory Employer Health Insurance (DHA/DoH/SEHA)",
      shortName: "DHA/DoH Mandatory",
      mandatory: true,
      dependants: "Spouse + children (employer or individual)",
      notes: "Employer MUST provide health insurance (Dubai: DHA, Abu Dhabi: DoH/Thiqa, Northern Emirates: MOH). Minimum benefits set by regulator. Expats: employer-sponsored. Tourists: travel insurance required.",
    },
    vat: {
      rate: 5,
      name: "VAT",
      medicalExempt: true,
      notes: "Healthcare VAT-exempt. Standard VAT 5%.",
    },
    dataProtection: {
      law: "UAE Federal Data Protection Law (2021) + DHA Health Data Law",
      consentRequired: true,
      retentionYears: 10,
      crossBorderRestricted: true,
      notes: "Health data = sensitive. In-country hosting preferred. DHA regulates health data in Dubai.",
    },
    mobileMoney: [],
    paymentNotes: "Cards dominant. Tabby/Tamara (BNPL). Insurance e-claims via DHA eClaimLink.",
    medicalRegulator: "DHA (Dubai) / DoH (Abu Dhabi) / MOH (Northern Emirates)",
    facilityAccreditation: "DHA/DoH facility licensing. eClaimLink for insurance billing.",
    languages: ["Arabic", "English"],
    defaultLanguage: "English",
  },

  // ═══════════════════════════════════════════════════════════
  // INDIA
  // ═══════════════════════════════════════════════════════════
  IN: {
    code: "IN",
    name: "India",
    currency: "Indian Rupee",
    currencySymbol: "₹",
    currencyCode: "INR",
    statutoryScheme: {
      name: "Ayushman Bharat PM-JAY + State Schemes + ESI",
      shortName: "PM-JAY/ABHA",
      mandatory: false,
      dependants: "Family (up to 5 lakh/year cover under PM-JAY)",
      notes: "PM-JAY: world's largest health assurance, ₹5 lakh/family/year for 500M+ beneficiaries. ESI for formal workers. ABHA (health ID) for digital records. Private: Star Health, HDFC Ergo, ICICI Lombard.",
    },
    vat: {
      rate: 18,
      name: "GST",
      medicalExempt: true,
      notes: "Healthcare services GST-exempt. Standard GST 18% (slabs 5/12/18/28%).",
    },
    dataProtection: {
      law: "Digital Personal Data Protection Act, 2023 (DPDP)",
      consentRequired: true,
      retentionYears: 7,
      crossBorderRestricted: true,
      notes: "Health = sensitive. ABDM (Ayushman Bharat Digital Mission) for health data exchange. Consent managers required.",
    },
    mobileMoney: [],
    paymentNotes: "UPI dominant (PhonePe, GPay, Paytm). Cards, netbanking. ABHA-linked payments.",
    medicalRegulator: "National Medical Commission (NMC)",
    facilityAccreditation: "NABH accreditation. PM-JAY empanelment for scheme billing.",
    languages: ["Hindi", "English", "Bengali", "Telugu", "Marathi", "Tamil"],
    defaultLanguage: "English",
  },

  // ═══════════════════════════════════════════════════════════
  // BOTSWANA
  // ═══════════════════════════════════════════════════════════
  BW: {
    code: "BW",
    name: "Botswana",
    currency: "Botswana Pula",
    currencySymbol: "P",
    currencyCode: "BWP",
    statutoryScheme: null,
    vat: {
      rate: 14,
      name: "VAT",
      medicalExempt: true,
      notes: "Healthcare VAT-exempt. Standard VAT 14%.",
    },
    dataProtection: {
      law: "Data Protection Act, 2018",
      consentRequired: true,
      retentionYears: 7,
      crossBorderRestricted: true,
      notes: "Health data = sensitive personal data.",
    },
    mobileMoney: [
      { operator: "Orange Money", prefix: ["073", "074", "075"] },
      { operator: "Mascom MyZaka", prefix: ["071", "072", "076"] },
    ],
    paymentNotes: "Medical aid societies: BPOMAS, BOMaid, Pula Medical Aid.",
    medicalRegulator: "Botswana Health Professions Council (BHPC)",
    facilityAccreditation: "Medical aid accreditation for private billing.",
    languages: ["English", "Setswana"],
    defaultLanguage: "English",
  },

  // ═══════════════════════════════════════════════════════════
  // NAMIBIA
  // ═══════════════════════════════════════════════════════════
  NA: {
    code: "NA",
    name: "Namibia",
    currency: "Namibian Dollar",
    currencySymbol: "N$",
    currencyCode: "NAD",
    statutoryScheme: null,
    vat: {
      rate: 15,
      name: "VAT",
      medicalExempt: true,
      notes: "Healthcare VAT-exempt. Standard VAT 15%. NAD pegged 1:1 to ZAR.",
    },
    dataProtection: {
      law: "Data Protection Bill (draft)",
      consentRequired: true,
      retentionYears: 7,
      crossBorderRestricted: true,
      notes: "No comprehensive law yet; common-law privacy + sectoral rules apply.",
    },
    mobileMoney: [
      { operator: "MTC Money", prefix: ["081"] },
      { operator: "TN Mobile", prefix: ["082"] },
    ],
    paymentNotes: "Medical aid: NMC, Renaissance, Prosperity Health.",
    medicalRegulator: "Health Professions Council of Namibia (HPCNA)",
    facilityAccreditation: "Medical aid fund accreditation.",
    languages: ["English", "Afrikaans", "German", "Oshiwambo"],
    defaultLanguage: "English",
  },
};
