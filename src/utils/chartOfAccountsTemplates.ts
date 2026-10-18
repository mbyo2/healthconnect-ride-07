/**
 * Chart of Accounts Templates — Odoo-style per-country seeding
 * ============================================================
 * Each institution loads the template matching its country when setting up
 * its ledger. Templates are starting points only — institutions can add,
 * rename, or remove accounts freely after seeding.
 *
 * To add a new country: export a new CoaTemplate and register it in
 * COA_TEMPLATES below. No code changes needed elsewhere.
 */

export type CoaAccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

export interface CoaTemplateAccount {
  code: string;
  name: string;
  account_type: CoaAccountType;
}

export interface CoaTemplate {
  countryCode: string;   // ISO code, e.g. 'ZM'. Use 'GENERIC' for the fallback.
  countryName: string;
  label: string;         // Shown in the UI, e.g. "Zambia Standard"
  accounts: CoaTemplateAccount[];
}

/** Zambia Standard — 12-account healthcare chart (ZRA-friendly structure) */
export const ZAMBIA_COA: CoaTemplate = {
  countryCode: "ZM",
  countryName: "Zambia",
  label: "Zambia Standard",
  accounts: [
    { code: "1010", name: "Cash & Bank Accounts", account_type: "Asset" },
    { code: "1020", name: "Accounts Receivable (Patients)", account_type: "Asset" },
    { code: "1030", name: "Medical & Pharmacy Stock Inventory", account_type: "Asset" },
    { code: "2010", name: "Accounts Payable (Suppliers)", account_type: "Liability" },
    { code: "2020", name: "Tax Payable (VAT & PAYE)", account_type: "Liability" },
    { code: "3010", name: "Hospital Equity Capital", account_type: "Equity" },
    { code: "4010", name: "OPD & Patient Consultation Fees", account_type: "Revenue" },
    { code: "4020", name: "Pharmacy Sales Revenue", account_type: "Revenue" },
    { code: "4030", name: "Laboratory & Imaging Services", account_type: "Revenue" },
    { code: "5010", name: "Staff Salaries & Clinical Payroll", account_type: "Expense" },
    { code: "5020", name: "Medical Consumables & Reagents", account_type: "Expense" },
    { code: "5030", name: "Facility Utilities & Maintenance", account_type: "Expense" },
  ],
};

/** Generic healthcare chart — used when no country-specific template exists */
export const GENERIC_COA: CoaTemplate = {
  countryCode: "GENERIC",
  countryName: "Generic",
  label: "Generic Healthcare",
  accounts: [
    { code: "1000", name: "Cash and Cash Equivalents", account_type: "Asset" },
    { code: "1100", name: "Accounts Receivable", account_type: "Asset" },
    { code: "1200", name: "Medical Inventory", account_type: "Asset" },
    { code: "1500", name: "Property and Equipment", account_type: "Asset" },
    { code: "2000", name: "Accounts Payable", account_type: "Liability" },
    { code: "2100", name: "Taxes Payable", account_type: "Liability" },
    { code: "2200", name: "Accrued Payroll", account_type: "Liability" },
    { code: "3000", name: "Owner's Equity / Capital", account_type: "Equity" },
    { code: "4000", name: "Patient Service Revenue", account_type: "Revenue" },
    { code: "4100", name: "Pharmacy Revenue", account_type: "Revenue" },
    { code: "4200", name: "Laboratory Revenue", account_type: "Revenue" },
    { code: "5000", name: "Salaries and Wages", account_type: "Expense" },
    { code: "5100", name: "Medical Supplies", account_type: "Expense" },
    { code: "5200", name: "Utilities and Facilities", account_type: "Expense" },
    { code: "5300", name: "Professional Fees", account_type: "Expense" },
  ],
};

export const COA_TEMPLATES: CoaTemplate[] = [ZAMBIA_COA, GENERIC_COA];

/** Return the template for a country code, falling back to Generic. */
export function getCoaTemplate(countryCode: string | null | undefined): CoaTemplate {
  if (!countryCode) return ZAMBIA_COA; // platform default
  const found = COA_TEMPLATES.find(
    (t) => t.countryCode.toUpperCase() === countryCode.toUpperCase()
  );
  return found ?? GENERIC_COA;
}

/** All templates available for the "load a different template" picker. */
export function listCoaTemplates(): { value: string; label: string }[] {
  return COA_TEMPLATES.map((t) => ({ value: t.countryCode, label: t.label }));
}
