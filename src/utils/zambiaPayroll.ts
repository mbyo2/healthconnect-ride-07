/**
 * Zambia ZRA Payroll Calculator
 * ============================================================
 * Verified rates from ZRA, NAPSA, NHIMA (2024 / 2025 charge year)
 *
 * PAYE Bands (monthly):
 *   K0       – K5,100   → 0%
 *   K5,101   – K7,100   → 20%
 *   K7,101   – K9,200   → 30%
 *   Above K9,200        → 37%
 *
 * NAPSA (National Pension Scheme Authority):
 *   Employee: 5% of gross, capped at K29,816/month ceiling
 *   Employer: 5% of gross, capped at K29,816/month ceiling
 *   ✅ NAPSA employee deduction REDUCES taxable income for PAYE
 *
 * NHIMA (National Health Insurance Management Authority):
 *   Employee: 1% of TOTAL gross (no ceiling/cap)
 *   Employer: 1% of TOTAL gross (no ceiling/cap)
 *   ❌ NHIMA does NOT reduce taxable income for PAYE
 *
 * SDL (Skills Development Levy):
 *   Employer only: 1% of total monthly payroll
 *   Only applies if annual payroll > ZMW 1,000,000
 *
 * VAT: 16% standard rate on taxable supply
 * All remittances due by 10th of the following month
 * ============================================================
 *
 * CONFIG-DRIVEN ENGINE (2026-10-18):
 * The Zambia defaults below are preserved verbatim for backward
 * compatibility, but all calculation logic now flows through
 * calculatePayroll(), which is driven by an InstitutionTaxConfig
 * (see ./taxConfig.ts — mirrors public.country_statutory_configs).
 * calculateZambiaPayroll() is a thin wrapper over that path using
 * ZAMBIA_DEFAULT_CONFIG and produces byte-identical results.
 */

import { ZAMBIA_DEFAULT_CONFIG, type InstitutionTaxConfig } from './taxConfig';

// ─── Constants ───────────────────────────────────────────────
export const ZM_PAYE_BANDS = [
  { from: 0,      to: 5100,    rate: 0   },
  { from: 5100,   to: 7100,    rate: 0.20 },
  { from: 7100,   to: 9200,    rate: 0.30 },
  { from: 9200,   to: Infinity, rate: 0.37 },
] as const;

export const ZM_NAPSA_RATE_EMPLOYEE  = 0.05;   // 5%
export const ZM_NAPSA_RATE_EMPLOYER  = 0.05;   // 5%
export const ZM_NAPSA_CEILING        = 29816;  // K29,816 / month (2024)

export const ZM_NHIMA_RATE_EMPLOYEE  = 0.01;   // 1% of gross (no cap)
export const ZM_NHIMA_RATE_EMPLOYER  = 0.01;   // 1% of gross (no cap)

export const ZM_SDL_RATE             = 0.01;   // 1% employer, if annual payroll > K1m
export const ZM_SDL_ANNUAL_THRESHOLD = 1_000_000; // K1,000,000 per year

export const ZM_VAT_RATE             = 0.16;   // 16%

// ─── Types ───────────────────────────────────────────────────
export interface ZambiaPayrollResult {
  grossSalary: number;

  // NAPSA
  napsaEmployee: number;    // 5% of gross (capped at ceiling)
  napsaEmployer: number;    // 5% of gross (capped at ceiling)
  napsaCeiling:  number;    // The ceiling in effect

  // NHIMA — calculated on full gross, no ceiling
  nhimaEmployee: number;    // 1% of gross
  nhimaEmployer: number;    // 1% of gross

  // PAYE — calculated on (gross - napsaEmployee) per ZRA rules
  chargeableIncome: number; // gross - napsaEmployee (NAPSA reduces taxable)
  payeBand1Tax: number;     // 0% band
  payeBand2Tax: number;     // 20% band
  payeBand3Tax: number;     // 30% band
  payeBand4Tax: number;     // 37% band
  totalPaye: number;

  // SDL (employer only, only when annual payroll > K1m)
  sdlApplicable: boolean;
  sdlAmount: number;        // 1% of gross if applicable

  // Totals
  totalEmployeeDeductions: number;  // NAPSA + NHIMA + PAYE
  totalEmployerCost: number;        // gross + napsaEmployer + nhimaEmployer + SDL
  netPay: number;                   // gross - totalEmployeeDeductions
}

export interface ZambiaPayrollSummary {
  payslipLines: { label: string; amount: number; type: 'earning' | 'deduction' | 'employer_cost' | 'subtotal' | 'net' }[];
  result: ZambiaPayrollResult;
}

// ─── Core PAYE Calculator ─────────────────────────────────────
/**
 * Calculate PAYE tax on chargeable (taxable) monthly income.
 * Uses progressive bands — only the income within each band is taxed at that rate.
 */
