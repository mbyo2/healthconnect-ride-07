/**
 * Universal Multi-Country Payroll Calculator
 * ============================================================
 * Supports any country using their configured statutory rates.
 * Zambia uses the specific ZRA/NAPSA/NHIMA/SDL rules.
 * All other countries use a standard flat-rate model that is
 * fully configurable by the institution admin.
 *
 * Calculation sequence (universal):
 *   1. Calculate pension/social-security (employee share)
 *   2. If pension reduces taxable income → subtract from gross
 *   3. Calculate income tax (PAYE/PAYG/etc.) on taxable income
 *   4. Calculate health levy (employee share)
 *   5. Net Pay = Gross - pension - income_tax - health_levy
 *   6. Employer cost = Gross + employer shares + SDL/other levies
 * ============================================================
 */

import {
  calculateZambiaPayroll,
  buildZambiaPayslip,
  ZambiaPayrollResult,
  ZM_NAPSA_CEILING,
} from './zambiaPayroll';

// ─── Country Config (mirrors CountryTaxConfig in MultiCountryAccounting) ─────
export interface CountryStatutoryConfig {
  countryCode: string;
  countryName: string;
  currency: string;

  // Tax on business transactions
  vatRate: number;              // e.g. 16 for 16%

  // Income Tax / PAYE
  payeTaxRate: number;          // Flat rate or top marginal rate
  // Optional progressive bands (if provided, overrides flat rate)
  payeBands?: { from: number; to: number; rate: number }[];

  // Pension / Social Security
  pensionEmployeeRate: number;  // e.g. 5 for 5%
  pensionEmployerRate: number;
  pensionCeiling?: number;      // Max earnings subject to pension (null = no cap)
  pensionReducesPaye: boolean;  // Does pension contribution reduce taxable income?

  // Health levy / medical insurance
  healthEmployeeRate: number;   // e.g. 1 for 1%
  healthEmployerRate: number;
  healthCeiling?: number;       // null = no cap (like Zambia NHIMA)
  healthReducesPaye: boolean;

  // Skills / Training levy (employer only)
  sdlRate?: number;             // e.g. 1 for 1%
  sdlAnnualThreshold?: number;  // Employer annual payroll threshold
  sdlEnabled?: boolean;
}

export interface UniversalPayrollResult {
  countryCode: string;
  countryName: string;
  currency: string;
  grossSalary: number;

  // Pension / Social Security
  pensionEmployee: number;
  pensionEmployer: number;

  // Health levy
  healthEmployee: number;
  healthEmployer: number;

  // Income Tax
  chargeableIncome: number;
  incomeTax: number;
  taxBreakdown?: { label: string; amount: number }[];

  // SDL (employer only)
  sdlAmount: number;
  sdlApplicable: boolean;

  // Totals
  totalEmployeeDeductions: number;
  totalEmployerCost: number;
  netPay: number;

  // Source: 'zambia_specific' | 'generic'
  calculationMethod: 'zambia_specific' | 'generic_flat_rate';
}

