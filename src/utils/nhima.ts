/**
 * NHIMA (National Health Insurance Management Authority) — Zambia
 * Real tariff and rules implementation based on NHIMA operational guidelines.
 *
 * ⚖️ LEGAL NOTICE:
 * Tariff data is INDICATIVE, sourced from NHIMA's 2025 published revisions.
 * NHIMA revises tariffs periodically. ALWAYS verify against NHIMA's current
 * official tariff schedule before billing. This module does NOT guarantee
 * claim acceptance by NHIMA. Facilities must maintain NHIMA accreditation
 * and follow NHIMA's current claiming procedures.
 *
 * Sources: NHIMA Act No. 2 of 2018, 2025 revised tariff structure,
 * mandatory claim-bill policy (effective 15 Oct 2025).
 *
 * Key facts:
 * - Formal sector: 1% employee + 1% employer of gross salary (2% total), no cap
 * - Informal sector: tiered premiums via income assessment
 * - Membership: principal + spouse + up to 5 dependants under 18
 * - Claims SLA: 45 days from submission
 * - 2025 OPD tariff: K600 cap per visit, subdivided:
 *   - K200 consultation
 *   - K150 drugs/pharmaceuticals
 *   - K150 laboratory investigations
 *   - K50 registration
 *   - K50 consumables
 * - Chronic care: 1 visit per 3 months, K1,200 cap for all treatment
 * - Mandatory claim bills to members at every visit (from 15 Oct 2025)
 */

// ─── 2025 NHIMA Outpatient Tariff Caps (Kwacha) ──────────────────────────────
export const NHIMA_OPD_TARIFF = {
  TOTAL_CAP: 600,
  CONSULTATION: 200,
  DRUGS: 150,
  LABORATORY: 150,
  REGISTRATION: 50,
  CONSUMABLES: 50,
} as const;

export const NHIMA_CHRONIC_TARIFF = {
  TOTAL_CAP: 1200,
  VISIT_FREQUENCY_MONTHS: 3, // one visit every 3 months
} as const;

// ─── Contribution Rates ─────────────────────────────────────────────────────
export const NHIMA_CONTRIBUTION = {
  EMPLOYEE_PCT: 1,      // 1% of gross salary
  EMPLOYER_PCT: 1,      // 1% of gross salary
  TOTAL_PCT: 2,
  MAX_DEPENDANTS: 5,    // spouse + 5 children under 18
  DEPENDANT_MAX_AGE: 18,
} as const;

// ─── Covered Benefit Categories ─────────────────────────────────────────────
export const NHIMA_BENEFIT_CATEGORIES = [
  "OPD registration and consultation",
  "Pharmaceuticals and blood products",
  "Investigations and diagnostic services",
  "Medical and surgical services",
  "Maternal, newborn care and pediatric services",
  "Eye care (selected services)",
  "Oral health (selected services)",
  "Physiotherapy and rehabilitation",
  "Mental health services",
  "Selected cancer services",
  "Inpatient care",
  "Intensive care",
  "Spectacles",
  "Medical/denture/orthopaedic appliances",
] as const;

// ─── Exclusions ─────────────────────────────────────────────────────────────
export const NHIMA_EXCLUSIONS = [
  "Cosmetic procedures",
  "Treatment abroad",
  "Services under government/donor vertical programmes",
  "Epidemic/disaster response services",
  "Domiciliary (home) specialist visits",
] as const;

export interface NHIMAAdjudicationLine {
  category: keyof typeof NHIMA_OPD_TARIFF | string;
  claimedAmount: number;
  allowedAmount: number;
  capped: boolean;
  capApplied?: number;
}

export interface NHIMAAdjudicationResult {
  totalClaimed: number;
  totalAllowed: number;
  totalDisallowed: number;
  lines: NHIMAAdjudicationLine[];
  isChronicVisit: boolean;
  warnings: string[];
}

/**
 * Adjudicate a claim against NHIMA 2025 tariffs.
 * Maps each billing line to a tariff category and applies caps.
 */
