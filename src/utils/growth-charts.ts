import { WHO_WEIGHT_FOR_AGE, WHO_HEIGHT_FOR_AGE } from "./who-growth-data";

/**
 * WHO Child Growth Standards engine (0–5 years).
 * LMS z-score: z = ((x / M)^L - 1) / (L * S). Handles L≈0 via log transform.
 * Reference: WHO Anthro 2006 standards, official LMS tables.
 */

export type GrowthSex = "male" | "female";
export type GrowthMeasure = "weight" | "height";

type LMSRow = readonly [number, number, number, number]; // [ageMonths, L, M, S]

const TABLES: Record<GrowthMeasure, Record<GrowthSex, readonly LMSRow[]>> = {
  weight: {
    male: WHO_WEIGHT_FOR_AGE.male,
    female: WHO_WEIGHT_FOR_AGE.female,
  },
  height: {
    male: WHO_HEIGHT_FOR_AGE.male,
    female: WHO_HEIGHT_FOR_AGE.female,
  },
};

/** Interpolate LMS at a fractional age in months. */
export function lmsAt(
  measure: GrowthMeasure,
  sex: GrowthSex,
  ageMonths: number
): { l: number; m: number; s: number } | null {
  if (ageMonths < 0 || ageMonths > 60) return null;
  const rows = TABLES[measure][sex];
  const lo = Math.floor(ageMonths);
  const hi = Math.ceil(ageMonths);
  const [m0, l0, M0, s0] = rows[Math.min(lo, 60)] as unknown as number[];
  const [m1, l1, M1, s1] = rows[Math.min(hi, 60)] as unknown as number[];
  const f = ageMonths - m0;
  return {
    l: l0 + (l1 - l0) * f,
    m: M0 + (M1 - M0) * f,
    s: s0 + (s1 - s0) * f,
  };
}

/** LMS z-score. */
export function zScore(
  measure: GrowthMeasure,
  sex: GrowthSex,
  ageMonths: number,
  value: number
): number | null {
  const lms = lmsAt(measure, sex, ageMonths);
  if (!lms || value <= 0) return null;
  const { l, m, s } = lms;
  if (Math.abs(l) < 1e-9) return Math.log(value / m) / s;
  return (Math.pow(value / m, l) - 1) / (l * s);
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26). */
export function zToPercentile(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return Math.round(p * 1000) / 10; // 0-100, one decimal
}

/** Value at a given z for chart curves (inverse LMS). */
export function valueAtZ(
  measure: GrowthMeasure,
  sex: GrowthSex,
  ageMonths: number,
  z: number
): number | null {
  const lms = lmsAt(measure, sex, ageMonths);
  if (!lms) return null;
  const { l, m, s } = lms;
  if (Math.abs(l) < 1e-9) return m * Math.exp(s * z);
  return m * Math.pow(1 + l * s * z, 1 / l);
}

export type NutritionalStatus =
  | "severe" // z < -3
  | "moderate" // -3 <= z < -2
  | "mild" // -2 <= z < -1
  | "normal" // -1..2
  | "high"; // z > 2

export function classifyZ(z: number): NutritionalStatus {
  if (z < -3) return "severe";
  if (z < -2) return "moderate";
  if (z < -1) return "mild";
  if (z > 2) return "high";
  return "normal";
}

export const STATUS_LABEL: Record<NutritionalStatus, string> = {
  severe: "Severely underweight",
  moderate: "Moderately underweight",
  mild: "Mildly underweight",
  normal: "Normal",
  high: "Above expected",
};

/** Months between two dates. */
export function ageMonthsAt(birth: Date, at: Date): number {
  const msPerMonth = 365.2425 / 12 * 24 * 3600 * 1000;
  return (at.getTime() - birth.getTime()) / msPerMonth;
}

/** Build the -2SD / median / +2SD reference curves for a chart. */
export function referenceCurves(
  measure: GrowthMeasure,
  sex: GrowthSex,
  maxMonths = 60
): { age: number; p3: number; p15: number; p50: number; p85: number; p97: number }[] {
  const out = [];
  for (let age = 0; age <= maxMonths; age++) {
    const p3 = valueAtZ(measure, sex, age, -2);
    const p15 = valueAtZ(measure, sex, age, -1);
    const p50 = valueAtZ(measure, sex, age, 0);
    const p85 = valueAtZ(measure, sex, age, 1);
    const p97 = valueAtZ(measure, sex, age, 2);
    if (p3 == null || p50 == null) continue;
    out.push({
      age,
      p3: Math.round(p3 * 10) / 10,
      p15: Math.round((p15 ?? 0) * 10) / 10,
      p50: Math.round(p50 * 10) / 10,
      p85: Math.round((p85 ?? 0) * 10) / 10,
      p97: Math.round((p97 ?? 0) * 10) / 10,
    });
  }
  return out;
}
