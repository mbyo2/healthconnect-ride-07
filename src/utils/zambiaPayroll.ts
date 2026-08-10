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
 */

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

// ─── Full Monthly Payroll Calculation ────────────────────────
/**
 * Calculate all statutory deductions for a single employee's monthly gross salary.
 * @param grossSalary - Employee's gross monthly salary (before any deductions)
 * @param annualPayroll - Employer's total annual payroll (used for SDL threshold check)
 */
export function calculateZambiaPayroll(
  grossSalary: number,
  annualPayroll: number = 0
): ZambiaPayrollResult {
  const gross = Math.max(0, grossSalary);

  // ── NAPSA ────────────────────────────────────────────────
  // Applied to gross up to the ceiling
  const napsaBase     = Math.min(gross, ZM_NAPSA_CEILING);
  const napsaEmployee = napsaBase * ZM_NAPSA_RATE_EMPLOYEE;
  const napsaEmployer = napsaBase * ZM_NAPSA_RATE_EMPLOYER;

  // ── NHIMA ────────────────────────────────────────────────
  // Applied to FULL gross (no ceiling) — does NOT reduce PAYE taxable income
  const nhimaEmployee = gross * ZM_NHIMA_RATE_EMPLOYEE;
  const nhimaEmployer = gross * ZM_NHIMA_RATE_EMPLOYER;

  // ── Chargeable Income for PAYE ───────────────────────────
  // NAPSA employee share reduces taxable income; NHIMA does NOT
  const chargeableIncome = Math.max(0, gross - napsaEmployee);

  // ── PAYE ─────────────────────────────────────────────────
  const paye = calculatePAYE(chargeableIncome);

  // ── SDL ──────────────────────────────────────────────────
  // Employer only, triggered when employer's annual payroll > K1,000,000
  const sdlApplicable = annualPayroll > ZM_SDL_ANNUAL_THRESHOLD;
  const sdlAmount     = sdlApplicable ? gross * ZM_SDL_RATE : 0;

  // ── Totals ───────────────────────────────────────────────
  const totalEmployeeDeductions = napsaEmployee + nhimaEmployee + paye.total;
  const totalEmployerCost       = gross + napsaEmployer + nhimaEmployer + sdlAmount;
  const netPay                  = gross - totalEmployeeDeductions;

  return {
    grossSalary:            gross,
    napsaEmployee,
    napsaEmployer,
    napsaCeiling:           ZM_NAPSA_CEILING,
    nhimaEmployee,
    nhimaEmployer,
    chargeableIncome,
    payeBand1Tax:           paye.band1,
    payeBand2Tax:           paye.band2,
    payeBand3Tax:           paye.band3,
    payeBand4Tax:           paye.band4,
    totalPaye:              paye.total,
    sdlApplicable,
    sdlAmount,
    totalEmployeeDeductions,
    totalEmployerCost,
    netPay,
  };
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
