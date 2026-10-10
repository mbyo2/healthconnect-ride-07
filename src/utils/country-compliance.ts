/**
 * Country Compliance Framework — Doc'O Clock multi-country expansion.
 *
 * Like Odoo's localization: when a user selects their country, the platform
 * automatically configures:
 * - Health insurance framework (statutory scheme, contribution rates, tariffs)
 * - Tax compliance (VAT rate, invoicing requirements)
 * - Data protection law (consent, retention, cross-border rules)
 * - Currency and payment methods (mobile money operators, banks)
 * - Medical regulatory body (licensing, facility accreditation)
 * - Languages
 *
 * Each country profile is self-contained. Adding a new country = adding one
 * object here + its insurance tariff module.
 */

export interface CountryCompliance {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  currency: string;
  currencySymbol: string;
  currencyCode: string; // ISO 4217

  // ── Health insurance ──
  statutoryScheme: {
    name: string;
    shortName: string;
    mandatory: boolean;
    employeeContributionPct?: number;
    employerContributionPct?: number;
    flatMonthlyFee?: { amount: number; currency: string; appliesTo: string };
    dependants: string;
    notes: string;
  } | null;

  // ── Tax ──
  vat: {
    rate: number; // percent
    name: string; // e.g. "VAT", "GST"
    medicalExempt: boolean;
    notes: string;
  };

  // ── Data protection ──
  dataProtection: {
    law: string;
    consentRequired: boolean;
    retentionYears: number;
    crossBorderRestricted: boolean;
    notes: string;
  };

  // ── Payments ──
  mobileMoney: { operator: string; prefix: string[] }[];
  paymentNotes: string;

  // ── Medical regulation ──
  medicalRegulator: string;
  facilityAccreditation: string;

  // ── Languages ──
  languages: string[];
  defaultLanguage: string;
}

