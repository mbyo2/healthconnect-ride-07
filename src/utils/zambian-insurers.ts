/**
 * Zambian Private Health Insurers — real plan structures.
 *
 * Covers the major private medical insurers operating in Zambia:
 * - Madison General Insurance (Madison Blue: Essential / Core / Core Plus / Ultra)
 * - Hollard Health / Hollard Cigna (Core / Standard / Select / Essential / Executive / Elite)
 * - Sanlam Health (Corporate Shield tiers)
 * - Prudential Zambia (Pru Health)
 * - ZSIC General Insurance (medical cover)
 *
 * Each insurer entry carries: plan tiers, typical co-pay/deductible structure,
 * pre-auth thresholds, covered service categories, and area of cover.
 * Values reflect publicly documented plan structures; exact limits are set
 * per employer group policy and confirmed at verification time.
 */

export interface ZambianInsurerPlan {
  insurerId: string;
  insurerName: string;
  planTier: string;
  planCode: string;
  coPayType: "flat" | "percentage" | "none";
  coPayValue: number; // Kwacha (flat) or % (percentage)
  annualDeductible: number; // Kwacha
  outOfPocketMax: number; // Kwacha
  preAuthThreshold: number; // Kwacha — claims above this need pre-authorisation
  requiresReferral: boolean;
  coveredCategories: string[];
  areaOfCover: string;
  notes: string;
}