export function calculatePAYE(chargeableMonthlyIncome: number): {
  band1: number; band2: number; band3: number; band4: number; total: number;
} {
  const income = Math.max(0, chargeableMonthlyIncome);
  let remaining = income;

  // Band 1: K0 – K5,100 @ 0%
  const band1Taxable = Math.min(remaining, 5100);
  const band1Tax = band1Taxable * 0;
  remaining -= band1Taxable;

  // Band 2: K5,101 – K7,100 @ 20% (width = K2,000)
  const band2Taxable = Math.min(remaining, 2000);
  const band2Tax = band2Taxable * 0.20;
  remaining -= band2Taxable;

  // Band 3: K7,101 – K9,200 @ 30% (width = K2,100)
  const band3Taxable = Math.min(remaining, 2100);
  const band3Tax = band3Taxable * 0.30;
  remaining -= band3Taxable;

  // Band 4: Above K9,200 @ 37%
  const band4Tax = remaining * 0.37;

  return {
    band1: band1Tax,
    band2: band2Tax,
    band3: band3Tax,
    band4: band4Tax,
    total: band1Tax + band2Tax + band3Tax + band4Tax,
  };
}

// ─── Generic progressive-band tax (config-driven) ──────────────
/**
 * Progressive tax over arbitrary {from, to, rate} bands — only the income
 * inside each band is taxed at that band's rate. `to: Infinity` (converted
 * from a null band max) means no upper limit.
 * Same algorithm as universalPayroll's generic calculator; kept local so
 * this module stays dependency-free (universalPayroll imports this file).
 */
function calculateProgressiveBandTax(
  income: number,
  bands: { from: number; to: number; rate: number }[]
): { total: number; perBand: number[] } {
  let remaining = Math.max(0, income);
  let total = 0;
  const perBand: number[] = [];

  for (const band of bands) {
    if (remaining <= 0) {
      perBand.push(0);
      continue;
    }
    const bandWidth = band.to === Infinity ? remaining : Math.min(remaining, band.to - band.from);
    const taxable = Math.min(remaining, bandWidth);
    const tax = taxable * band.rate;
    total += tax;
    perBand.push(tax);
    remaining -= taxable;
  }

  return { total, perBand };
}

// ─── Config-driven payroll (generic engine) ────────────────────
/**
 * Calculate all statutory deductions for a single employee's monthly gross
 * salary, driven entirely by the institution's tax config.
 *
 * The result reuses the ZambiaPayrollResult shape so existing callers keep
 * working: the `napsa*` fields are the config's pension/social-security
 * slot and the `nhima*` fields are the config's health-levy slot, whatever
 * country the institution is configured for.
 *
 * @param grossSalary - Employee's gross monthly salary (before deductions)
 * @param config - Institution tax config (see ./taxConfig.ts)
 * @param annualPayroll - Employer's total annual payroll (SDL threshold check)
 */
export function calculatePayroll(
  grossSalary: number,
  config: InstitutionTaxConfig = ZAMBIA_DEFAULT_CONFIG,
  annualPayroll: number = 0
): ZambiaPayrollResult {
  const gross = Math.max(0, grossSalary);

  // ── Pension / social security (NAPSA slot) ─────────────────
  // Applied to gross up to the ceiling (no ceiling when null)
  const pensionBase     = config.napsa_ceiling != null ? Math.min(gross, config.napsa_ceiling) : gross;
  const pensionEmployee = pensionBase * (config.napsa_employee_rate / 100);
  const pensionEmployer = pensionBase * (config.napsa_employer_rate / 100);

  // ── Health levy (NHIMA slot) ───────────────────────────────
  // Applied to full gross unless the config sets a ceiling
  const healthBase = config.nhima_has_ceiling && config.nhima_ceiling != null
    ? Math.min(gross, config.nhima_ceiling)
    : gross;
  const healthEmployee = healthBase * (config.nhima_employee_rate / 100);
  const healthEmployer = healthBase * (config.nhima_employer_rate / 100);

  // ── Chargeable income for PAYE ─────────────────────────────
  // Pension and/or health reduce taxable income only when configured to
  const chargeableIncome = Math.max(0,
    gross
    - (config.napsa_reduces_paye ? pensionEmployee : 0)
    - (config.nhima_reduces_paye ? healthEmployee : 0)
  );

  // ── PAYE: generic progressive bands ────────────────────────
  const bands = (config.paye_brackets ?? []).map((b) => ({
    from: b.min,
    to: b.max === null || b.max === undefined ? Infinity : b.max,
    rate: b.rate,
  }));
  const paye = calculateProgressiveBandTax(chargeableIncome, bands);
  // The result shape carries 4 band slots (Zambia has exactly 4). For
  // configs with more bands, everything past the third rolls into band 4.
  const bandTax = (i: number) => paye.perBand[i] ?? 0;
  const tailTax = paye.perBand.slice(3).reduce((sum, t) => sum + t, 0);

  // ── SDL ────────────────────────────────────────────────────
  // Employer only, triggered when the employer's annual payroll exceeds
  // the configured threshold (and SDL is enabled for the institution)
  const sdlApplicable = !!(
    config.sdl_enabled &&
    config.sdl_annual_threshold != null &&
    annualPayroll > config.sdl_annual_threshold
  );
  const sdlAmount = sdlApplicable ? gross * (config.sdl_rate / 100) : 0;

  // ── Totals ─────────────────────────────────────────────────
  const totalEmployeeDeductions = pensionEmployee + healthEmployee + paye.total;
  const totalEmployerCost       = gross + pensionEmployer + healthEmployer + sdlAmount;
  const netPay                  = gross - totalEmployeeDeductions;

  return {
    grossSalary:            gross,
    napsaEmployee:          pensionEmployee,
    napsaEmployer:          pensionEmployer,
    napsaCeiling:           config.napsa_ceiling ?? 0, // 0 = no ceiling in effect
    nhimaEmployee:          healthEmployee,
    nhimaEmployer:          healthEmployer,
    chargeableIncome,
    payeBand1Tax:           bandTax(0),
    payeBand2Tax:           bandTax(1),
    payeBand3Tax:           bandTax(2),
    payeBand4Tax:           tailTax,
    totalPaye:              paye.total,
    sdlApplicable,
    sdlAmount,
    totalEmployeeDeductions,
    totalEmployerCost,
    netPay,
  };
}

