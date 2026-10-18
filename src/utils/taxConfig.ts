/**
 * Institution Tax Configuration — config-driven payroll (Odoo-style)
 * ============================================================
 * Replaces the hardcoded Zambia constants in zambiaPayroll.ts with a
 * per-institution configuration that mirrors
 * public.country_statutory_configs.
 *
 * Field names are snake_case to match the DB columns exactly:
 *   country_code, country_name, currency, vat_rate,
 *   paye_brackets, napsa_*, nhima_*, sdl_*, fiscal_year_start
 *
 * Rate conventions (matching the DB):
 *   - paye_brackets[].rate is a DECIMAL fraction (0.37 = 37%);
 *     max = null means "no upper limit" on the top band.
 *   - napsa / nhima / sdl rates are PERCENTS as stored (5 = 5%).
 *   - vat_rate is a percent (16 = 16%).
 * ============================================================
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CountryStatutoryConfig } from './universalPayroll';

// ─── Types ───────────────────────────────────────────────────

/** One progressive PAYE band. max = null → no upper limit (top band). */
export interface PayeBracket {
  min: number;
  max: number | null;
  rate: number; // decimal fraction, e.g. 0.37
}

/**
 * Per-institution statutory config. Mirrors public.country_statutory_configs
 * (snake_case). The `pension` slot maps to NAPSA-style columns and the
 * `health` slot maps to NHIMA-style columns — for non-Zambia countries these
 * are simply that country's pension / health-levy settings.
 */
export interface InstitutionTaxConfig {
  institution_id: string | null;

  country_code: string;
  country_name: string;
  currency: string;

  vat_rate: number; // percent, e.g. 16

  paye_brackets: PayeBracket[];

  // Pension / social security (NAPSA slot)
  napsa_employee_rate: number; // percent
  napsa_employer_rate: number; // percent
  napsa_ceiling: number | null; // null = no ceiling
  napsa_reduces_paye: boolean;

  // Health levy (NHIMA slot)
  nhima_employee_rate: number; // percent
  nhima_employer_rate: number; // percent
  nhima_has_ceiling: boolean;
  nhima_ceiling: number | null; // null = no ceiling
  nhima_reduces_paye: boolean;

  // Skills / training levy (employer only)
  sdl_rate: number; // percent
  sdl_annual_threshold: number | null; // null = threshold check disabled
  sdl_enabled: boolean;

  fiscal_year_start: number; // 1-12
}

// ─── Zambia defaults (match the legacy hardcoded values) ────

export const ZAMBIA_DEFAULT_CONFIG: InstitutionTaxConfig = {
  institution_id: null,

  country_code: 'ZM',
  country_name: 'Zambia',
  currency: 'ZMW',

  vat_rate: 16,

  paye_brackets: [
    { min: 0,    max: 5100, rate: 0    },
    { min: 5100, max: 7100, rate: 0.20 },
    { min: 7100, max: 9200, rate: 0.30 },
    { min: 9200, max: null, rate: 0.37 },
  ],

  napsa_employee_rate: 5,
  napsa_employer_rate: 5,
  napsa_ceiling: 29816,
  napsa_reduces_paye: true,

  nhima_employee_rate: 1,
  nhima_employer_rate: 1,
  nhima_has_ceiling: false,
  nhima_ceiling: null,
  nhima_reduces_paye: false,

  sdl_rate: 1,
  sdl_annual_threshold: 1_000_000,
  sdl_enabled: true,

  fiscal_year_start: 1,
};

// ─── Coercion helpers (PostgREST returns DECIMAL as strings) ─

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  if (typeof value === 'number') return value !== 0;
  return fallback;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validate raw paye_brackets JSONB. Returns null when the value is missing
 * or malformed (caller falls back to ZAMBIA_DEFAULT_CONFIG).
 */
function parsePayeBrackets(raw: unknown): PayeBracket[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const brackets: PayeBracket[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) return null;
    const e = entry as Record<string, unknown>;
    const min = Number(e.min);
    const maxRaw = e.max;
    const max = maxRaw === null || maxRaw === undefined || maxRaw === '' ? null : Number(maxRaw);
    const rate = Number(e.rate);
    if (!Number.isFinite(min) || min < 0) return null;
    if (max !== null && (!Number.isFinite(max) || max <= min)) return null;
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) return null;
    brackets.push({ min, max, rate });
  }
  return brackets;
}