export const COUNTRY_COMPLIANCE: Record<string, CountryCompliance> = {
  // ═══════════════════════════════════════════════════════════
  // ZAMBIA (home market)
  // ═══════════════════════════════════════════════════════════
  ZM: {
    code: "ZM",
    name: "Zambia",
    currency: "Zambian Kwacha",
    currencySymbol: "K",
    currencyCode: "ZMW",

    statutoryScheme: {
      name: "National Health Insurance Management Authority",
      shortName: "NHIMA",
      mandatory: true,
      employeeContributionPct: 1,
      employerContributionPct: 1,
      dependants: "Spouse + 5 children under 18",
      notes: "Compulsory for all earning residents. 2025 OPD tariff: K600 cap (K200 consult, K150 drugs, K150 lab, K50 registration, K50 consumables). Chronic: K1,200/visit, 1 visit per 3 months. Claims payable within 45 days. Mandatory claim bills since Oct 2025.",
    },

    vat: {
      rate: 16,
      name: "VAT",
      medicalExempt: true,
      notes: "Medical services are VAT-exempt. Standard VAT 16% on non-medical goods/services.",
    },

    dataProtection: {
      law: "Data Protection Act No. 3 of 2021",
      consentRequired: true,
      retentionYears: 7,
      crossBorderRestricted: true,
      notes: "Health data is sensitive personal data. Explicit consent required. Cross-border transfer needs adequacy or safeguards.",
    },

    mobileMoney: [
      { operator: "MTN", prefix: ["096", "076"] },
      { operator: "Airtel", prefix: ["097", "077"] },
      { operator: "Zamtel", prefix: ["095"] },
    ],
    paymentNotes: "Lenco (cards + mobile money), PayPal. Cash dominant in healthcare.",

    medicalRegulator: "Health Professions Council of Zambia (HPCZ)",
    facilityAccreditation: "NHIMA facility accreditation required for insurance billing.",

    languages: ["English", "Bemba", "Nyanja", "Tonga", "Lozi"],
    defaultLanguage: "English",
  },

  // ═══════════════════════════════════════════════════════════
  // KENYA
  // ═══════════════════════════════════════════════════════════
  KE: {
    code: "KE",
    name: "Kenya",
    currency: "Kenyan Shilling",
    currencySymbol: "KES",
    currencyCode: "KES",

    statutoryScheme: {
      name: "Social Health Authority",
      shortName: "SHA/SHIF",
      mandatory: true,
      employeeContributionPct: 2.75,
      dependants: "Spouse + children (registered via Afya Yangu)",
      notes: "Replaced NHIF Oct 2024. 2.75% of gross salary, min KES 300/month. Informal: KES 500/month/household. Three funds: SHIF, Primary Healthcare Fund, Emergency/Chronic/Critical Illness Fund. Tax-deductible.",
    },

    vat: {
      rate: 16,
      name: "VAT",
      medicalExempt: true,
      notes: "Healthcare services VAT-exempt. Standard VAT 16%.",
    },

    dataProtection: {
      law: "Data Protection Act, 2019",
      consentRequired: true,
      retentionYears: 7,
      crossBorderRestricted: true,
      notes: "Enforced by ODPC. Health data = sensitive. Data Protection Impact Assessment may be required.",
    },

    mobileMoney: [
      { operator: "M-PESA (Safaricom)", prefix: ["07", "01"] },
      { operator: "Airtel Money", prefix: ["073", "078"] },
      { operator: "T-Kash (Telkom)", prefix: ["077"] },
    ],
    paymentNotes: "M-PESA dominant (90%+ of mobile money). Cards via DPO/Pesapal.",

    medicalRegulator: "Kenya Medical Practitioners and Dentists Council (KMPDC)",
    facilityAccreditation: "SHA empanelment required for SHIF billing. KMPDC facility licensing.",

    languages: ["English", "Swahili"],
    defaultLanguage: "English",
  },

  // ═══════════════════════════════════════════════════════════
  // TANZANIA
  // ═══════════════════════════════════════════════════════════
  TZ: {
    code: "TZ",
    name: "Tanzania",
    currency: "Tanzanian Shilling",
    currencySymbol: "TZS",
    currencyCode: "TZS",

    statutoryScheme: {
      name: "National Health Insurance Fund",
      shortName: "NHIF",
      mandatory: true,
      employeeContributionPct: 3,
      employerContributionPct: 3,
      dependants: "Spouse + up to 4 children under 18",
      notes: "6% total (3% employee + 3% employer) for formal sector. Informal: CHF/TIKA community schemes. Universal Health Insurance Bill expanding mandatory coverage.",
    },

    vat: {
      rate: 18,
      name: "VAT",
      medicalExempt: true,
      notes: "Healthcare VAT-exempt. Standard VAT 18%.",
    },

    dataProtection: {
      law: "Personal Data Protection Act, 2022",
      consentRequired: true,
      retentionYears: 7,
      crossBorderRestricted: true,
      notes: "Enforced by PDPC. Local data residency preferred for health data.",
    },

    mobileMoney: [
      { operator: "M-Pesa (Vodacom)", prefix: ["074", "075", "076"] },
      { operator: "Tigo Pesa", prefix: ["065", "067", "071"] },
      { operator: "Airtel Money", prefix: ["068", "069", "078"] },
      { operator: "Halopesa", prefix: ["062"] },
    ],
    paymentNotes: "Mobile money dominant. Cards via DPO.",

    medicalRegulator: "Medical Council of Tanganyika (MCT)",
    facilityAccreditation: "NHIF accreditation for insurance billing.",

    languages: ["Swahili", "English"],
    defaultLanguage: "Swahili",
  },

  // ═══════════════════════════════════════════════════════════
  // ZIMBABWE
  // ═══════════════════════════════════════════════════════════
  ZW: {
    code: "ZW",
    name: "Zimbabwe",
    currency: "Zimbabwe Gold",
    currencySymbol: "ZiG",
    currencyCode: "ZWG",

    statutoryScheme: {
      name: "National Health Insurance (planned)",
      shortName: "NHI (planned)",
      mandatory: false,
      dependants: "TBD",
      notes: "No statutory health insurance yet. NHI Bill approved in principle, rollout planned June 2026, funded via ring-fenced taxes (sugar levy, airtime tax). Currently: private medical aid societies (CIMAS, Alliance, First Mutual) cover ~13%. NSSA covers pensions/workers comp only.",
    },

    vat: {
      rate: 15,
      name: "VAT",
      medicalExempt: true,
      notes: "Healthcare VAT-exempt. Standard VAT 15%.",
    },

    dataProtection: {
      law: "Data Protection Act [Chapter 11:12]",
      consentRequired: true,
      retentionYears: 7,
      crossBorderRestricted: true,
      notes: "Enforced by POTRAZ. Health data = sensitive personal information.",
    },

    mobileMoney: [
      { operator: "EcoCash (Econet)", prefix: ["077", "078"] },
      { operator: "OneMoney (NetOne)", prefix: ["071"] },
      { operator: "Telecash (Telecel)", prefix: ["073"] },
    ],
    paymentNotes: "EcoCash dominant. Multi-currency: USD widely used alongside ZiG.",

    medicalRegulator: "Health Professions Authority of Zimbabwe (HPA)",
    facilityAccreditation: "Medical Aid Societies Regulatory Authority (planned). Currently via individual medical aid contracts.",

    languages: ["English", "Shona", "Ndebele"],
    defaultLanguage: "English",
  },

  // ═══════════════════════════════════════════════════════════
  // MALAWI
  // ═══════════════════════════════════════════════════════════
  MW: {
    code: "MW",
    name: "Malawi",
    currency: "Malawian Kwacha",
    currencySymbol: "MK",
    currencyCode: "MWK",

    statutoryScheme: null, // No statutory health insurance
    // Note: Malawi has no mandatory health insurance. Healthcare primarily
    // public/tax-funded. Private: MASM (Medical Aid Society of Malawi).

    vat: {
      rate: 16.5,
      name: "VAT",
      medicalExempt: true,
      notes: "Healthcare VAT-exempt. Standard VAT 16.5%.",
    },

    dataProtection: {
      law: "Data Protection Act, 2024",
      consentRequired: true,
      retentionYears: 7,
      crossBorderRestricted: true,
      notes: "New law. Health data = sensitive. Implementation ongoing.",
    },

    mobileMoney: [
      { operator: "TNM Mpamba", prefix: ["088", "099"] },
      { operator: "Airtel Money", prefix: ["099", "098"] },
    ],
    paymentNotes: "TNM Mpamba and Airtel Money. MASM is the main private medical aid.",

    medicalRegulator: "Medical Council of Malawi",
    facilityAccreditation: "MASM provider accreditation for private billing.",

    languages: ["English", "Chichewa"],
    defaultLanguage: "English",
  },

  // ═══════════════════════════════════════════════════════════
  // SOUTH AFRICA
  // ═══════════════════════════════════════════════════════════
  ZA: {
    code: "ZA",
    name: "South Africa",
    currency: "South African Rand",
    currencySymbol: "R",
    currencyCode: "ZAR",

    statutoryScheme: {
      name: "National Health Insurance (phased rollout)",
      shortName: "NHI",
      mandatory: false,
      dependants: "TBD",
      notes: "NHI Act signed 2024, phased implementation over years. Currently: private medical schemes (Discovery, Bonitas, Momentum) regulated by CMS. Prescribed Minimum Benefits (PMBs) mandatory for all schemes.",
    },

    vat: {
      rate: 15,
      name: "VAT",
      medicalExempt: false,
      notes: "Medical services generally VAT-able at 15% (unlike most African markets). Medical scheme contributions exempt.",
    },

    dataProtection: {
      law: "Protection of Personal Information Act (POPIA)",
      consentRequired: true,
      retentionYears: 7,
      crossBorderRestricted: true,
      notes: "POPIA fully enforced. Health data = special personal information. Information Regulator oversight. Strict breach notification (72h).",
    },

    mobileMoney: [
      { operator: "MTN MoMo", prefix: ["083", "073"] },
      { operator: "Vodacom", prefix: ["082", "079"] },
    ],
    paymentNotes: "Cards dominant (SnapScan, Zapper, PayFast). Medical schemes use EDI claiming.",

    medicalRegulator: "Health Professions Council of South Africa (HPCSA)",
    facilityAccreditation: "CMS accreditation for medical scheme billing. BHF practice numbers required.",

    languages: ["English", "Zulu", "Xhosa", "Afrikaans", "Sotho", "Tswana"],
    defaultLanguage: "English",
  },

  // ═══════════════════════════════════════════════════════════
  // NIGERIA
  // ═══════════════════════════════════════════════════════════
  NG: {
    code: "NG",
    name: "Nigeria",
    currency: "Nigerian Naira",
    currencySymbol: "₦",
    currencyCode: "NGN",

    statutoryScheme: {
      name: "National Health Insurance Authority",
      shortName: "NHIA",
      mandatory: true,
      dependants: "Spouse + up to 4 children under 18",
      notes: "NHIA Act 2022 made insurance mandatory. Formal: employer-based. Informal: state schemes. Basic Healthcare Provision Fund for vulnerable.",
    },

    vat: {
      rate: 7.5,
      name: "VAT",
      medicalExempt: true,
      notes: "Healthcare VAT-exempt. Standard VAT 7.5%.",
    },

    dataProtection: {
      law: "Nigeria Data Protection Act, 2023",
      consentRequired: true,
      retentionYears: 7,
      crossBorderRestricted: true,
      notes: "Enforced by NDPC. Health data = sensitive. Data Protection Impact Assessment required.",
    },

    mobileMoney: [
      { operator: "Paga", prefix: ["070"] },
      { operator: "OPay", prefix: ["070"] },
      { operator: "MTN MoMo", prefix: ["0803", "0806"] },
    ],
    paymentNotes: "Bank transfers dominant (Paystack, Flutterwave). Cards widely used.",

    medicalRegulator: "Medical and Dental Council of Nigeria (MDCN)",
    facilityAccreditation: "NHIA accreditation for insurance billing.",

    languages: ["English", "Hausa", "Yoruba", "Igbo"],
    defaultLanguage: "English",
  },

  // ═══════════════════════════════════════════════════════════
  // GHANA
  // ═══════════════════════════════════════════════════════════
  GH: {
    code: "GH",
    name: "Ghana",
    currency: "Ghanaian Cedi",
    currencySymbol: "GH₵",
    currencyCode: "GHS",

    statutoryScheme: {
      name: "National Health Insurance Scheme",
      shortName: "NHIS",
      mandatory: true,
      flatMonthlyFee: { amount: 0, currency: "GHS", appliesTo: "Varies by category" },
      dependants: "Spouse + children under 18",
      notes: "Funded by 2.5% NHIL levy on VAT + SSNIT contributions. Informal: annual premium ~GHS 30-50. Covers 95% of disease conditions.",
    },

    vat: {
      rate: 15,
      name: "VAT + NHIL",
      medicalExempt: true,
      notes: "Healthcare VAT-exempt. Standard: 15% VAT + 2.5% NHIL levy (funds NHIS).",
    },

    dataProtection: {
      law: "Data Protection Act, 2012 (Act 843)",
      consentRequired: true,
      retentionYears: 7,
      crossBorderRestricted: true,
      notes: "Enforced by Data Protection Commission. Health data = special personal data.",
    },

    mobileMoney: [
      { operator: "MTN MoMo", prefix: ["024", "025", "053", "054", "055", "059"] },
      { operator: "Vodafone Cash (Telecel)", prefix: ["020", "050"] },
      { operator: "AirtelTigo", prefix: ["026", "027", "056", "057"] },
    ],
    paymentNotes: "MTN MoMo dominant (~90%). Cards via Paystack/Flutterwave.",

    medicalRegulator: "Medical and Dental Council of Ghana",
    facilityAccreditation: "NHIA credentialing for NHIS billing.",

    languages: ["English", "Twi", "Ga", "Ewe"],
    defaultLanguage: "English",
  },

  // ═══════════════════════════════════════════════════════════
  // RWANDA
  // ═══════════════════════════════════════════════════════════
  RW: {
    code: "RW",
    name: "Rwanda",
    currency: "Rwandan Franc",
    currencySymbol: "RF",
    currencyCode: "RWF",

    statutoryScheme: {
      name: "Community-Based Health Insurance",
      shortName: "CBHI / Mutuelle de Santé",
      mandatory: true,
      flatMonthlyFee: { amount: 3000, currency: "RWF", appliesTo: "per person/year (tiered by ubudehe category)" },
      dependants: "Entire household",
      notes: "Africa's most successful CBHI: >90% population coverage. Tiered premiums by wealth category. Covers primary through tertiary care with referral.",
    },

    vat: {
      rate: 18,
      name: "VAT",
      medicalExempt: true,
      notes: "Healthcare VAT-exempt. Standard VAT 18%.",
    },

    dataProtection: {
      law: "Law on Protection of Personal Data and Privacy (2021)",
      consentRequired: true,
      retentionYears: 7,
      crossBorderRestricted: true,
      notes: "Enforced by NIDA. Health data = sensitive.",
    },

    mobileMoney: [
      { operator: "MTN MoMo", prefix: ["078", "079"] },
      { operator: "Airtel Money", prefix: ["073", "072"] },
    ],
    paymentNotes: "MTN MoMo dominant. Government services via Irembo.",

    medicalRegulator: "Rwanda Medical Council",
    facilityAccreditation: "RSSB/CBHI empanelment for insurance billing.",

    languages: ["Kinyarwanda", "English", "French"],
    defaultLanguage: "Kinyarwanda",
  },
};

/**
 * Get compliance profile for a country code.
 * Falls back to Zambia (home market) if unknown.
 */
export function getCountryCompliance(countryCode: string): CountryCompliance {
  const upper = countryCode.toUpperCase();
  return COUNTRY_COMPLIANCE[upper] ?? COUNTRY_COMPLIANCE["ZM"];
}

/**
 * List all supported countries.
 */
export function getSupportedCountries(): { code: string; name: string; currency: string }[] {
  return Object.values(COUNTRY_COMPLIANCE).map((c) => ({
    code: c.code,
    name: c.name,
    currency: `${c.currencySymbol} (${c.currencyCode})`,
  }));
}

/**
 * Detect mobile money operator from phone number for a given country.
 * Returns null if no match.
 */
export function detectOperator(phoneNumber: string, countryCode: string): string | null {
  const compliance = getCountryCompliance(countryCode);
  const digits = phoneNumber.replace(/\D/g, "");
  for (const mm of compliance.mobileMoney) {
    for (const prefix of mm.prefix) {
      if (digits.startsWith(prefix)) return mm.operator;
    }
  }
  return null;
}