// ─── Default country configs ───────────────────────────────────────────────
export const COUNTRY_CONFIGS: Record<string, CountryStatutoryConfig> = {
  ZM: {
    countryCode: 'ZM', countryName: 'Zambia', currency: 'ZMW',
    vatRate: 16,
    payeTaxRate: 37,
    payeBands: [
      { from: 0,    to: 5100,    rate: 0   },
      { from: 5100, to: 7100,    rate: 0.20 },
      { from: 7100, to: 9200,    rate: 0.30 },
      { from: 9200, to: Infinity, rate: 0.37 },
    ],
    pensionEmployeeRate: 5, pensionEmployerRate: 5,
    pensionCeiling: 29816, pensionReducesPaye: true,
    healthEmployeeRate: 1, healthEmployerRate: 1,
    healthCeiling: undefined, healthReducesPaye: false,
    sdlRate: 1, sdlAnnualThreshold: 1_000_000, sdlEnabled: true,
  },
  US: {
    countryCode: 'US', countryName: 'United States', currency: 'USD',
    vatRate: 0, // No federal VAT; state sales tax varies
    payeTaxRate: 22,
    payeBands: [
      { from: 0,      to: 10275,  rate: 0.10 },
      { from: 10275,  to: 41775,  rate: 0.12 },
      { from: 41775,  to: 89075,  rate: 0.22 },
      { from: 89075,  to: 170050, rate: 0.24 },
      { from: 170050, to: Infinity, rate: 0.32 },
    ],
    pensionEmployeeRate: 6.2, pensionEmployerRate: 6.2, // Social Security
    pensionCeiling: 14058, pensionReducesPaye: false,   // ~$160,200/yr
    healthEmployeeRate: 1.45, healthEmployerRate: 1.45, // Medicare
    healthCeiling: undefined, healthReducesPaye: false,
    sdlEnabled: false,
  },
  GB: {
    countryCode: 'GB', countryName: 'United Kingdom', currency: 'GBP',
    vatRate: 20,
    payeTaxRate: 20,
    payeBands: [
      { from: 0,      to: 1048,  rate: 0    }, // personal allowance /month
      { from: 1048,   to: 4189,  rate: 0.20 }, // basic rate
      { from: 4189,   to: 12500, rate: 0.40 }, // higher rate
      { from: 12500, to: Infinity, rate: 0.45 }, // additional rate
    ],
    pensionEmployeeRate: 5, pensionEmployerRate: 3,   // auto-enrolment min
    pensionCeiling: undefined, pensionReducesPaye: true,
    healthEmployeeRate: 12, healthEmployerRate: 13.8, // National Insurance
    healthCeiling: undefined, healthReducesPaye: false,
    sdlRate: 0.5, sdlAnnualThreshold: 3_000_000, sdlEnabled: true, // Apprenticeship Levy
  },
  KE: {
    countryCode: 'KE', countryName: 'Kenya', currency: 'KES',
    vatRate: 16,
    payeTaxRate: 30,
    payeBands: [
      { from: 0,       to: 24000,  rate: 0.10 },
      { from: 24000,   to: 32333,  rate: 0.25 },
      { from: 32333,   to: Infinity, rate: 0.30 },
    ],
    pensionEmployeeRate: 6, pensionEmployerRate: 6,  // NSSF
    pensionCeiling: undefined, pensionReducesPaye: true,
    healthEmployeeRate: 2.75, healthEmployerRate: 2.75, // NHIF/SHA
    healthCeiling: undefined, healthReducesPaye: false,
    sdlEnabled: false,
  },
  ZA: {
    countryCode: 'ZA', countryName: 'South Africa', currency: 'ZAR',
    vatRate: 15,
    payeTaxRate: 26,
    payeBands: [
      { from: 0,       to: 18083,  rate: 0.18 },
      { from: 18083,   to: 28583,  rate: 0.26 },
      { from: 28583,   to: 39583,  rate: 0.31 },
      { from: 39583,   to: 50000,  rate: 0.36 },
      { from: 50000,   to: Infinity, rate: 0.39 },
    ],
    pensionEmployeeRate: 7.5, pensionEmployerRate: 7.5, // UIF
    pensionCeiling: undefined, pensionReducesPaye: true,
    healthEmployeeRate: 1, healthEmployerRate: 1,
    healthCeiling: undefined, healthReducesPaye: false,
    sdlRate: 1, sdlAnnualThreshold: 0, sdlEnabled: true, // SDL always applies
  },
  NG: {
    countryCode: 'NG', countryName: 'Nigeria', currency: 'NGN',
    vatRate: 7.5,
    payeTaxRate: 24,
    payeBands: [
      { from: 0,        to: 300000,  rate: 0.07 },
      { from: 300000,   to: 600000,  rate: 0.11 },
      { from: 600000,   to: 1100000, rate: 0.15 },
      { from: 1100000,  to: 1600000, rate: 0.19 },
      { from: 1600000,  to: 3200000, rate: 0.21 },
      { from: 3200000,  to: Infinity, rate: 0.24 },
    ],
    pensionEmployeeRate: 8, pensionEmployerRate: 10, // PRA Act
    pensionCeiling: undefined, pensionReducesPaye: true,
    healthEmployeeRate: 1, healthEmployerRate: 1,
    healthCeiling: undefined, healthReducesPaye: false,
    sdlEnabled: false,
  },
  GH: {
    countryCode: 'GH', countryName: 'Ghana', currency: 'GHS',
    vatRate: 15,
    payeTaxRate: 25,
    payeBands: [
      { from: 0,      to: 402,   rate: 0    },
      { from: 402,    to: 510,   rate: 0.05 },
      { from: 510,    to: 840,   rate: 0.10 },
      { from: 840,    to: 2500,  rate: 0.175 },
      { from: 2500,   to: 5000,  rate: 0.25 },
      { from: 5000,   to: Infinity, rate: 0.30 },
    ],
    pensionEmployeeRate: 5.5, pensionEmployerRate: 13, // SSNIT
    pensionCeiling: undefined, pensionReducesPaye: false,
    healthEmployeeRate: 2.5, healthEmployerRate: 2.5, // NHIL
    healthCeiling: undefined, healthReducesPaye: false,
    sdlEnabled: false,
  },
  IN: {
    countryCode: 'IN', countryName: 'India', currency: 'INR',
    vatRate: 18,
    payeTaxRate: 20,
    payeBands: [
      { from: 0,       to: 25000,  rate: 0    },
      { from: 25000,   to: 41667,  rate: 0.05 },
      { from: 41667,   to: 83333,  rate: 0.10 },
      { from: 83333,   to: 125000, rate: 0.15 },
      { from: 125000,  to: 166667, rate: 0.20 },
      { from: 166667,  to: Infinity, rate: 0.30 },
    ],
    pensionEmployeeRate: 12, pensionEmployerRate: 12, // PF
    pensionCeiling: 15000, pensionReducesPaye: true,
    healthEmployeeRate: 1, healthEmployerRate: 1,     // ESI
    healthCeiling: 21000, healthReducesPaye: false,
    sdlEnabled: false,
  },
  CA: {
    countryCode: 'CA', countryName: 'Canada', currency: 'CAD',
    vatRate: 13,
    payeTaxRate: 20.5,
    payeBands: [
      { from: 0,       to: 11141,  rate: 0    },
      { from: 11141,   to: 53359,  rate: 0.15 },
      { from: 53359,   to: 106717, rate: 0.205 },
      { from: 106717,  to: 165430, rate: 0.26 },
      { from: 165430,  to: 235675, rate: 0.29 },
      { from: 235675,  to: Infinity, rate: 0.33 },
    ],
    pensionEmployeeRate: 5.95, pensionEmployerRate: 5.95, // CPP
    pensionCeiling: 5958, pensionReducesPaye: false,
    healthEmployeeRate: 0, healthEmployerRate: 0,
    healthCeiling: undefined, healthReducesPaye: false,
    sdlEnabled: false,
  },
  AU: {
    countryCode: 'AU', countryName: 'Australia', currency: 'AUD',
    vatRate: 10,
    payeTaxRate: 32.5,
    payeBands: [
      { from: 0,      to: 1458,  rate: 0    },
      { from: 1458,   to: 3533,  rate: 0.19 },
      { from: 3533,   to: 9367,  rate: 0.325 },
      { from: 9367,   to: 18042, rate: 0.37 },
      { from: 18042,  to: Infinity, rate: 0.45 },
    ],
    pensionEmployeeRate: 0, pensionEmployerRate: 11, // Super (employer only)
    pensionCeiling: undefined, pensionReducesPaye: false,
    healthEmployeeRate: 2, healthEmployerRate: 0,    // Medicare levy
    healthCeiling: undefined, healthReducesPaye: false,
    sdlEnabled: false,
  },
};

