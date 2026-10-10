/**
 * Coordination of Benefits — Zambia.
 *
 * Rules for patients holding multiple health insurance covers.
 *
 * WHAT IS ALLOWED:
 * - Holding NHIMA + private insurance simultaneously (11.3% of NHIMA members do).
 * - NHIMA is COMPULSORY for all earning Zambians — private cover does NOT
 *   exempt anyone from NHIMA contributions.
 * - Private cover acts as supplementary/top-up: it covers what NHIMA tariffs
 *   don't (e.g. amounts above NHIMA caps, non-accredited facilities,
 *   services outside the NHIMA benefit package).
 * - Employer policy is normally PRIMARY; personal/private policy is SECONDARY.
 * - Secondary insurer covers the remaining eligible balance after primary pays,
 *   but TOTAL reimbursement across all insurers can NEVER exceed the actual
 *   medical bill (principle of indemnity / non-duplication of benefits).
 *
 * WHAT IS NOT ALLOWED:
 * - Claiming the SAME expense in full from two insurers ("double dipping").
 *   This is insurance fraud.
 * - Making false statements to obtain a policy or claim (criminal offence
 *   under Zambian insurance law — fines and imprisonment).
 * - Concealing an existing policy from the other insurer when claiming.
 * - Provider-side fraud: e.g. directing NHIMA patients to buy drugs privately
 *   at inflated prices (under active NHIMA investigation).
 *
 * WHO CAN CLAIM:
 * - The principal member, registered spouse, and registered dependants
 *   (NHIMA: up to 5 children under 18).
 * - For private insurers: whoever is named on the policy schedule.
 * - Claims must be filed with supporting documents (bills, receipts,
 *   discharge summaries) per each insurer's requirements.
 * - NHIMA claims go through accredited facilities; the facility claims,
 *   not the patient directly (patient receives the mandatory claim bill).
 */

import { adjudicateNHIMAClaim } from "./nhima";
import { adjudicatePrivateClaim, type ZambianInsurerPlan } from "./zambian-insurers";

export interface CoverageLayer {
  kind: "nhima" | "private";
  name: string;
  plan?: ZambianInsurerPlan;
  isPrimary: boolean;
}

export interface CoordinationResult {
  totalBill: number;
  layers: {
    name: string;
    kind: string;
    pays: number;
    patientCopay: number;
    warnings: string[];
  }[];
  totalInsurerPays: number;
  patientResponsibility: number;
  warnings: string[];
  isFraudRisk: boolean;
}

/**
 * Coordinate benefits across NHIMA + private covers for a single bill.
 *
 * Order of adjudication:
 *  1. NHIMA first (statutory, tariff-capped) — always primary when the
 *     facility is NHIMA-accredited and the service is in the benefit package.
 *  2. Private insurer(s) cover the remainder up to their own limits.
 *  3. Patient pays whatever is left.
 *
 * The total paid by all insurers can never exceed the bill (indemnity).
 */
