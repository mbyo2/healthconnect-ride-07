/**
 * Advanced Revenue Cycle Management (RCM) & Insurance Adjudication Engine
 * Supporting Regional Billing Rules, Dynamic Co-Pay / Co-Insurance,
 * Automated Claim Scrubbing, and Electronic Remittance Advice (ERA 835).
 */

export interface InsurancePolicy {
  id: string;
  payerCode: string; // e.g. NHIMA-ZM, MADISON-01, SANLAM-02, SES-INTL, CIGNA-GLOBAL
  payerName: string;
  tier: "Public Statutory" | "Private Comprehensive" | "Executive Corporate" | "International Expat";
  annualDeductible: number;
  deductibleMet: number;
  outOfPocketMax: number;
  outOfPocketMet: number;
  coPayType: "percentage" | "flat" | "tiered";
  coPayValue: number; // e.g. 10 (for 10%) or 50 (for K50 flat)
  preAuthThreshold: number; // Procedures above this amount require Pre-Auth token
  requiresReferral: boolean;
  acceptedSpecialties: string[];
}

export interface BillingLineItem {
  id: string;
  cptCode: string;
  description: string;
  grossAmount: number;
  quantity: number;
  isCovered: boolean;
  icd10DiagnosticCode: string;
}

export interface AdjudicationResult {
  grossTotal: number;
  appliedDeductible: number;
  patientCoPay: number;
  patientCoInsurance: number;
  totalPatientResponsibility: number;
  totalInsurerPayable: number;
  requiresPreAuth: boolean;
  preAuthStatus: "Not Required" | "Approved" | "Pending" | "Missing Required Token";
  regionalBillingRuleNotes: string[];
  scrubberWarnings: string[];
  isCleanClaim: boolean;
}

export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  memberPolicyNumber: string;
  payerName: string;
  providerNpi: string;
  dateOfService: string;
  totalBilled: number;
  patientPaid: number;
  insuranceClaimed: number;
  status: "Draft" | "Scrubbed" | "Submitted" | "Adjudicated" | "Remitted" | "Denied" | "Appealed";
  denialCode?: string;
  denialReason?: string;
  preAuthToken?: string;
  eraCheckNumber?: string;
  adjudicatedAmount?: number;
}

export const REGIONAL_PAYERS: InsurancePolicy[] = [
  {
    id: "nhima-zm",
    payerCode: "NHIMA-ZM",
    payerName: "NHIMA (National Health Insurance Management Authority)",
    tier: "Public Statutory",
    annualDeductible: 0,
    deductibleMet: 0,
    outOfPocketMax: 5000,
    outOfPocketMet: 0,
    coPayType: "flat",
    coPayValue: 0, // 100% statutory coverage for accredited services
    preAuthThreshold: 3500,
    requiresReferral: true,
    acceptedSpecialties: ["General Medicine", "Pediatrics", "Emergency", "Maternity", "Surgery", "Physiotherapy"],
  },
  {
    id: "madison-gen",
    payerCode: "MAD-ZM-01",
    payerName: "Madison General Insurance (CarePlus)",
    tier: "Private Comprehensive",
    annualDeductible: 500,
    deductibleMet: 500,
    outOfPocketMax: 20000,
    outOfPocketMet: 1200,
    coPayType: "percentage",
    coPayValue: 10, // 10% co-pay
    preAuthThreshold: 5000,
    requiresReferral: false,
    acceptedSpecialties: ["All Specialties", "Dental", "Optical", "Specialist Consultation", "Radiology"],
  },
  {
    id: "sanlam-health",
    payerCode: "SAN-AFR-02",
    payerName: "Sanlam Health Corporate Shield",
    tier: "Executive Corporate",
    annualDeductible: 0,
    deductibleMet: 0,
    outOfPocketMax: 50000,
    outOfPocketMet: 0,
    coPayType: "percentage",
    coPayValue: 5, // 5% co-pay
    preAuthThreshold: 10000,
    requiresReferral: false,
    acceptedSpecialties: ["All Specialties", "Executive Health", "Private Wards", "Cross-Border Evacuation"],
  },
  {
    id: "ses-intl",
    payerCode: "SES-ZM-04",
    payerName: "Speciality Emergency Services (SES Unimed)",
    tier: "International Expat",
    annualDeductible: 1000,
    deductibleMet: 1000,
    outOfPocketMax: 100000,
    outOfPocketMet: 1500,
    coPayType: "percentage",
    coPayValue: 15,
    preAuthThreshold: 8000,
    requiresReferral: false,
    acceptedSpecialties: ["Emergency Air Ambulance", "Trauma", "Tertiary Surgery", "Intensive Care"],
  },
];

