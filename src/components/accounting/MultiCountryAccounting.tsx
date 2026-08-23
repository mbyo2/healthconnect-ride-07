import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Globe, DollarSign, Calculator, FileSpreadsheet,
  Plus, Download, Upload, Printer, Building2
} from "lucide-react";
import { toast } from "sonner";
import { exportToCSV, exportToJSON, parseCSVFile, printStyledPDF } from "@/utils/pdfExport";
import { calculateUniversalPayroll, COUNTRY_CONFIGS, formatCurrency } from "@/utils/universalPayroll";

export interface CountryTaxConfig {
  countryCode: string;
  countryName: string;
  currency: string;
  vatRate: number;
  payeTaxRate: number;
  pensionRate: number;
  healthLevyRate: number;
}

const DEFAULT_COUNTRIES: CountryTaxConfig[] = [
  { countryCode: "ZM", countryName: "Zambia", currency: "ZMW", vatRate: 16, payeTaxRate: 37, pensionRate: 5, healthLevyRate: 1 },
  { countryCode: "US", countryName: "United States", currency: "USD", vatRate: 8.5, payeTaxRate: 22, pensionRate: 6.2, healthLevyRate: 1.45 },
  { countryCode: "GB", countryName: "United Kingdom", currency: "GBP", vatRate: 20, payeTaxRate: 20, pensionRate: 5, healthLevyRate: 12 },
  { countryCode: "KE", countryName: "Kenya", currency: "KES", vatRate: 16, payeTaxRate: 30, pensionRate: 6, healthLevyRate: 2.75 },
  { countryCode: "NG", countryName: "Nigeria", currency: "NGN", vatRate: 7.5, payeTaxRate: 24, pensionRate: 8, healthLevyRate: 1 },
  { countryCode: "ZA", countryName: "South Africa", currency: "ZAR", vatRate: 15, payeTaxRate: 26, pensionRate: 7.5, healthLevyRate: 1 },
];

export interface AccountItem {
  code: string;
  name: string;
  type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  balance: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
}