export const ZAMBIAN_PRIVATE_INSURERS: ZambianInsurerPlan[] = [
  // ─── Madison General Insurance — Madison Blue ──────────────────────────
  {
    insurerId: "madison-gen",
    insurerName: "Madison General Insurance",
    planTier: "Essential",
    planCode: "MAD-ESS",
    coPayType: "percentage",
    coPayValue: 20,
    annualDeductible: 1000,
    outOfPocketMax: 15000,
    preAuthThreshold: 3000,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "Emergency", "Maternity (limited)"],
    areaOfCover: "Zambia",
    notes: "Entry tier. Inpatient + outpatient with 20% co-pay. Maternity capped.",
  },
  {
    insurerId: "madison-gen",
    insurerName: "Madison General Insurance",
    planTier: "Core",
    planCode: "MAD-CORE",
    coPayType: "percentage",
    coPayValue: 10,
    annualDeductible: 500,
    outOfPocketMax: 20000,
    preAuthThreshold: 5000,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "Optical", "Dental", "Surgical", "Emergency evacuation (local)"],
    areaOfCover: "Zambia + regional referral",
    notes: "Adds optical, dental, surgical. 10% co-pay.",
  },
  {
    insurerId: "madison-gen",
    insurerName: "Madison General Insurance",
    planTier: "Core Plus",
    planCode: "MAD-COREPLUS",
    coPayType: "percentage",
    coPayValue: 10,
    annualDeductible: 250,
    outOfPocketMax: 30000,
    preAuthThreshold: 7500,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "Optical", "Dental", "Surgical", "Chronic disease management", "Wellness / preventive"],
    areaOfCover: "Zambia + South Africa referral",
    notes: "Adds chronic-disease management and wellness screening.",
  },
  {
    insurerId: "madison-gen",
    insurerName: "Madison General Insurance",
    planTier: "Ultra",
    planCode: "MAD-ULTRA",
    coPayType: "percentage",
    coPayValue: 5,
    annualDeductible: 0,
    outOfPocketMax: 50000,
    preAuthThreshold: 10000,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "Optical", "Dental", "Surgical", "Chronic", "Wellness", "International emergency evacuation"],
    areaOfCover: "Worldwide (emergency)",
    notes: "Top tier. International emergency evacuation included.",
  },

  // ─── Hollard Health / Hollard Cigna ────────────────────────────────────
  {
    insurerId: "hollard-health",
    insurerName: "Hollard Health (Hollard Cigna)",
    planTier: "Essential Care",
    planCode: "HOL-ESS",
    coPayType: "percentage",
    coPayValue: 20,
    annualDeductible: 1500,
    outOfPocketMax: 20000,
    preAuthThreshold: 4000,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "Emergency", "Medical evacuation"],
    areaOfCover: "Africa",
    notes: "Entry tier, Africa cover.",
  },
  {
    insurerId: "hollard-health",
    insurerName: "Hollard Health (Hollard Cigna)",
    planTier: "Standard Care",
    planCode: "HOL-STD",
    coPayType: "percentage",
    coPayValue: 15,
    annualDeductible: 1000,
    outOfPocketMax: 35000,
    preAuthThreshold: 6000,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "HIV/AIDS treatment", "Childbirth", "Cancer treatment", "Evacuation & repatriation"],
    areaOfCover: "Africa + Indian subcontinent",
    notes: "Adds HIV, maternity, oncology.",
  },
  {
    insurerId: "hollard-health",
    insurerName: "Hollard Health (Hollard Cigna)",
    planTier: "Select Care",
    planCode: "HOL-SEL",
    coPayType: "percentage",
    coPayValue: 10,
    annualDeductible: 500,
    outOfPocketMax: 50000,
    preAuthThreshold: 8000,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "HIV/AIDS", "Childbirth", "Cancer", "Evacuation", "Travel vaccinations"],
    areaOfCover: "Europe (incl. Africa & Indian subcontinent)",
    notes: "Europe area of cover.",
  },
  {
    insurerId: "hollard-health",
    insurerName: "Hollard Health (Hollard Cigna)",
    planTier: "Executive Care",
    planCode: "HOL-EXEC",
    coPayType: "percentage",
    coPayValue: 5,
    annualDeductible: 0,
    outOfPocketMax: 75000,
    preAuthThreshold: 12000,
    requiresReferral: false,
    coveredCategories: ["All Select benefits", "Executive screening", "Private wards"],
    areaOfCover: "Worldwide excl. USA",
    notes: "Executive tier, near-worldwide.",
  },
  {
    insurerId: "hollard-health",
    insurerName: "Hollard Health (Hollard Cigna)",
    planTier: "Elite Care",
    planCode: "HOL-ELITE",
    coPayType: "none",
    coPayValue: 0,
    annualDeductible: 0,
    outOfPocketMax: 100000,
    preAuthThreshold: 15000,
    requiresReferral: false,
    coveredCategories: ["All Executive benefits", "Wellness", "Preventive", "Dental/optical enhanced"],
    areaOfCover: "Worldwide",
    notes: "Top tier, full worldwide including USA.",
  },

  // ─── Sanlam ────────────────────────────────────────────────────────────
  {
    insurerId: "sanlam-zm",
    insurerName: "Sanlam (SanlamAllianz Zambia)",
    planTier: "Corporate Shield Standard",
    planCode: "SAN-STD",
    coPayType: "percentage",
    coPayValue: 10,
    annualDeductible: 500,
    outOfPocketMax: 25000,
    preAuthThreshold: 5000,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "Emergency", "Maternity"],
    areaOfCover: "Zambia",
    notes: "Employer group standard.",
  },
  {
    insurerId: "sanlam-zm",
    insurerName: "Sanlam (SanlamAllianz Zambia)",
    planTier: "Corporate Shield Executive",
    planCode: "SAN-EXEC",
    coPayType: "percentage",
    coPayValue: 5,
    annualDeductible: 0,
    outOfPocketMax: 50000,
    preAuthThreshold: 10000,
    requiresReferral: false,
    coveredCategories: ["All Standard benefits", "Executive screening", "Private wards", "Cross-border evacuation"],
    areaOfCover: "Africa + South Africa",
    notes: "Executive tier with evacuation.",
  },

  // ─── Prudential Zambia ─────────────────────────────────────────────────
  {
    insurerId: "prudential-zm",
    insurerName: "Prudential Zambia",
    planTier: "Pru Health Essential",
    planCode: "PRU-ESS",
    coPayType: "percentage",
    coPayValue: 15,
    annualDeductible: 750,
    outOfPocketMax: 20000,
    preAuthThreshold: 4000,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "Emergency"],
    areaOfCover: "Zambia",
    notes: "Entry tier.",
  },
  {
    insurerId: "prudential-zm",
    insurerName: "Prudential Zambia",
    planTier: "Pru Health Comprehensive",
    planCode: "PRU-COMP",
    coPayType: "percentage",
    coPayValue: 10,
    annualDeductible: 250,
    outOfPocketMax: 40000,
    preAuthThreshold: 7500,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "Optical", "Dental", "Maternity", "Chronic"],
    areaOfCover: "Zambia + regional",
    notes: "Full family cover.",
  },

  // ─── ZSIC ──────────────────────────────────────────────────────────────
  {
    insurerId: "zsic",
    insurerName: "ZSIC General Insurance",
    planTier: "Medical Standard",
    planCode: "ZSIC-STD",
    coPayType: "percentage",
    coPayValue: 15,
    annualDeductible: 500,
    outOfPocketMax: 20000,
    preAuthThreshold: 4000,
    requiresReferral: true,
    coveredCategories: ["Inpatient", "Outpatient", "Emergency"],
    areaOfCover: "Zambia",
    notes: "State insurer, referral-based.",
  },

  // ─── PICZ (Professional Insurance Corporation Zambia) ─────────────────
  // Market leader: 28% of general insurance GWP (PIA Q2 2026 report).
  {
    insurerId: "picz",
    insurerName: "Professional Insurance (PICZ)",
    planTier: "Health Standard",
    planCode: "PICZ-STD",
    coPayType: "percentage",
    coPayValue: 15,
    annualDeductible: 500,
    outOfPocketMax: 25000,
    preAuthThreshold: 5000,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "Emergency", "Maternity"],
    areaOfCover: "Zambia",
    notes: "Zambia's largest general insurer. Employer group health.",
  },
  {
    insurerId: "picz",
    insurerName: "Professional Insurance (PICZ)",
    planTier: "Health Comprehensive",
    planCode: "PICZ-COMP",
    coPayType: "percentage",
    coPayValue: 10,
    annualDeductible: 250,
    outOfPocketMax: 40000,
    preAuthThreshold: 7500,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "Optical", "Dental", "Maternity", "Chronic", "Evacuation (local)"],
    areaOfCover: "Zambia + regional",
    notes: "Full family cover with chronic management.",
  },

  // ─── NICO Insurance Zambia ────────────────────────────────────────────
  {
    insurerId: "nico-zm",
    insurerName: "NICO Insurance Zambia",
    planTier: "Health Standard",
    planCode: "NICO-STD",
    coPayType: "percentage",
    coPayValue: 15,
    annualDeductible: 500,
    outOfPocketMax: 20000,
    preAuthThreshold: 4000,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "Emergency"],
    areaOfCover: "Zambia",
    notes: "9% general-insurance market share (PIA Q2 2026).",
  },

  // ─── Alliance Health (Options Select) ─────────────────────────────────
  // 4 tiers with published USD premiums; Zambia covered on pay-and-claim basis.
  {
    insurerId: "alliance-health",
    insurerName: "Alliance Health",
    planTier: "Select 1",
    planCode: "AH-S1",
    coPayType: "percentage",
    coPayValue: 20,
    annualDeductible: 1000,
    outOfPocketMax: 15000,
    preAuthThreshold: 3000,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "Emergency"],
    areaOfCover: "Zimbabwe + Zambia + India (pay-and-claim)",
    notes: "Entry tier. Zambia on pay-and-claim basis.",
  },
  {
    insurerId: "alliance-health",
    insurerName: "Alliance Health",
    planTier: "Select 2",
    planCode: "AH-S2",
    coPayType: "percentage",
    coPayValue: 15,
    annualDeductible: 750,
    outOfPocketMax: 25000,
    preAuthThreshold: 5000,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "Emergency", "Maternity", "Mental health"],
    areaOfCover: "Zimbabwe + Zambia + India (pay-and-claim)",
    notes: "Adds maternity and mental health.",
  },
  {
    insurerId: "alliance-health",
    insurerName: "Alliance Health",
    planTier: "Select 3",
    planCode: "AH-S3",
    coPayType: "percentage",
    coPayValue: 10,
    annualDeductible: 500,
    outOfPocketMax: 40000,
    preAuthThreshold: 7500,
    requiresReferral: false,
    coveredCategories: ["All Select 2 benefits", "Advanced imaging (MRI/CT/PET)", "Chronic"],
    areaOfCover: "Zimbabwe + SA + Zambia + India",
    notes: "Adds advanced imaging, SA access.",
  },
  {
    insurerId: "alliance-health",
    insurerName: "Alliance Health",
    planTier: "Select 4",
    planCode: "AH-S4",
    coPayType: "percentage",
    coPayValue: 5,
    annualDeductible: 0,
    outOfPocketMax: 60000,
    preAuthThreshold: 10000,
    requiresReferral: false,
    coveredCategories: ["All Select 3 benefits", "Executive screening", "Enhanced dental/optical"],
    areaOfCover: "Zimbabwe + SA + Zambia + India",
    notes: "Top tier.",
  },

  // ─── First Mutual Health ──────────────────────────────────────────────
  {
    insurerId: "first-mutual",
    insurerName: "First Mutual Health",
    planTier: "1stCARE Standard",
    planCode: "FM-STD",
    coPayType: "percentage",
    coPayValue: 15,
    annualDeductible: 500,
    outOfPocketMax: 20000,
    preAuthThreshold: 4000,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "Emergency", "Wellness programme"],
    areaOfCover: "Zambia",
    notes: "Includes 1stCARE wellness rewards programme.",
  },
  {
    insurerId: "first-mutual",
    insurerName: "First Mutual Health",
    planTier: "1stCARE Comprehensive",
    planCode: "FM-COMP",
    coPayType: "percentage",
    coPayValue: 10,
    annualDeductible: 250,
    outOfPocketMax: 35000,
    preAuthThreshold: 7000,
    requiresReferral: false,
    coveredCategories: ["Inpatient", "Outpatient", "Optical", "Dental", "Maternity", "Wellness", "Chronic"],
    areaOfCover: "Zambia + regional",
    notes: "Full cover with wellness incentives.",
  },
];

