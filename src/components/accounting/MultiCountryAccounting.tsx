import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Globe, Plus, Download, BookOpenCheck, Scale, ReceiptText, Landmark,
  TriangleAlert, CircleCheck, Wallet
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { exportToCSV } from "@/utils/pdfExport";
import { getCoaTemplate, listCoaTemplates, type CoaTemplate } from "@/utils/chartOfAccountsTemplates";
import { COUNTRY_CONFIGS } from "@/utils/universalPayroll";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export interface CountryTaxConfig {
  countryCode: string;
  countryName: string;
  currency: string;
  vatRate: number;
}

const COUNTRY_PRESETS: CountryTaxConfig[] = [
  { countryCode: "ZM", countryName: "Zambia", currency: "ZMW", vatRate: 16 },
  { countryCode: "US", countryName: "United States", currency: "USD", vatRate: 8.5 },
  { countryCode: "GB", countryName: "United Kingdom", currency: "GBP", vatRate: 20 },
  { countryCode: "KE", countryName: "Kenya", currency: "KES", vatRate: 16 },
  { countryCode: "NG", countryName: "Nigeria", currency: "NGN", vatRate: 7.5 },
  { countryCode: "ZA", countryName: "South Africa", currency: "ZAR", vatRate: 15 },
];

export type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

export interface AccountItem {
  id: string;
  code: string;
  name: string;
  account_type: AccountType;
}

export interface JournalEntryRow {
  id: string;
  entry_number: string;
  entry_date: string;
  reference: string | null;
  description: string;
  debit_account: string;
  credit_account: string;
  amount: number;
}

/**
 * Chart templates now live in @/utils/chartOfAccountsTemplates (Odoo-style:
 * per-country templates, institution picks one when seeding). Kept here as a
 * deprecated alias so nothing breaks if imported elsewhere.
 * @deprecated Use getCoaTemplate() from @/utils/chartOfAccountsTemplates
 */
export const STANDARD_CHART = [
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
] as { code: string; name: string; account_type: AccountType }[];

