import { supabase } from "@/integrations/supabase/client";

/**
 * Dose-Range Checking (patient safety)
 * Parses free-text dosages like "500mg", "1g", "5ml", "2 tablets" and
 * validates against medication_dose_ranges. Warns — never hard-blocks —
 * following the same acknowledge-and-proceed pattern as allergy screening.
 */

export interface DoseRange {
  medication_name: string;
  aliases: string[];
  min_single_dose: number | null;
  max_single_dose: number | null;
  dose_unit: string;
  max_daily_dose: number | null;
  pediatric_mg_per_kg_min: number | null;
  pediatric_mg_per_kg_max: number | null;
  pediatric_max_single_dose: number | null;
  max_frequency_per_day: number | null;
  pregnancy_category: string | null;
  notes: string | null;
}

export interface ParsedDose {
  amount: number;
  unit: string; // normalized: mg | g | mcg | ml | units
  amountMg: number | null; // converted to mg where meaningful
}

export interface DoseCheckResult {
  status: "ok" | "low" | "high" | "unknown" | "unparseable";
  message: string;
  range?: DoseRange;
  parsed?: ParsedDose;
}

/** Parse "500mg", "1 g", "500MG twice daily", "5ml", "1000 mcg" etc. */
export function parseDose(dosageText: string): ParsedDose | null {
  if (!dosageText) return null;
  const m = dosageText
    .trim()
    .toLowerCase()
    .match(/^([\d.]+)\s*(mcg|µg|ug|mg|g|ml|units?|iu|tab)/);
  if (!m) return null;

  const amount = parseFloat(m[1]);
  if (!Number.isFinite(amount)) return null;

  let unit = m[2];
  if (unit === "µg" || unit === "ug") unit = "mcg";
  if (unit === "unit" || unit === "iu") unit = "units";
  if (unit === "tab") return { amount, unit: "tablet", amountMg: null };

  let amountMg: number | null = null;
  if (unit === "mg") amountMg = amount;
  else if (unit === "g") amountMg = amount * 1000;
  else if (unit === "mcg") amountMg = amount / 1000;
  // ml and units are not mass-convertible
  return { amount, unit, amountMg };
}

/** Frequency text → times per day. */
export function parseFrequencyPerDay(frequencyText: string): number | null {
  if (!frequencyText) return null;
  const f = frequencyText.toLowerCase();
  if (f.includes("once daily") || f.includes("od") || f.includes("daily")) return 1;
  if (f.includes("twice") || f.includes("bd") || f.includes("bid")) return 2;
  if (f.includes("three times") || f.includes("tds") || f.includes("tid")) return 3;
  if (f.includes("four times") || f.includes("qds") || f.includes("qid")) return 4;
  const qh = f.match(/q(\d+)h/);
  if (qh) return Math.floor(24 / parseInt(qh[1]));
  return null;
}

let rangeCache: DoseRange[] | null = null;

export async function loadDoseRanges(): Promise<DoseRange[]> {
  if (rangeCache) return rangeCache;
  const { data } = await supabase
    .from("medication_dose_ranges")
    .select("*")
    .eq("is_active", true);
  rangeCache = (data as DoseRange[]) || [];
  return rangeCache;
}

export function findRange(
  medicationName: string,
  ranges: DoseRange[]
): DoseRange | null {
  const name = medicationName.trim().toLowerCase();
  if (!name) return null;
  return (
    ranges.find((r) => r.medication_name.toLowerCase() === name) ||
    ranges.find((r) => name.includes(r.medication_name.toLowerCase())) ||
    ranges.find((r) =>
      (r.aliases || []).some(
        (a) => a.toLowerCase() === name || name.includes(a.toLowerCase())
      )
    ) ||
    null
  );
}

/**
 * Check a single prescription line.
 * patientAgeYears / patientWeightKg enable pediatric mg/kg checks.
 */
export function checkDose(args: {
  medicationName: string;
  dosage: string;
  frequency?: string;
  ranges: DoseRange[];
  patientAgeYears?: number | null;
  patientWeightKg?: number | null;
}): DoseCheckResult {
  const range = findRange(args.medicationName, args.ranges);
  if (!range) {
    return {
      status: "unknown",
      message: "No reference range on file for this medication.",
    };
  }
  const parsed = parseDose(args.dosage);
  if (!parsed) {
    return {
      status: "unparseable",
      message: "Couldn't read the dose — check it manually against the formulary.",
      range,
    };
  }
  if (parsed.amountMg == null) {
    return {
      status: "unknown",
      message: `Dose in ${parsed.unit} can't be range-checked automatically.`,
      range,
      parsed,
    };
  }

  const isChild =
    args.patientAgeYears != null && args.patientAgeYears < 12;

  // Pediatric mg/kg check
  if (isChild && args.patientWeightKg && range.pediatric_mg_per_kg_max != null) {
    const mgPerKg = parsed.amountMg / args.patientWeightKg;
    if (mgPerKg > range.pediatric_mg_per_kg_max) {
      return {
        status: "high",
        message: `Pediatric dose ${mgPerKg.toFixed(1)} mg/kg exceeds max ${range.pediatric_mg_per_kg_max} mg/kg for ${range.medication_name}.`,
        range,
        parsed,
      };
    }
    if (
      range.pediatric_mg_per_kg_min != null &&
      mgPerKg < range.pediatric_mg_per_kg_min
    ) {
      return {
        status: "low",
        message: `Pediatric dose ${mgPerKg.toFixed(1)} mg/kg is below the usual ${range.pediatric_mg_per_kg_min}-${range.pediatric_mg_per_kg_max} mg/kg range.`,
        range,
        parsed,
      };
    }
    return { status: "ok", message: "Dose within pediatric range.", range, parsed };
  }

  // Adult single-dose check (only when the range unit is mg-compatible)
  if (range.dose_unit === "mg") {
    if (range.max_single_dose != null && parsed.amountMg > range.max_single_dose) {
      return {
        status: "high",
        message: `Single dose ${parsed.amountMg}mg exceeds the usual max ${range.max_single_dose}mg for ${range.medication_name}.`,
        range,
        parsed,
      };
    }
    if (range.min_single_dose != null && parsed.amountMg < range.min_single_dose) {
      return {
        status: "low",
        message: `Single dose ${parsed.amountMg}mg is below the usual minimum ${range.min_single_dose}mg for ${range.medication_name}.`,
        range,
        parsed,
      };
    }
    // Daily total check when frequency is known
    const perDay = parseFrequencyPerDay(args.frequency || "");
    if (perDay && range.max_daily_dose != null) {
      const daily = parsed.amountMg * perDay;
      if (daily > range.max_daily_dose) {
        return {
          status: "high",
          message: `Daily total ${daily}mg (${perDay}x/day) exceeds max ${range.max_daily_dose}mg/day for ${range.medication_name}.`,
          range,
          parsed,
        };
      }
    }
  }

  return { status: "ok", message: "Dose within usual range.", range, parsed };
}