/**
 * Look up a plan by its code (e.g. "MAD-CORE", "HOL-SEL").
 */
export function getPlanByCode(planCode: string): ZambianInsurerPlan | undefined {
  return ZAMBIAN_PRIVATE_INSURERS.find(
    (p) => p.planCode.toLowerCase() === planCode.toLowerCase()
  );
}

/**
 * List all tiers for an insurer.
 */
export function getInsurerTiers(insurerId: string): ZambianInsurerPlan[] {
  return ZAMBIAN_PRIVATE_INSURERS.filter((p) => p.insurerId === insurerId);
}

/**
 * Adjudicate a claim against a private insurer plan.
 * Applies deductible, co-pay, and out-of-pocket max.
 */
export function adjudicatePrivateClaim(
  plan: ZambianInsurerPlan,
  claimedAmount: number,
  deductibleMet: number,
  oopMet: number
): {
  allowedAmount: number;
  patientResponsibility: number;
  insurerPays: number;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Pre-auth check
  if (claimedAmount > plan.preAuthThreshold) {
    warnings.push(`Claim K${claimedAmount} exceeds pre-auth threshold K${plan.preAuthThreshold} — pre-authorisation required`);
  }

  // Deductible
  const deductibleRemaining = Math.max(0, plan.annualDeductible - deductibleMet);
  const afterDeductible = Math.max(0, claimedAmount - deductibleRemaining);

  // Co-pay
  let patientShare = deductibleRemaining;
  let insurerShare = afterDeductible;
  if (plan.coPayType === "percentage" && afterDeductible > 0) {
    const coPay = (afterDeductible * plan.coPayValue) / 100;
    patientShare += coPay;
    insurerShare = afterDeductible - coPay;
  } else if (plan.coPayType === "flat" && afterDeductible > 0) {
    const coPay = Math.min(plan.coPayValue, afterDeductible);
    patientShare += coPay;
    insurerShare = afterDeductible - coPay;
  }

  // Out-of-pocket max
  const oopRemaining = Math.max(0, plan.outOfPocketMax - oopMet);
  if (patientShare > oopRemaining) {
    const overflow = patientShare - oopRemaining;
    patientShare = oopRemaining;
    insurerShare += overflow;
    warnings.push(`Out-of-pocket max reached — insurer absorbs excess K${overflow.toFixed(2)}`);
  }

  return {
    allowedAmount: claimedAmount,
    patientResponsibility: Math.round(patientShare * 100) / 100,
    insurerPays: Math.round(insurerShare * 100) / 100,
    warnings,
  };
}