// ─── Generic Progressive Tax Calculator ───────────────────────────────────
function calculateProgressiveTax(
  income: number,
  bands: { from: number; to: number; rate: number }[]
): { total: number; breakdown: { label: string; amount: number }[] } {
  let remaining = Math.max(0, income);
  let total = 0;
  const breakdown: { label: string; amount: number }[] = [];

  for (const band of bands) {
    if (remaining <= 0) break;
    const bandWidth = band.to === Infinity ? remaining : Math.min(remaining, band.to - band.from);
    const taxable = Math.min(remaining, bandWidth);
    const tax = taxable * band.rate;
    total += tax;
    breakdown.push({
      label: `${(band.rate * 100).toFixed(1)}% on ${band.to === Infinity ? `above ${band.from.toLocaleString()}` : `${band.from.toLocaleString()}–${band.to.toLocaleString()}`}`,
      amount: tax,
    });
    remaining -= taxable;
  }

  return { total, breakdown };
}

// ─── Universal Payroll Calculator ─────────────────────────────────────────
/**
 * Calculate payroll for any country.
 * Uses Zambia-specific logic for ZM, generic flat/progressive rate for others.
 */
export function calculateUniversalPayroll(
  grossSalary: number,
  config: CountryStatutoryConfig,
  annualPayroll: number = 0
): UniversalPayrollResult {

  // ── Zambia: use the verified specific calculator ────────────────────────
  if (config.countryCode === 'ZM') {
    const zm = calculateZambiaPayroll(grossSalary, annualPayroll);
    return {
      countryCode: 'ZM',
      countryName: 'Zambia',
      currency: 'ZMW',
      grossSalary,
      pensionEmployee: zm.napsaEmployee,
      pensionEmployer: zm.napsaEmployer,
      healthEmployee: zm.nhimaEmployee,
      healthEmployer: zm.nhimaEmployer,
      chargeableIncome: zm.chargeableIncome,
      incomeTax: zm.totalPaye,
      taxBreakdown: [
        { label: 'PAYE Band 1 (0%: K0–K5,100)', amount: zm.payeBand1Tax },
        { label: 'PAYE Band 2 (20%: K5,101–K7,100)', amount: zm.payeBand2Tax },
        { label: 'PAYE Band 3 (30%: K7,101–K9,200)', amount: zm.payeBand3Tax },
        { label: 'PAYE Band 4 (37%: >K9,200)', amount: zm.payeBand4Tax },
      ],
      sdlAmount: zm.sdlAmount,
      sdlApplicable: zm.sdlApplicable,
      totalEmployeeDeductions: zm.totalEmployeeDeductions,
      totalEmployerCost: zm.totalEmployerCost,
      netPay: zm.netPay,
      calculationMethod: 'zambia_specific',
    };
  }

  // ── Generic: works for all other countries ─────────────────────────────
  const gross = Math.max(0, grossSalary);

  // Pension / Social Security
  const pensionBase     = config.pensionCeiling ? Math.min(gross, config.pensionCeiling) : gross;
  const pensionEmployee = pensionBase * (config.pensionEmployeeRate / 100);
  const pensionEmployer = pensionBase * (config.pensionEmployerRate / 100);

  // Health / Medical levy
  const healthBase     = config.healthCeiling ? Math.min(gross, config.healthCeiling) : gross;
  const healthEmployee = healthBase * (config.healthEmployeeRate / 100);
  const healthEmployer = healthBase * (config.healthEmployerRate / 100);

  // Chargeable income (subtract pension if it reduces taxable income)
  const chargeableIncome = Math.max(0,
    gross
    - (config.pensionReducesPaye ? pensionEmployee : 0)
    - (config.healthReducesPaye  ? healthEmployee  : 0)
  );

  // Income Tax
  let incomeTax = 0;
  let taxBreakdown: { label: string; amount: number }[] = [];

  if (config.payeBands && config.payeBands.length > 0) {
    const result = calculateProgressiveTax(chargeableIncome, config.payeBands);
    incomeTax = result.total;
    taxBreakdown = result.breakdown;
  } else {
    // Flat rate fallback
    incomeTax = chargeableIncome * (config.payeTaxRate / 100);
    taxBreakdown = [{ label: `Income Tax (${config.payeTaxRate}% flat)`, amount: incomeTax }];
  }

  // SDL (employer only, if applicable)
  const sdlApplicable = !!(config.sdlEnabled && config.sdlAnnualThreshold !== undefined && annualPayroll > config.sdlAnnualThreshold);
  const sdlAmount     = sdlApplicable && config.sdlRate ? gross * (config.sdlRate / 100) : 0;

  // Totals
  const totalEmployeeDeductions = pensionEmployee + healthEmployee + incomeTax;
  const totalEmployerCost       = gross + pensionEmployer + healthEmployer + sdlAmount;
  const netPay                  = gross - totalEmployeeDeductions;

  return {
    countryCode:    config.countryCode,
    countryName:    config.countryName,
    currency:       config.currency,
    grossSalary:    gross,
    pensionEmployee,
    pensionEmployer,
    healthEmployee,
    healthEmployer,
    chargeableIncome,
    incomeTax,
    taxBreakdown,
    sdlAmount,
    sdlApplicable,
    totalEmployeeDeductions,
    totalEmployerCost,
    netPay,
    calculationMethod: 'generic_flat_rate',
  };
}

// ─── Quick helpers ─────────────────────────────────────────────────────────
export function getCountryConfig(countryCode: string): CountryStatutoryConfig | undefined {
  return COUNTRY_CONFIGS[countryCode.toUpperCase()];
}

export function getEffectiveVATRate(countryCode: string): number {
  return COUNTRY_CONFIGS[countryCode]?.vatRate ?? 0;
}

export function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