// ─── Full Monthly Payroll Calculation ────────────────────────
/**
 * Calculate all statutory deductions for a single employee's monthly gross salary.
 * @param grossSalary - Employee's gross monthly salary (before any deductions)
 * @param annualPayroll - Employer's total annual payroll (used for SDL threshold check)
 *
 * Backward-compatible thin wrapper: identical results to the legacy
 * hardcoded implementation, via the config-driven engine with Zambia defaults.
 */
export function calculateZambiaPayroll(
  grossSalary: number,
  annualPayroll: number = 0
): ZambiaPayrollResult {
  return calculatePayroll(grossSalary, ZAMBIA_DEFAULT_CONFIG, annualPayroll);
}

// ─── Payslip Line Builder ─────────────────────────────────────
/**
 * Returns structured payslip lines ready for display or PDF printing.
 */
export function buildZambiaPayslip(grossSalary: number, annualPayroll = 0): ZambiaPayrollSummary {
  const r = calculateZambiaPayroll(grossSalary, annualPayroll);

  const payslipLines: ZambiaPayrollSummary['payslipLines'] = [
    { label: 'Gross Salary',                                          amount: r.grossSalary,            type: 'earning'       },
    { label: `NAPSA Employee (5% of gross, cap K${ZM_NAPSA_CEILING.toLocaleString()})`, amount: -r.napsaEmployee, type: 'deduction' },
    { label: 'Chargeable Income (Gross − NAPSA)',                     amount: r.chargeableIncome,        type: 'subtotal'      },
    { label: 'PAYE — Band 1: K0–K5,100 @ 0%',                        amount: -r.payeBand1Tax,           type: 'deduction'     },
    { label: 'PAYE — Band 2: K5,101–K7,100 @ 20%',                   amount: -r.payeBand2Tax,           type: 'deduction'     },
    { label: 'PAYE — Band 3: K7,101–K9,200 @ 30%',                   amount: -r.payeBand3Tax,           type: 'deduction'     },
    { label: 'PAYE — Band 4: Above K9,200 @ 37%',                    amount: -r.payeBand4Tax,           type: 'deduction'     },
    { label: 'Total PAYE (ZRA)',                                       amount: -r.totalPaye,             type: 'deduction'     },
    { label: 'NHIMA Employee (1% of gross, no cap)',                  amount: -r.nhimaEmployee,          type: 'deduction'     },
    { label: 'NET PAY',                                                amount: r.netPay,                 type: 'net'           },
    // Employer costs (shown separately)
    { label: 'NAPSA Employer (5% of gross, cap K29,816)',             amount: r.napsaEmployer,           type: 'employer_cost' },
    { label: 'NHIMA Employer (1% of gross, no cap)',                  amount: r.nhimaEmployer,           type: 'employer_cost' },
    ...(r.sdlApplicable ? [{ label: 'SDL Employer (1% of gross, payroll > K1m/yr)', amount: r.sdlAmount, type: 'employer_cost' as const }] : []),
    { label: 'Total Cost to Employer',                                 amount: r.totalEmployerCost,      type: 'employer_cost' },
  ];

  return { payslipLines, result: r };
}

// ─── VAT Helpers ─────────────────────────────────────────────
/** Calculate VAT amount from an exclusive (before-tax) amount */
export function calculateVATExclusive(amount: number): { vat: number; total: number } {
  const vat = amount * ZM_VAT_RATE;
  return { vat, total: amount + vat };
}

/** Extract VAT from an inclusive (VAT-included) amount */
export function calculateVATInclusive(totalWithVAT: number): { vat: number; exclusive: number } {
  const exclusive = totalWithVAT / (1 + ZM_VAT_RATE);
  const vat = totalWithVAT - exclusive;
  return { vat, exclusive };
}

/** Format a number as Zambian Kwacha */
export function formatKwacha(amount: number): string {
  return `K${Math.abs(amount).toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