export const MultiCountryAccounting = () => {
  const [selectedCountry, setSelectedCountry] = useState<CountryTaxConfig>(DEFAULT_COUNTRIES[0]);
  const [customRates, setCustomRates] = useState<CountryTaxConfig>(DEFAULT_COUNTRIES[0]);

  const [accounts, setAccounts] = useState<AccountItem[]>([
    { code: "1010", name: "Cash & Bank Accounts", type: "Asset", balance: 145000 },
    { code: "1020", name: "Accounts Receivable (Patients)", type: "Asset", balance: 38200 },
    { code: "1030", name: "Medical & Pharmacy Stock Inventory", type: "Asset", balance: 85400 },
    { code: "2010", name: "Accounts Payable (Suppliers)", type: "Liability", balance: 22100 },
    { code: "2020", name: "Tax Payable (VAT & PAYE)", type: "Liability", balance: 14800 },
    { code: "3010", name: "Hospital Equity Capital", type: "Equity", balance: 180000 },
    { code: "4010", name: "OPD & Patient Consultation Fees", type: "Revenue", balance: 195000 },
    { code: "4020", name: "Pharmacy Sales Revenue", type: "Revenue", balance: 124000 },
    { code: "4030", name: "Laboratory & Imaging Services", type: "Revenue", balance: 78000 },
    { code: "5010", name: "Staff Salaries & Clinical Payroll", type: "Expense", balance: 110000 },
    { code: "5020", name: "Medical Consumables & Reagents", type: "Expense", balance: 45000 },
    { code: "5030", name: "Facility Utilities & Maintenance", type: "Expense", balance: 16200 },
  ]);

  const [journals, setJournals] = useState<JournalEntry[]>([
    { id: "JE-001", date: "2026-08-01", reference: "INV-2026-08", description: "Patient consultation & lab test revenue", debitAccount: "1010", creditAccount: "4010", amount: 1250 },
    { id: "JE-002", date: "2026-08-03", reference: "PO-PHARM-88", description: "Bulk antibiotic stock purchase", debitAccount: "1030", creditAccount: "2010", amount: 4800 },
  ]);

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [newAccount, setNewAccount] = useState({ code: "", name: "", type: "Asset" as AccountItem["type"], balance: 0 });
  const [newJournal, setNewJournal] = useState({ reference: "", description: "", debitAccount: "1010", creditAccount: "4010", amount: 0 });

  const totalRevenue = accounts.filter((a) => a.type === "Revenue").reduce((s, a) => s + a.balance, 0);
  const totalExpenses = accounts.filter((a) => a.type === "Expense").reduce((s, a) => s + a.balance, 0);
  const grossProfit = totalRevenue - totalExpenses;
  const estimatedVatTax = (totalRevenue * customRates.vatRate) / 100;
  const netProfit = grossProfit - estimatedVatTax;

  const handleCountryChange = (code: string) => {
    const found = DEFAULT_COUNTRIES.find((c) => c.countryCode === code) || DEFAULT_COUNTRIES[0];
    setSelectedCountry(found);
    setCustomRates(found);
    toast.success(`Configured accounting for ${found.countryName} (${found.currency})`);
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#e6e9ef] pb-4">
        <div>
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#0073ea]" />
            Multi-Country HRMS & Healthcare Financial Ledger
          </h2>
          <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
            ZRA/NAPSA/NHIMA statutory rules, chart of accounts, and automated P&L reporting
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(`ChartOfAccounts_${customRates.countryCode}`, accounts)}
            className="px-3 py-1.5 rounded-md bg-[#f0f2f7] dark:bg-slate-800 font-bold text-xs flex items-center gap-1"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button
            onClick={() => setShowAccountModal(true)}
            className="px-3.5 py-1.5 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add Account
          </button>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs">
          <div className="text-xs font-extrabold text-[#676879] uppercase">Gross Revenue</div>
          <div className="text-2xl font-black font-mono text-[#0073ea] mt-1">
            {customRates.currency} {totalRevenue.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Consultations & Pharmacy</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs">
          <div className="text-xs font-extrabold text-[#676879] uppercase">Operating Expenses</div>
          <div className="text-2xl font-black font-mono text-[#e2445c] mt-1">
            {customRates.currency} {totalExpenses.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Salaries & Consumables</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs">
          <div className="text-xs font-extrabold text-[#676879] uppercase">Net Income</div>
          <div className="text-2xl font-black font-mono text-[#00c875] mt-1">
            {customRates.currency} {netProfit.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-500 font-bold mt-0.5">After VAT Deduction</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs">
          <div className="text-xs font-extrabold text-[#676879] uppercase">VAT Tax ({customRates.vatRate}%)</div>
          <div className="text-2xl font-black font-mono text-[#fdab3d] mt-1">
            {customRates.currency} {estimatedVatTax.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-500 font-bold mt-0.5">Statutory Liability</div>
        </div>
      </div>

      {/* Country Config Selector */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-extrabold uppercase text-[#676879]">Tax Jurisdiction:</span>
          <select
            value={selectedCountry.countryCode}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="p-1.5 rounded-md border border-[#c3c6d4] text-xs font-bold bg-white"
          >
            {DEFAULT_COUNTRIES.map((c) => (
              <option key={c.countryCode} value={c.countryCode}>
                {c.countryName} ({c.currency})
              </option>
            ))}
          </select>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">
          Active {customRates.countryCode} Rules
        </span>
      </div>

      {/* Chart of Accounts Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-[#e6e9ef] bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#e6e9ef] bg-[#f5f6f8] text-[11px] font-extrabold uppercase text-[#676879]">
              <th className="py-2.5 px-4">Account Code</th>
              <th className="py-2.5 px-3">Account Title</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3 text-right">Balance ({customRates.currency})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e9ef]">
            {accounts.map((acc) => (
              <tr key={acc.code} className="hover:bg-[#f0f2f7] transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-slate-900">{acc.code}</td>
                <td className="py-3 px-3 font-extrabold text-slate-900">{acc.name}</td>
                <td className="py-3 px-3 text-[#676879]">{acc.type}</td>
                <td className="py-3 px-3 text-right font-mono font-bold text-[#0073ea]">
                  {customRates.currency} {acc.balance.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MultiCountryAccounting;