export function coordinateBenefits(
  totalBill: number,
  services: { category: string; amount: number; description?: string }[],
  layers: CoverageLayer[],
  opts?: {
    isChronicVisit?: boolean;
    deductibleMet?: number;
    oopMet?: number;
  }
): CoordinationResult {
  const warnings: string[] = [];
  const resultLayers: CoordinationResult["layers"] = [];
  let remaining = totalBill;
  let isFraudRisk = false;

  // Sort: NHIMA first, then primary private, then secondary private.
  const ordered = [...layers].sort((a, b) => {
    if (a.kind === "nhima" && b.kind !== "nhima") return -1;
    if (b.kind === "nhima" && a.kind !== "nhima") return 1;
    if (a.isPrimary && !b.isPrimary) return -1;
    if (b.isPrimary && !a.isPrimary) return 1;
    return 0;
  });

  // Must disclose all covers — claiming without disclosure is fraud risk.
  if (layers.length > 1) {
    warnings.push(
      `Multiple covers detected (${layers.length}). All insurers must be informed of each other — non-disclosure voids claims.`
    );
  }

  for (const layer of ordered) {
    if (remaining <= 0) break;

    if (layer.kind === "nhima") {
      const adj = adjudicateNHIMAClaim(services, opts?.isChronicVisit);
      const pays = Math.min(adj.totalAllowed, remaining);
      resultLayers.push({
        name: layer.name,
        kind: "nhima",
        pays,
        patientCopay: 0,
        warnings: adj.warnings,
      });
      remaining -= pays;
      if (adj.totalDisallowed > 0) {
        warnings.push(
          `NHIMA disallowed K${adj.totalDisallowed.toFixed(2)} (above tariff) — may be claimed from private cover.`
        );
      }
    } else if (layer.plan) {
      const adj = adjudicatePrivateClaim(
        layer.plan,
        remaining,
        opts?.deductibleMet ?? 0,
        opts?.oopMet ?? 0
      );
      resultLayers.push({
        name: layer.name,
        kind: "private",
        pays: adj.insurerPays,
        patientCopay: adj.patientResponsibility,
        warnings: adj.warnings,
      });
      remaining -= adj.insurerPays;
      remaining -= adj.patientResponsibility; // patient portion accounted separately
      remaining += adj.patientResponsibility; // keep patient share visible in final tally
      warnings.push(...adj.warnings);
    }
  }

  const totalInsurerPays = resultLayers.reduce((s, l) => s + l.pays, 0);

  // INDEMNITY CHECK: insurers must never pay more than the bill.
  if (totalInsurerPays > totalBill + 0.01) {
    isFraudRisk = true;
    warnings.push(
      `FRAUD RISK: combined insurer payments (K${totalInsurerPays.toFixed(2)}) exceed the bill (K${totalBill.toFixed(2)}). Overpayment must be refunded.`
    );
  }

  const patientResponsibility = Math.max(0, totalBill - totalInsurerPays);

  return {
    totalBill,
    layers: resultLayers,
    totalInsurerPays: Math.min(totalInsurerPays, totalBill),
    patientResponsibility: Math.round(patientResponsibility * 100) / 100,
    warnings,
    isFraudRisk,
  };
}

/**
 * Validate that a multi-insurer claim setup is legal.
 * Returns violations (empty = compliant).
 */
export function validateMultiCover(layers: CoverageLayer[]): string[] {
  const violations: string[] = [];

  const nhimaCount = layers.filter((l) => l.kind === "nhima").length;
  if (nhimaCount > 1) {
    violations.push("Only one NHIMA membership per person is allowed.");
  }

  const primaries = layers.filter((l) => l.isPrimary).length;
  if (layers.length > 1 && primaries === 0) {
    violations.push("With multiple covers, one must be designated primary (usually the employer policy).");
  }
  if (primaries > 1) {
    violations.push("Only one cover can be primary for a given claim.");
  }

  // NHIMA is compulsory — a Zambian resident with only private cover and no
  // NHIMA is non-compliant (unless exempt: 65+, vulnerable group).
  const hasNhima = layers.some((l) => l.kind === "nhima");
  if (!hasNhima && layers.length > 0) {
    violations.push(
      "NHIMA membership is compulsory for earning residents — private cover alone does not satisfy the legal requirement."
    );
  }

  return violations;
}

/** Plain-language summary of the rules for patient-facing UI. */
export const COORDINATION_RULES_SUMMARY = [
  {
    title: "You CAN hold NHIMA + private insurance",
    body: "About 1 in 9 NHIMA members also have private cover. NHIMA is compulsory — private insurance is extra, not a replacement.",
  },
  {
    title: "NHIMA pays first (at accredited facilities)",
    body: "NHIMA applies its tariffs first (e.g. K600 OPD cap). Your private insurer can then cover what NHIMA doesn't — the amounts above tariff, or services outside NHIMA's package.",
  },
  {
    title: "You can NEVER be paid more than the bill",
    body: "All insurers combined cannot pay you more than the actual medical cost. Claiming the same expense in full from two insurers is fraud.",
  },
  {
    title: "Tell every insurer about the others",
    body: "When claiming, disclose all your covers. Hiding a policy to double-claim voids your claim and is a criminal offence.",
  },
  {
    title: "One primary, the rest secondary",
    body: "Your employer's policy is usually primary. The secondary insurer only pays what's left after the primary has paid.",
  },
  {
    title: "Who can claim",
    body: "The principal member, registered spouse and dependants (NHIMA: 5 children under 18). NHIMA claims go through the accredited facility — you receive a claim bill each visit.",
  },
] as const;