// ─── Fetch per-institution config ────────────────────────────

/**
 * Read the institution's statutory config from country_statutory_configs.
 * NEVER throws — returns ZAMBIA_DEFAULT_CONFIG (with institution_id set)
 * when there is no row, paye_brackets is missing/invalid, or anything fails.
 */
export async function fetchInstitutionTaxConfig(
  supabase: SupabaseClient,
  institutionId: string | null | undefined
): Promise<InstitutionTaxConfig> {
  const fallback = (): InstitutionTaxConfig => ({
    ...ZAMBIA_DEFAULT_CONFIG,
    institution_id: institutionId ?? null,
  });

  try {
    if (!institutionId) return fallback();

    const { data, error } = await supabase
      .from('country_statutory_configs')
      .select('*')
      .eq('institution_id', institutionId)
      .maybeSingle();

    if (error || !data) return fallback();

    const row = data as Record<string, unknown>;
    const brackets = parsePayeBrackets(row.paye_brackets);
    if (!brackets) return fallback();

    const fiscalYearStart = toNumber(row.fiscal_year_start, 1);

    return {
      institution_id: institutionId,
      country_code:
        typeof row.country_code === 'string' && row.country_code ? row.country_code : 'ZM',
      country_name:
        typeof row.country_name === 'string' && row.country_name ? row.country_name : 'Zambia',
      currency: typeof row.currency === 'string' && row.currency ? row.currency : 'ZMW',
      vat_rate: toNumber(row.vat_rate, 16),
      paye_brackets: brackets,
      napsa_employee_rate: toNumber(row.napsa_employee_rate, 5),
      napsa_employer_rate: toNumber(row.napsa_employer_rate, 5),
      napsa_ceiling: toNullableNumber(row.napsa_ceiling),
      napsa_reduces_paye: toBoolean(row.napsa_reduces_paye, true),
      nhima_employee_rate: toNumber(row.nhima_employee_rate, 1),
      nhima_employer_rate: toNumber(row.nhima_employer_rate, 1),
      nhima_has_ceiling: toBoolean(row.nhima_has_ceiling, false),
      nhima_ceiling: toNullableNumber(row.nhima_ceiling),
      nhima_reduces_paye: toBoolean(row.nhima_reduces_paye, false),
      sdl_rate: toNumber(row.sdl_rate, 1),
      sdl_annual_threshold: toNullableNumber(row.sdl_annual_threshold),
      sdl_enabled: toBoolean(row.sdl_enabled, false),
      fiscal_year_start:
        fiscalYearStart >= 1 && fiscalYearStart <= 12 ? Math.floor(fiscalYearStart) : 1,
    };
  } catch {
    return fallback();
  }
}

// ─── Convert to the universal calculator's config shape ──────

/**
 * Convert an InstitutionTaxConfig to universalPayroll's
 * CountryStatutoryConfig shape so calculateUniversalPayroll() can be reused
 * by any consumer that wants the UniversalPayrollResult shape.
 */
export function configToUniversalConfig(config: InstitutionTaxConfig): CountryStatutoryConfig {
  const bands = (config.paye_brackets ?? []).map((b) => ({
    from: b.min,
    to: b.max === null || b.max === undefined ? Infinity : b.max,
    rate: b.rate, // decimal fraction, same convention as COUNTRY_CONFIGS
  }));

  return {
    countryCode: config.country_code,
    countryName: config.country_name,
    currency: config.currency,
    vatRate: config.vat_rate,
    payeTaxRate: bands.length > 0 ? Math.max(...bands.map((b) => b.rate)) * 100 : 0,
    payeBands: bands,
    pensionEmployeeRate: config.napsa_employee_rate,
    pensionEmployerRate: config.napsa_employer_rate,
    pensionCeiling: config.napsa_ceiling ?? undefined,
    pensionReducesPaye: config.napsa_reduces_paye,
    healthEmployeeRate: config.nhima_employee_rate,
    healthEmployerRate: config.nhima_employer_rate,
    healthCeiling:
      config.nhima_has_ceiling && config.nhima_ceiling != null
        ? config.nhima_ceiling
        : undefined,
    healthReducesPaye: config.nhima_reduces_paye,
    sdlRate: config.sdl_rate,
    sdlAnnualThreshold: config.sdl_annual_threshold ?? undefined,
    sdlEnabled: config.sdl_enabled,
  };
}