export function adjudicateNHIMAClaim(
  lines: { category: string; amount: number; description?: string }[],
  isChronicVisit = false
): NHIMAAdjudicationResult {
  const warnings: string[] = [];
  const resultLines: NHIMAAdjudicationLine[] = [];
  let totalClaimed = 0;
  let totalAllowed = 0;

  const cap = isChronicVisit ? NHIMA_CHRONIC_TARIFF.TOTAL_CAP : NHIMA_OPD_TARIFF.TOTAL_CAP;

  for (const line of lines) {
    totalClaimed += line.amount;
    const cat = line.category.toLowerCase();

    let tariffCap: number | undefined;
    if (cat.includes("consult")) tariffCap = NHIMA_OPD_TARIFF.CONSULTATION;
    else if (cat.includes("drug") || cat.includes("pharm") || cat.includes("medication")) tariffCap = NHIMA_OPD_TARIFF.DRUGS;
    else if (cat.includes("lab") || cat.includes("investigation") || cat.includes("radiolog") || cat.includes("diagnostic")) tariffCap = NHIMA_OPD_TARIFF.LABORATORY;
    else if (cat.includes("regist")) tariffCap = NHIMA_OPD_TARIFF.REGISTRATION;
    else if (cat.includes("consumable") || cat.includes("suppl")) tariffCap = NHIMA_OPD_TARIFF.CONSUMABLES;

    let allowed = line.amount;
    let capped = false;
    if (tariffCap !== undefined && line.amount > tariffCap) {
      allowed = tariffCap;
      capped = true;
      warnings.push(`${line.description || line.category}: claimed K${line.amount} capped to NHIMA tariff K${tariffCap}`);
    }

    resultLines.push({
      category: line.category,
      claimedAmount: line.amount,
      allowedAmount: allowed,
      capped,
      capApplied: capped ? tariffCap : undefined,
    });
    totalAllowed += allowed;
  }

  // Overall visit cap
  if (totalAllowed > cap) {
    warnings.push(`Total K${totalAllowed} exceeds NHIMA ${isChronicVisit ? "chronic" : "OPD"} visit cap of K${cap} — excess disallowed`);
    totalAllowed = cap;
  }

  return {
    totalClaimed,
    totalAllowed,
    totalDisallowed: totalClaimed - totalAllowed,
    lines: resultLines,
    isChronicVisit,
    warnings,
  };
}

/**
 * Check if a dependant qualifies under NHIMA rules.
 */
export function isEligibleDependant(ageYears: number, relationship: string): boolean {
  const rel = relationship.toLowerCase();
  if (rel === "spouse") return true;
  if (rel === "child" || rel === "dependant" || rel === "dependent") {
    return ageYears < NHIMA_CONTRIBUTION.DEPENDANT_MAX_AGE;
  }
  return false;
}

/**
 * Calculate monthly NHIMA contribution for formal-sector employee.
 */
export function calculateNHIMAContribution(grossMonthlySalary: number): {
  employee: number;
  employer: number;
  total: number;
} {
  const employee = (grossMonthlySalary * NHIMA_CONTRIBUTION.EMPLOYEE_PCT) / 100;
  const employer = (grossMonthlySalary * NHIMA_CONTRIBUTION.EMPLOYER_PCT) / 100;
  return { employee, employer, total: employee + employer };
}

/**
 * Generate a NHIMA-compliant claim bill (mandatory from 15 Oct 2025).
 * Every accredited facility must issue this to the member at each visit.
 */
export function generateNHIMAClaimBill(params: {
  memberName: string;
  memberNumber: string;
  facilityName: string;
  visitDate: string;
  services: { description: string; category: string; amount: number }[];
  isChronicVisit?: boolean;
}): string {
  const adj = adjudicateNHIMAClaim(params.services, params.isChronicVisit);
  const lines = adj.lines
    .map((l, i) => `${i + 1}. ${l.category} — Claimed: K${l.claimedAmount.toFixed(2)} | NHIMA allows: K${l.allowedAmount.toFixed(2)}${l.capped ? " (capped)" : ""}`)
    .join("\n");

  return [
    "═══════════════════════════════════════",
    "  NHIMA CLAIM BILL",
    "  National Health Insurance Scheme",
    "═══════════════════════════════════════",
    `Member: ${params.memberName}`,
    `Member No: ${params.memberNumber}`,
    `Facility: ${params.facilityName}`,
    `Visit Date: ${params.visitDate}`,
    "───────────────────────────────────────",
    lines,
    "───────────────────────────────────────",
    `Total Claimed:  K${adj.totalClaimed.toFixed(2)}`,
    `NHIMA Allowed:  K${adj.totalAllowed.toFixed(2)}`,
    `Disallowed:     K${adj.totalDisallowed.toFixed(2)}`,
    "═══════════════════════════════════════",
    "Per NHIMA Act No. 2 of 2018, s.39(2).",
    "Claims payable within 45 days.",
    ...(adj.warnings.length > 0 ? ["", "NOTES:", ...adj.warnings.map((w) => `• ${w}`)] : []),
  ].join("\n");
}