/** Debit-normal account types (balance = debits − credits). Others are credit-normal. */
const DEBIT_NORMAL: AccountType[] = ["Asset", "Expense"];

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const MultiCountryAccounting = ({ institutionId }: { institutionId: string | null }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [journals, setJournals] = useState<JournalEntryRow[]>([]);
  const [country, setCountry] = useState<CountryTaxConfig>(COUNTRY_PRESETS[0]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  // Odoo-style: institution picks which country template to seed from.
  // Defaults to the institution's configured country template.
  const [templateCode, setTemplateCode] = useState<string>("ZM");

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [newAccount, setNewAccount] = useState({ code: "", name: "", type: "Asset" as AccountType });
  const [newJournal, setNewJournal] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    reference: "",
    description: "",
    debitAccount: "",
    creditAccount: "",
    amount: "",
  });

  const load = async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [accRes, jRes, cfgRes] = await Promise.all([
        supabase.from("chart_of_accounts").select("id, code, name, account_type").eq("institution_id", institutionId).order("code"),
        supabase.from("journal_entries").select("id, entry_number, entry_date, reference, description, debit_account, credit_account, amount").eq("institution_id", institutionId).order("entry_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("country_statutory_configs").select("country_code, country_name, currency, vat_rate").eq("institution_id", institutionId).maybeSingle(),
      ]);
      if (accRes.error) throw accRes.error;
      if (jRes.error) throw jRes.error;
      if (cfgRes.error) throw cfgRes.error;
      setAccounts((accRes.data ?? []) as AccountItem[]);
      setJournals((jRes.data ?? []) as JournalEntryRow[]);
      if (cfgRes.data) {
        setCountry({
          countryCode: cfgRes.data.country_code,
          countryName: cfgRes.data.country_name,
          currency: cfgRes.data.currency,
          vatRate: Number(cfgRes.data.vat_rate),
        });
        // Default the COA template picker to the institution's country
        setTemplateCode(cfgRes.data.country_code ?? "ZM");
      }
    } catch (e: any) {
      setLoadError(friendlyErrorMessage(e, "Could not load the financial ledger."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  /** Real double-entry balances computed from posted journal entries. */
  const balances = useMemo(() => {
    const debits: Record<string, number> = {};
    const credits: Record<string, number> = {};
    for (const j of journals) {
      const amt = Number(j.amount) || 0;
      debits[j.debit_account] = (debits[j.debit_account] ?? 0) + amt;
      credits[j.credit_account] = (credits[j.credit_account] ?? 0) + amt;
    }
    const byCode: Record<string, number> = {};
    for (const a of accounts) {
      const d = debits[a.code] ?? 0;
      const c = credits[a.code] ?? 0;
      byCode[a.code] = DEBIT_NORMAL.includes(a.account_type) ? d - c : c - d;
    }
    return byCode;
  }, [accounts, journals]);

  const totals = useMemo(() => {
    const sum = (t: AccountType) =>
      accounts.filter((a) => a.account_type === t).reduce((s, a) => s + (balances[a.code] ?? 0), 0);
    const revenue = sum("Revenue");
    const expenses = sum("Expense");
    const assets = sum("Asset");
    const liabilities = sum("Liability");
    const equity = sum("Equity");
    const netIncome = revenue - expenses;
    return { revenue, expenses, assets, liabilities, equity, netIncome };
  }, [accounts, balances]);

  const hasTransactions = journals.length > 0;
  const estimatedVat = (totals.revenue * country.vatRate) / 100;

  const seedChart = async () => {
    if (!institutionId) return;
    setSeeding(true);
    try {
      const template: CoaTemplate = getCoaTemplate(templateCode);
      const rows = template.accounts.map((a) => ({
        institution_id: institutionId,
        code: a.code,
        name: a.name,
        account_type: a.account_type,
        balance: 0,
      }));
      const { error } = await supabase.from("chart_of_accounts").insert(rows);
      if (error) throw error;
      toast.success(`"${template.label}" chart loaded — all balances start at zero.`);
      await load();
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, "Could not create the chart of accounts."));
    } finally {
      setSeeding(false);
    }
  };

  const addAccount = async () => {
    if (!institutionId) return;
    if (!newAccount.code.trim() || !newAccount.name.trim()) {
      toast.error("Account code and name are required.");
      return;
    }
    try {
      const { error } = await supabase.from("chart_of_accounts").insert({
        institution_id: institutionId,
        code: newAccount.code.trim(),
        name: newAccount.name.trim(),
        account_type: newAccount.type,
        balance: 0,
      });
      if (error) throw error;
      toast.success("Account added with a zero opening balance.");
      setShowAccountModal(false);
      setNewAccount({ code: "", name: "", type: "Asset" });
      await load();
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, "Could not add the account."));
    }
  };

  const postJournal = async () => {
    if (!institutionId || !user) return;
    const amount = Number(newJournal.amount);
    if (!newJournal.description.trim()) {
      toast.error("A description is required for every journal entry.");
      return;
    }
    if (!newJournal.debitAccount || !newJournal.creditAccount) {
      toast.error("Select both a debit and a credit account.");
      return;
    }
    if (newJournal.debitAccount === newJournal.creditAccount) {
      toast.error("Debit and credit accounts must be different.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Amount must be greater than zero.");
      return;
    }
    setPosting(true);
    try {
      // Double-entry is enforced by construction: one debit leg = one credit leg.
      const entry_number = `JE-${newJournal.entry_date.replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const { error } = await supabase.from("journal_entries").insert({
        institution_id: institutionId,
        entry_number,
        entry_date: newJournal.entry_date,
        reference: newJournal.reference.trim() || null,
        description: newJournal.description.trim(),
        debit_account: newJournal.debitAccount,
        credit_account: newJournal.creditAccount,
        amount,
        posted_by: user.id,
      });
      if (error) throw error;
      toast.success(`Journal entry ${entry_number} posted.`);
      setShowJournalModal(false);
      setNewJournal({
        entry_date: new Date().toISOString().slice(0, 10),
        reference: "",
        description: "",
        debitAccount: "",
        creditAccount: "",
        amount: "",
      });
      await load();
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, "Could not post the journal entry."));
    } finally {
      setPosting(false);
    }
  };

  const handleCountryChange = async (code: string) => {
    const preset = COUNTRY_PRESETS.find((c) => c.countryCode === code) ?? COUNTRY_PRESETS[0];
    setCountry(preset);
    setTemplateCode(preset.countryCode);
    if (!institutionId) return;
    try {
      // Pull the full statutory preset so PAYE brackets stay in sync with the
      // config-driven payroll engine (paye_brackets JSONB).
      const full = COUNTRY_CONFIGS[preset.countryCode];
      const brackets = full?.payeBands?.map((b) => ({
        min: b.from,
        max: b.to === Infinity ? null : b.to,
        rate: b.rate,
      })) ?? null;
      const { error } = await supabase.from("country_statutory_configs").upsert(
        {
          institution_id: institutionId,
          country_code: preset.countryCode,
          country_name: preset.countryName,
          currency: preset.currency,
          vat_rate: preset.vatRate,
          ...(brackets ? { paye_brackets: brackets } : {}),
          ...(full ? {
            napsa_employee_rate: full.pensionEmployeeRate,
            napsa_employer_rate: full.pensionEmployerRate,
            napsa_ceiling: full.pensionCeiling ?? null,
            napsa_reduces_paye: full.pensionReducesPaye,
            nhima_employee_rate: full.healthEmployeeRate,
            nhima_employer_rate: full.healthEmployerRate,
            nhima_reduces_paye: full.healthReducesPaye,
            sdl_rate: full.sdlRate ?? 0,
            sdl_annual_threshold: full.sdlAnnualThreshold ?? 0,
            sdl_enabled: full.sdlEnabled ?? false,
          } : {}),
        },
        { onConflict: "institution_id" }
      );
      if (error) throw error;
      toast.success(`Tax jurisdiction saved: ${preset.countryName} (${preset.currency})`);
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, "Could not save the tax jurisdiction."));
    }
  };

  const inputCls =
    "w-full min-h-[44px] p-2.5 rounded-xl border border-graphite-300 dark:border-slate-700 text-sm font-semibold bg-white dark:bg-slate-800 dark:text-slate-100";
  const labelCls = "block text-xs font-semibold uppercase text-graphite-500 dark:text-slate-400 mb-1.5";
  const btnPrimary =
    "min-h-[44px] px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50";

  if (!institutionId) {
    return (
      <div className="p-10 text-center rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900">
        <Wallet className="h-10 w-10 mx-auto text-graphite-400 mb-3" />
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No institution selected</p>
        <p className="text-xs text-graphite-500 dark:text-slate-400 mt-1">
          The financial ledger belongs to an institution. Join or select one to continue.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-10 text-center text-sm font-bold text-graphite-500 dark:text-slate-400">Loading financial ledger…</div>;
  }

  if (loadError) {
    return (
      <div className="p-10 text-center rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900">
        <TriangleAlert className="h-10 w-10 mx-auto text-warning-500 mb-3" />
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ledger unavailable</p>
        <p className="text-xs text-graphite-500 dark:text-slate-400 mt-1">{loadError}</p>
        <button onClick={load} className={`${btnPrimary} mt-4`}>Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-canvas-silk dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpenCheck className="h-5 w-5 text-primary-500" />
            Healthcare Financial Ledger
          </h2>
          <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium mt-0.5">
            Double-entry general ledger · chart of accounts · journal entries. Every figure below is computed from posted entries — nothing is estimated or pre-filled.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {accounts.length > 0 && (
            <button
              onClick={() =>
                exportToCSV(
                  `ChartOfAccounts_${country.countryCode}`,
                  accounts.map((a) => ({
                    code: a.code,
                    name: a.name,
                    type: a.account_type,
                    balance: (balances[a.code] ?? 0).toFixed(2),
                  }))
                )
              }
              className="min-h-[44px] px-3 rounded-xl bg-canvas-mist dark:bg-slate-800 font-bold text-xs flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          )}
          <button onClick={() => setShowJournalModal(true)} className={btnPrimary} disabled={accounts.length === 0}>
            <Plus className="h-4 w-4" /> Post Journal Entry
          </button>
        </div>
      </div>

      {/* No accounts yet — honest empty state */}
      {accounts.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border border-dashed border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900">
          <Landmark className="h-10 w-10 mx-auto text-graphite-400 mb-3" />
          <p className="text-sm font-semibold">No chart of accounts yet</p>
          <p className="text-xs text-graphite-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            This institution has no ledger accounts. Pick a country template to load a standard healthcare chart of accounts — every account starts at zero, and you can add, rename, or remove accounts afterwards.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <label className="text-xs font-semibold text-graphite-500 dark:text-slate-400" htmlFor="coa-template">
              Template
            </label>
            <select
              id="coa-template"
              value={templateCode}
              onChange={(e) => setTemplateCode(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl border border-graphite-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              {listCoaTemplates().map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button onClick={seedChart} disabled={seeding} className={btnPrimary}>
              {seeding ? "Creating…" : `Load ${getCoaTemplate(templateCode).label} chart`}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards — real computed figures, or honest empty state */}
          {!hasTransactions ? (
            <div className="p-8 text-center rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900">
              <ReceiptText className="h-10 w-10 mx-auto text-graphite-400 mb-3" />
              <p className="text-sm font-semibold">No transactions yet</p>
              <p className="text-xs text-graphite-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                The chart of accounts is set up, but no journal entries have been posted. Figures will appear here once you post your first entry — nothing is shown until then.
              </p>
              <button onClick={() => setShowJournalModal(true)} className={`${btnPrimary} mt-4 mx-auto`}>
                <Plus className="h-4 w-4" /> Post your first journal entry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
                <div className="text-xs font-semibold text-graphite-500 dark:text-slate-400 uppercase">Gross Revenue</div>
                <div className="text-2xl font-bold text-primary-500 mt-1 tabular-nums">
                  {country.currency} {fmt(totals.revenue)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">From posted entries</div>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
                <div className="text-xs font-semibold text-graphite-500 dark:text-slate-400 uppercase">Operating Expenses</div>
                <div className="text-2xl font-bold text-error-500 mt-1 tabular-nums">
                  {country.currency} {fmt(totals.expenses)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">From posted entries</div>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
                <div className="text-xs font-semibold text-graphite-500 dark:text-slate-400 uppercase">Net Income</div>
                <div className="text-2xl font-bold text-success-500 mt-1 tabular-nums">
                  {country.currency} {fmt(totals.netIncome)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Revenue − expenses</div>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
                <div className="text-xs font-semibold text-graphite-500 dark:text-slate-400 uppercase">Est. VAT ({country.vatRate}%)</div>
                <div className="text-2xl font-bold text-warning-500 mt-1 tabular-nums">
                  {country.currency} {fmt(estimatedVat)}
                </div>
                <div className="text-xs text-amber-500 font-bold mt-0.5">Estimate, not a filing figure</div>
              </div>
            </div>
          )}

          {/* Trial balance check — only meaningful with transactions */}
          {hasTransactions && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <CircleCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                Books balance — total debits equal total credits across {journals.length} posted {journals.length === 1 ? "entry" : "entries"}.
              </p>
            </div>
          )}

          {/* Tax jurisdiction */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-primary-500" />
              <span className="text-xs font-semibold uppercase text-graphite-500 dark:text-slate-400">Tax Jurisdiction:</span>
              <select
                value={country.countryCode}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="min-h-[44px] px-3 rounded-xl border border-graphite-300 dark:border-slate-700 text-sm font-bold bg-white dark:bg-slate-800 dark:text-slate-100"
              >
                {COUNTRY_PRESETS.map((c) => (
                  <option key={c.countryCode} value={c.countryCode}>
                    {c.countryName} ({c.currency})
                  </option>
                ))}
              </select>
            </div>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold text-white bg-success-500">
              Active {country.countryCode} Rules
            </span>
          </div>

          {/* Chart of accounts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary-500" /> Chart of Accounts
              </h3>
              <button onClick={() => setShowAccountModal(true)} className="min-h-[44px] px-3 rounded-xl text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1">
                <Plus className="h-4 w-4" /> Add Account
              </button>
            </div>
            <div className="w-full overflow-x-auto rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-800/50 text-xs font-semibold uppercase text-graphite-500 dark:text-slate-400">
                    <th className="py-2.5 px-4">Code</th>
                    <th className="py-2.5 px-3">Account Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Balance ({country.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                      <td className="py-3 px-4 font-bold tabular-nums">{acc.code}</td>
                      <td className="py-3 px-3 font-bold">{acc.name}</td>
                      <td className="py-3 px-3 text-graphite-500 dark:text-slate-400 text-xs">{acc.account_type}</td>
                      <td className="py-3 px-3 text-right font-bold text-primary-600 dark:text-primary-400 tabular-nums">
                        {fmt(balances[acc.code] ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Journal entries */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <ReceiptText className="h-4 w-4 text-primary-500" /> Journal Entries
              <span className="text-xs font-bold text-graphite-400">({journals.length})</span>
            </h3>
            {journals.length === 0 ? (
              <p className="text-xs text-graphite-500 dark:text-slate-400 p-4 rounded-2xl border border-dashed border-graphite-300 dark:border-slate-700 text-center">
                No journal entries posted yet.
              </p>
            ) : (
              <div className="w-full overflow-x-auto rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-800/50 text-xs font-semibold uppercase text-graphite-500 dark:text-slate-400">
                      <th className="py-2.5 px-4">Entry</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Debit</th>
                      <th className="py-2.5 px-3">Credit</th>
                      <th className="py-2.5 px-3 text-right">Amount ({country.currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
                    {journals.map((j) => (
                      <tr key={j.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                        <td className="py-3 px-4 font-bold tabular-nums text-xs">{j.entry_number}</td>
                        <td className="py-3 px-3 text-xs whitespace-nowrap">{j.entry_date}</td>
                        <td className="py-3 px-3 text-xs">
                          <span className="font-bold">{j.description}</span>
                          {j.reference && <span className="block text-graphite-400">Ref: {j.reference}</span>}
                        </td>
                        <td className="py-3 px-3 text-xs tabular-nums">{j.debit_account}</td>
                        <td className="py-3 px-3 text-xs tabular-nums">{j.credit_account}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmt(Number(j.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add account dialog */}
      <Dialog open={showAccountModal} onOpenChange={setShowAccountModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Ledger Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className={labelCls}>Account Code</label>
              <input className={inputCls} value={newAccount.code} onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })} placeholder="e.g. 1040" />
            </div>
            <div>
              <label className={labelCls}>Account Name</label>
              <input className={inputCls} value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} placeholder="e.g. NHIMA Receivables" />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={newAccount.type} onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as AccountType })}>
                {(["Asset", "Liability", "Equity", "Revenue", "Expense"] as AccountType[]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-graphite-500 dark:text-slate-400">New accounts start with a zero balance. Post a journal entry to move money.</p>
          </div>
          <DialogFooter>
            <button onClick={() => setShowAccountModal(false)} className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-graphite-500">Cancel</button>
            <button onClick={addAccount} className={btnPrimary}>Add Account</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post journal entry dialog */}
      <Dialog open={showJournalModal} onOpenChange={setShowJournalModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Post Journal Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" className={inputCls} value={newJournal.entry_date} onChange={(e) => setNewJournal({ ...newJournal, entry_date: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Reference (optional)</label>
                <input className={inputCls} value={newJournal.reference} onChange={(e) => setNewJournal({ ...newJournal, reference: e.target.value })} placeholder="INV-001" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <input className={inputCls} value={newJournal.description} onChange={(e) => setNewJournal({ ...newJournal, description: e.target.value })} placeholder="What is this entry for?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Debit Account</label>
                <select className={inputCls} value={newJournal.debitAccount} onChange={(e) => setNewJournal({ ...newJournal, debitAccount: e.target.value })}>
                  <option value="">Select…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Credit Account</label>
                <select className={inputCls} value={newJournal.creditAccount} onChange={(e) => setNewJournal({ ...newJournal, creditAccount: e.target.value })}>
                  <option value="">Select…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Amount ({country.currency})</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={newJournal.amount} onChange={(e) => setNewJournal({ ...newJournal, amount: e.target.value })} placeholder="0.00" />
            </div>
            <p className="text-xs text-graphite-500 dark:text-slate-400">
              Double-entry is enforced: the debit and credit legs are always equal. Entries are permanent — they cannot be edited or deleted.
            </p>
          </div>
          <DialogFooter>
            <button onClick={() => setShowJournalModal(false)} className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-graphite-500">Cancel</button>
            <button onClick={postJournal} disabled={posting} className={btnPrimary}>
              {posting ? "Posting…" : "Post Entry"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MultiCountryAccounting;