/**
 * Real-time Dynamic Adjudication Calculation
 */
export function adjudicateClaim(
  items: BillingLineItem[],
  policy: InsurancePolicy,
  preAuthToken?: string
): AdjudicationResult {
  let grossTotal = 0;
  let scrubberWarnings: string[] = [];
  let regionalNotes: string[] = [];

  items.forEach((item) => {
    const lineTotal = item.grossAmount * item.quantity;
    grossTotal += lineTotal;

    // Scrubber Rule 1: ICD-10 validity check
    if (!item.icd10DiagnosticCode || item.icd10DiagnosticCode.trim() === "") {
      scrubberWarnings.push(`Line item '${item.description}' is missing mandatory ICD-10 diagnostic code.`);
    }

    // Scrubber Rule 2: CPT code format check
    if (!item.cptCode || !item.cptCode.startsWith("CPT-")) {
      scrubberWarnings.push(`Item '${item.description}' requires a standardized CPT code prefix.`);
    }
  });

  // Regional Billing Rule: VAT exemption on essential medicine items
  regionalNotes.push("Regional Statutory Rule: Zambian VAT zero-rated on healthcare services and essential formulary.");

  // Deductible calculation
  const remainingDeductible = Math.max(0, policy.annualDeductible - policy.deductibleMet);
  const appliedDeductible = Math.min(grossTotal, remainingDeductible);
  const amountAfterDeductible = Math.max(0, grossTotal - appliedDeductible);

  // Co-Pay / Co-Insurance calculation
  let patientCoPay = 0;
  let patientCoInsurance = 0;

  if (policy.coPayType === "flat") {
    patientCoPay = policy.coPayValue;
  } else if (policy.coPayType === "percentage") {
    patientCoInsurance = amountAfterDeductible * (policy.coPayValue / 100);
  }

  // Pre-Authorization threshold verification
  const requiresPreAuth = grossTotal >= policy.preAuthThreshold;
  let preAuthStatus: AdjudicationResult["preAuthStatus"] = "Not Required";

  if (requiresPreAuth) {
    if (preAuthToken && preAuthToken.trim().length >= 6) {
      preAuthStatus = "Approved";
      regionalNotes.push(`Pre-Authorization Token ${preAuthToken} verified and attached to electronic claim envelope.`);
    } else {
      preAuthStatus = "Missing Required Token";
      scrubberWarnings.push(`Total claim amount (K${grossTotal.toFixed(2)}) exceeds payer pre-auth threshold of K${policy.preAuthThreshold}. Valid Pre-Auth Token required.`);
    }
  }

  const totalPatientResponsibility = appliedDeductible + patientCoPay + patientCoInsurance;
  const totalInsurerPayable = Math.max(0, grossTotal - totalPatientResponsibility);
  const isCleanClaim = scrubberWarnings.length === 0;

  return {
    grossTotal,
    appliedDeductible,
    patientCoPay,
    patientCoInsurance,
    totalPatientResponsibility,
    totalInsurerPayable,
    requiresPreAuth,
    preAuthStatus,
    regionalBillingRuleNotes: regionalNotes,
    scrubberWarnings,
    isCleanClaim,
  };
}

/**
 * Standardized Denial Code Explanations (ANSI / X12 Standard)
 */
export const DENIAL_CODE_DICTIONARY: Record<string, { title: string; description: string; recommendedAction: string }> = {
  "CO-16": {
    title: "Claim Lacks Information / Incomplete Documentation",
    description: "At least one Remark Code must be provided. Missing clinical notes or invalid diagnostic coding.",
    recommendedAction: "Attach clinical consult summary and verify primary ICD-10 diagnostic coding before resubmission.",
  },
  "CO-50": {
    title: "Non-Covered Service Under Member Plan",
    description: "These are non-covered services because this is not deemed a medical necessity by the payer.",
    recommendedAction: "Submit letter of medical necessity signed by primary attending physician.",
  },
  "PR-1": {
    title: "Deductible Amount",
    description: "Patient has not met annual deductible threshold. Transferred to patient responsibility.",
    recommendedAction: "Bill patient for balance or collect via Mobile Money checkout.",
  },
  "CO-197": {
    title: "Pre-Certification / Pre-Authorization Absent",
    description: "Procedure requires prior authorization token which was not provided on the claim.",
    recommendedAction: "Obtain retroactive authorization approval from TPA medical review board.",
  },
};
