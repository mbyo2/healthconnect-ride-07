import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Globe, DollarSign, Calculator, FileSpreadsheet, FileText,
  Plus, Download, Upload, CheckCircle2, AlertTriangle, ShieldCheck,
  TrendingUp, TrendingDown, BookOpen, Layers, RefreshCw, Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToCSV, exportToJSON, parseCSVFile, printStyledPDF } from '@/utils/pdfExport';
import { calculateUniversalPayroll, COUNTRY_CONFIGS, formatCurrency } from '@/utils/universalPayroll';

export interface CountryTaxConfig {
  countryCode: string;
  countryName: string;
  currency: string;
  vatRate: number; // e.g. 16 for 16%
  payeTaxRate: number; // Income Tax %
  pensionRate: number; // Social Security %
  healthLevyRate: number; // Statutory Health Insurance %
}

const DEFAULT_COUNTRIES: CountryTaxConfig[] = [
  // Zambia — ZRA/NAPSA/NHIMA/SDL verified 2024/2025 rates
  // PAYE: progressive bands 0%/20%/30%/37% | NAPSA: 5% employee (cap K29,816) | NHIMA: 1% of TOTAL gross | SDL: 1% employer if payroll >K1m/yr
  { countryCode: 'ZM', countryName: 'Zambia', currency: 'ZMW', vatRate: 16, payeTaxRate: 37, pensionRate: 5, healthLevyRate: 1 },
  { countryCode: 'US', countryName: 'United States', currency: 'USD', vatRate: 8.5, payeTaxRate: 22, pensionRate: 6.2, healthLevyRate: 1.45 },
  { countryCode: 'GB', countryName: 'United Kingdom', currency: 'GBP', vatRate: 20, payeTaxRate: 20, pensionRate: 5, healthLevyRate: 12 },
  { countryCode: 'KE', countryName: 'Kenya', currency: 'KES', vatRate: 16, payeTaxRate: 30, pensionRate: 6, healthLevyRate: 2.75 },
  { countryCode: 'NG', countryName: 'Nigeria', currency: 'NGN', vatRate: 7.5, payeTaxRate: 24, pensionRate: 8, healthLevyRate: 1 },
  { countryCode: 'ZA', countryName: 'South Africa', currency: 'ZAR', vatRate: 15, payeTaxRate: 26, pensionRate: 7.5, healthLevyRate: 1 },
  { countryCode: 'IN', countryName: 'India', currency: 'INR', vatRate: 18, payeTaxRate: 20, pensionRate: 12, healthLevyRate: 1 },
  { countryCode: 'CA', countryName: 'Canada', currency: 'CAD', vatRate: 13, payeTaxRate: 20.5, pensionRate: 5.95, healthLevyRate: 0 },
  { countryCode: 'AU', countryName: 'Australia', currency: 'AUD', vatRate: 10, payeTaxRate: 32.5, pensionRate: 11, healthLevyRate: 2 },
  { countryCode: 'GH', countryName: 'Ghana', currency: 'GHS', vatRate: 15, payeTaxRate: 25, pensionRate: 5.5, healthLevyRate: 2.5 },
];

export interface AccountItem {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
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

  // Chart of Accounts
  const [accounts, setAccounts] = useState<AccountItem[]>([
    { code: '1010', name: 'Cash & Bank Accounts', type: 'Asset', balance: 145000 },
    { code: '1020', name: 'Accounts Receivable (Patients)', type: 'Asset', balance: 38200 },
    { code: '1030', name: 'Medical & Pharmacy Stock Inventory', type: 'Asset', balance: 85400 },
    { code: '2010', name: 'Accounts Payable (Suppliers)', type: 'Liability', balance: 22100 },
    { code: '2020', name: 'Tax Payable (VAT & PAYE)', type: 'Liability', balance: 14800 },
    { code: '3010', name: 'Hospital Equity Capital', type: 'Equity', balance: 180000 },
    { code: '4010', name: 'OPD & Patient Consultation Fees', type: 'Revenue', balance: 195000 },
    { code: '4020', name: 'Pharmacy Sales Revenue', type: 'Revenue', balance: 124000 },
    { code: '4030', name: 'Laboratory & Imaging Services', type: 'Revenue', balance: 78000 },
    { code: '5010', name: 'Staff Salaries & Clinical Payroll', type: 'Expense', balance: 110000 },
    { code: '5020', name: 'Medical Consumables & Reagents', type: 'Expense', balance: 45000 },
    { code: '5030', name: 'Facility Utilities & Equipment Maintenance', type: 'Expense', balance: 16200 },
  ]);

  // Journal Entries
  const [journals, setJournals] = useState<JournalEntry[]>([
    { id: 'JE-001', date: '2026-08-01', reference: 'INV-2026-08', description: 'Patient consultation & lab test revenue', debitAccount: '1010', creditAccount: '4010', amount: 1250 },
    { id: 'JE-002', date: '2026-08-03', reference: 'PO-PHARM-88', description: 'Bulk antibiotic stock purchase', debitAccount: '1030', creditAccount: '2010', amount: 4800 },
    { id: 'JE-003', date: '2026-08-05', reference: 'PAYROLL-AUG1', description: 'August staff salary disbursement', debitAccount: '5010', creditAccount: '1010', amount: 32000 },
  ]);

  // Dialogs
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);

  const [newAccount, setNewAccount] = useState({ code: '', name: '', type: 'Asset' as AccountItem['type'], balance: 0 });
  const [newJournal, setNewJournal] = useState({ reference: '', description: '', debitAccount: '1010', creditAccount: '4010', amount: 0 });

  // Payroll Calculator state
  const [payrollGross, setPayrollGross] = useState<number>(10000);
  const [annualPayroll, setAnnualPayroll] = useState<number>(1200000);

  // Live payroll calculation for selected country
  const countryConfig = COUNTRY_CONFIGS[customRates.countryCode] || COUNTRY_CONFIGS['ZM'];
  const payrollResult = calculateUniversalPayroll(payrollGross, {
    ...countryConfig,
    vatRate: customRates.vatRate,
    payeTaxRate: customRates.payeTaxRate,
    pensionEmployeeRate: customRates.pensionRate,
    pensionEmployerRate: customRates.pensionRate,
    healthEmployeeRate: customRates.healthLevyRate,
    healthEmployerRate: customRates.healthLevyRate,
  }, annualPayroll);


  // Country selection handler
  const handleCountryChange = (code: string) => {
    const found = DEFAULT_COUNTRIES.find(c => c.countryCode === code) || DEFAULT_COUNTRIES[0];
    setSelectedCountry(found);
    setCustomRates(found);
    toast.success(`Configured system for ${found.countryName} (${found.currency})`);
  };

  // Add Account
  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.code || !newAccount.name) return;
    setAccounts(prev => [...prev, newAccount]);
    setShowAccountModal(false);
    setNewAccount({ code: '', name: '', type: 'Asset', balance: 0 });
    toast.success(`Added Account ${newAccount.code} — ${newAccount.name}`);
  };

  // Add Journal
  const handleAddJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (newJournal.amount <= 0) return;
    const entry: JournalEntry = {
      id: `JE-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split('T')[0],
      ...newJournal,
    };
    setJournals(prev => [entry, ...prev]);

    // Update account balances
    setAccounts(prev => prev.map(acc => {
      if (acc.code === newJournal.debitAccount) return { ...acc, balance: acc.balance + newJournal.amount };
      if (acc.code === newJournal.creditAccount) return { ...acc, balance: acc.balance + newJournal.amount };
      return acc;
    }));

    setShowJournalModal(false);
    setNewJournal({ reference: '', description: '', debitAccount: '1010', creditAccount: '4010', amount: 0 });
    toast.success(`Posted Journal Entry ${entry.id}`);
  };

  // Financial Calculations
  const totalRevenue = accounts.filter(a => a.type === 'Revenue').reduce((s, a) => s + a.balance, 0);
  const totalExpenses = accounts.filter(a => a.type === 'Expense').reduce((s, a) => s + a.balance, 0);
  const grossProfit = totalRevenue - totalExpenses;
  const estimatedVatTax = (totalRevenue * customRates.vatRate) / 100;
  const estimatedPayeTax = (totalExpenses * 0.5 * customRates.payeTaxRate) / 100; // estimated payroll tax
  const netProfit = grossProfit - estimatedVatTax;

  // File Import / Export Handlers
  const handleExportCSV = () => {
    const exportData = accounts.map(a => ({
      Account_Code: a.code,
      Account_Name: a.name,
      Category: a.type,
      Balance: a.balance,
      Currency: customRates.currency,
      Country: customRates.countryName,
    }));
    exportToCSV(`ChartOfAccounts_${customRates.countryCode}`, exportData);
    toast.success('Exported Chart of Accounts to CSV');
  };

  const handleExportJSON = () => {
    exportToJSON(`Accounting_Backup_${customRates.countryCode}`, {
      countryConfig: customRates,
      chartOfAccounts: accounts,
      journalEntries: journals,
    });
    toast.success('Exported full accounting data to JSON');
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const records = await parseCSVFile(file);
      if (records.length > 0) {
        const importedAccounts: AccountItem[] = records.map((r, i) => ({
          code: r.Account_Code || r.code || `9${i}`,
          name: r.Account_Name || r.name || 'Imported Account',
          type: (r.Category || r.type || 'Expense') as any,
          balance: Number(r.Balance || r.balance || 0),
        }));
        setAccounts(prev => [...prev, ...importedAccounts]);
        toast.success(`Imported ${importedAccounts.length} accounts from CSV`);
      }
    } catch (err) {
      toast.error('Failed to import CSV file');
    }
  };

  // Print PDF Financial Statement
  const handlePrintFinancialPDF = () => {
    const currency = customRates.currency;
    const html = `
      <div class="header">
        <div>
          <h1 class="brand-title">General Ledger & Profit Loss Statement</h1>
          <p class="brand-sub">Country Regulation: <strong>${customRates.countryName} (${customRates.countryCode})</strong> • Currency: <strong>${currency}</strong></p>
        </div>
        <div class="doc-type">
          <span class="doc-badge">FINANCIAL REPORT</span>
          <p class="brand-sub">Generated: ${new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-block">
          <h4>Statutory Tax Configuration</h4>
          <p>VAT / Sales Tax: <strong>${customRates.vatRate}%</strong></p>
          <p>Income Tax (PAYE): <strong>${customRates.payeTaxRate}%</strong></p>
          <p>Social Security / Pension: <strong>${customRates.pensionRate}%</strong></p>
        </div>
        <div class="meta-block text-right">
          <h4>Executive Summary</h4>
          <p>Gross Revenue: <strong>${currency} ${totalRevenue.toLocaleString()}</strong></p>
          <p>Total Expenses: <strong>${currency} ${totalExpenses.toLocaleString()}</strong></p>
          <p>Estimated VAT Liability: <strong>${currency} ${estimatedVatTax.toLocaleString()}</strong></p>
          <p>Net Profit: <strong style="color: #16a34a;">${currency} ${netProfit.toLocaleString()}</strong></p>
        </div>
      </div>

      <h3 style="color: #0284c7; margin-top: 24px;">Chart of Accounts Ledger Breakdown</h3>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Account Name</th>
            <th>Type</th>
            <th class="text-right">Balance (${currency})</th>
          </tr>
        </thead>
        <tbody>
          ${accounts.map(a => `
            <tr>
              <td><code>${a.code}</code></td>
              <td><strong>${a.name}</strong></td>
              <td><span style="padding: 2px 6px; border-radius: 4px; background: #f1f5f9; font-size: 11px;">${a.type}</span></td>
              <td class="text-right"><strong>${currency} ${a.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals-block">
        <div class="totals-row"><span>Total Revenue</span><span>${currency} ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        <div class="totals-row"><span>Total Expenses</span><span>-${currency} ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        <div class="totals-row"><span>VAT Tax (${customRates.vatRate}%)</span><span>-${currency} ${estimatedVatTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        <div class="totals-row grand"><span>NET PROFIT</span><span>${currency} ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
      </div>

      <div class="footer">
        <div>Official Accounting Audit Statement • Doc-O-Clock Multi-Country HRMS & Finance</div>
        <div class="signature-box">Chief Accountant / Auditor</div>
      </div>
    `;
    printStyledPDF(html, `Financial_Statement_${customRates.countryCode}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 rounded-2xl border border-primary/20">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Multi-Country HRMS & Accounting System
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Configurable statutory taxes, chart of accounts, general ledger, and styled PDF/CSV exports</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs gap-1">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON} className="text-xs gap-1">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Backup JSON
          </Button>
          <Button size="sm" onClick={handlePrintFinancialPDF} className="text-xs gap-1 bg-primary text-primary-foreground">
            <Printer className="h-3.5 w-3.5" /> Print PDF Statement
          </Button>
        </div>
      </div>

      {/* Country Configurator Card */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" /> Local Country Statutory & Tax Configurator
          </CardTitle>
          <CardDescription className="text-xs">Adjust tax rates, currency symbol, and statutory levies to comply with local national laws</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
            <div className="col-span-2">
              <Label className="text-xs">Select Country</Label>
              <Select value={selectedCountry.countryCode} onValueChange={handleCountryChange}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEFAULT_COUNTRIES.map(c => (
                    <SelectItem key={c.countryCode} value={c.countryCode} className="text-xs">
                      {c.countryName} ({c.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Currency</Label>
              <Input value={customRates.currency} onChange={e => setCustomRates({ ...customRates, currency: e.target.value })} className="h-8 text-xs font-bold" />
            </div>

            <div>
              <Label className="text-xs">VAT / Sales Tax %</Label>
              <Input type="number" value={customRates.vatRate} onChange={e => setCustomRates({ ...customRates, vatRate: Number(e.target.value) })} className="h-8 text-xs" />
            </div>

            <div>
              <Label className="text-xs">PAYE Top Rate %</Label>
              <Input type="number" value={customRates.payeTaxRate} onChange={e => setCustomRates({ ...customRates, payeTaxRate: Number(e.target.value) })} className="h-8 text-xs" />
            </div>

            <div>
              <Label className="text-xs">Pension / NAPSA %</Label>
              <Input type="number" value={customRates.pensionRate} onChange={e => setCustomRates({ ...customRates, pensionRate: Number(e.target.value) })} className="h-8 text-xs" />
            </div>
          </div>

          {/* Zambia-specific: show full band breakdown */}
          {customRates.countryCode === 'ZM' && (
            <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs space-y-2">
              <p className="font-semibold text-primary text-[11px] uppercase tracking-wide">🇿🇲 Zambia ZRA Statutory Rules (2024/2025)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="font-semibold text-foreground mb-1">PAYE Monthly Bands (progressive)</p>
                  <div className="space-y-0.5 text-muted-foreground">
                    <p>K0 – K5,100 → <span className="text-emerald-600 font-medium">0%</span> (tax-free)</p>
                    <p>K5,101 – K7,100 → <span className="font-medium">20%</span></p>
                    <p>K7,101 – K9,200 → <span className="font-medium">30%</span></p>
                    <p>Above K9,200 → <span className="text-destructive font-medium">37%</span></p>
                  </div>
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <p><span className="font-semibold text-foreground">NAPSA:</span> 5% employee + 5% employer of gross, cap K29,816/month. <span className="text-primary">Reduces PAYE taxable income.</span></p>
                  <p><span className="font-semibold text-foreground">NHIMA:</span> 1% employee + 1% employer of <span className="underline">total gross</span> (no cap). <span className="text-amber-600">Does NOT reduce PAYE taxable income.</span></p>
                  <p><span className="font-semibold text-foreground">SDL:</span> 1% employer on total payroll (if annual payroll &gt; K1,000,000).</p>
                  <p><span className="font-semibold text-foreground">VAT:</span> 16% standard rate (ZRA Smart Invoice required).</p>
                  <p className="text-[10px] text-muted-foreground">⏰ All remittances due by 10th of following month.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
            <p className="text-2xl font-bold text-primary">{customRates.currency} {totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">Total Expenses</p>
            <p className="text-2xl font-bold text-foreground">{customRates.currency} {totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Net Profit</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{customRates.currency} {netProfit.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">VAT Liability ({customRates.vatRate}%)</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{customRates.currency} {estimatedVatTax.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Accounting Tabs */}
      <Tabs defaultValue="coa" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="coa" className="text-xs"><BookOpen className="h-3.5 w-3.5 mr-1" /> Accounts</TabsTrigger>
          <TabsTrigger value="journals" className="text-xs"><Layers className="h-3.5 w-3.5 mr-1" /> Journals</TabsTrigger>
          <TabsTrigger value="pnl" className="text-xs"><TrendingUp className="h-3.5 w-3.5 mr-1" /> P&amp;L</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs"><Calculator className="h-3.5 w-3.5 mr-1" /> Payroll Calc</TabsTrigger>
        </TabsList>

        {/* Chart of Accounts Tab */}
        <TabsContent value="coa" className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">Chart of Accounts ({accounts.length})</h3>
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <Button size="sm" variant="outline" className="text-xs gap-1 pointer-events-none" tabIndex={-1}>
                  <Upload className="h-3.5 w-3.5" /> Import CSV
                </Button>
                <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
              </label>
              <Button size="sm" onClick={() => setShowAccountModal(true)} className="text-xs gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Account
              </Button>
            </div>
          </div>

          <Card className="border-border">
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-muted-foreground font-semibold">
                    <th className="p-3">Code</th>
                    <th className="p-3">Account Name</th>
                    <th className="p-3">Category Type</th>
                    <th className="p-3 text-right">Balance ({customRates.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accounts.map(acc => (
                    <tr key={acc.code} className="hover:bg-muted/20">
                      <td className="p-3 font-mono font-bold">{acc.code}</td>
                      <td className="p-3 font-medium text-foreground">{acc.name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] capitalize">{acc.type}</Badge>
                      </td>
                      <td className="p-3 text-right font-bold text-foreground">
                        {customRates.currency} {acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journal Entries Tab */}
        <TabsContent value="journals" className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">General Ledger Journal Entries ({journals.length})</h3>
            <Button size="sm" onClick={() => setShowJournalModal(true)} className="text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> Post Journal Entry
            </Button>
          </div>

          <Card className="border-border">
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-muted-foreground font-semibold">
                    <th className="p-3">ID / Date</th>
                    <th className="p-3">Reference / Description</th>
                    <th className="p-3">Debit Account</th>
                    <th className="p-3">Credit Account</th>
                    <th className="p-3 text-right">Amount ({customRates.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {journals.map(j => (
                    <tr key={j.id} className="hover:bg-muted/20">
                      <td className="p-3">
                        <p className="font-mono font-bold text-foreground">{j.id}</p>
                        <p className="text-[10px] text-muted-foreground">{j.date}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-foreground">{j.description}</p>
                        <p className="text-[10px] text-muted-foreground">Ref: {j.reference}</p>
                      </td>
                      <td className="p-3 font-mono">Debit #{j.debitAccount}</td>
                      <td className="p-3 font-mono">Credit #{j.creditAccount}</td>
                      <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {customRates.currency} {j.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit & Loss Statement Tab */}
        <TabsContent value="pnl" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Statement of Profit or Loss (P&L)</CardTitle>
                <CardDescription className="text-xs">Calculated based on {customRates.countryName} statutory tax laws</CardDescription>
              </div>
              <Button size="sm" onClick={handlePrintFinancialPDF} className="text-xs gap-1">
                <Printer className="h-3.5 w-3.5" /> Print Official PDF
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-2 border-b pb-3">
                <p className="font-semibold text-primary uppercase text-[11px]">Revenues</p>
                {accounts.filter(a => a.type === 'Revenue').map(a => (
                  <div key={a.code} className="flex justify-between pl-3">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span className="font-medium text-foreground">{customRates.currency} {a.balance.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-1 text-sm text-foreground">
                  <span>Gross Operating Revenue</span>
                  <span>{customRates.currency} {totalRevenue.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2 border-b pb-3">
                <p className="font-semibold text-destructive uppercase text-[11px]">Operating Expenses</p>
                {accounts.filter(a => a.type === 'Expense').map(a => (
                  <div key={a.code} className="flex justify-between pl-3">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span className="font-medium text-foreground">{customRates.currency} {a.balance.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-1 text-sm text-foreground">
                  <span>Total Operating Expenses</span>
                  <span>{customRates.currency} {totalExpenses.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-muted-foreground"><span>Gross Profit before Tax</span><span>{customRates.currency} {grossProfit.toLocaleString()}</span></div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400"><span>Estimated Statutory VAT ({customRates.vatRate}%)</span><span>-{customRates.currency} {estimatedVatTax.toLocaleString()}</span></div>
                <div className="flex justify-between text-lg font-bold text-emerald-600 dark:text-emerald-400 pt-2 border-t"><span>Net Income (After Statutory Levy)</span><span>{customRates.currency} {netProfit.toLocaleString()}</span></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Calculator Tab — works for ALL countries */}
        <TabsContent value="payroll" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Live Payroll Calculator — {customRates.countryName} ({customRates.currency})
              </CardTitle>
              <CardDescription className="text-xs">Enter a gross salary to see exact statutory deductions per {customRates.countryName} law</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Monthly Gross Salary ({customRates.currency})</Label>
                  <Input type="number" value={payrollGross} onChange={e => setPayrollGross(Number(e.target.value))} className="h-8 text-xs font-bold" min={0} />
                </div>
                <div>
                  <Label className="text-xs">Employer Annual Payroll ({customRates.currency}) — for SDL</Label>
                  <Input type="number" value={annualPayroll} onChange={e => setAnnualPayroll(Number(e.target.value))} className="h-8 text-xs" min={0} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Employee Payslip */}
                <div className="space-y-1 border rounded-lg p-3 bg-muted/20">
                  <p className="font-semibold text-foreground text-[11px] uppercase mb-2">Employee Payslip</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Salary</span>
                    <span className="font-bold text-foreground">{formatCurrency(payrollResult.grossSalary, customRates.currency)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>Pension / {customRates.countryCode === 'ZM' ? 'NAPSA' : 'Social Security'} ({customRates.pensionRate}%)</span>
                    <span>- {formatCurrency(payrollResult.pensionEmployee, customRates.currency)}</span>
                  </div>
                  {payrollResult.taxBreakdown?.filter(b => b.amount > 0).map((b, i) => (
                    <div key={i} className="flex justify-between text-red-600 dark:text-red-400">
                      <span className="truncate pr-2">Income Tax: {b.label}</span>
                      <span className="shrink-0">- {formatCurrency(b.amount, customRates.currency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-orange-600 dark:text-orange-400">
                    <span>{customRates.countryCode === 'ZM' ? 'NHIMA' : 'Health Levy'} ({customRates.healthLevyRate}%)</span>
                    <span>- {formatCurrency(payrollResult.healthEmployee, customRates.currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-emerald-600 dark:text-emerald-400 pt-2 border-t mt-2">
                    <span>NET PAY</span>
                    <span>{formatCurrency(payrollResult.netPay, customRates.currency)}</span>
                  </div>
                </div>

                {/* Employer Cost */}
                <div className="space-y-1 border rounded-lg p-3 bg-muted/20">
                  <p className="font-semibold text-foreground text-[11px] uppercase mb-2">Employer Cost Summary</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Salary Paid</span>
                    <span className="font-medium">{formatCurrency(payrollResult.grossSalary, customRates.currency)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>Pension Employer Share ({customRates.pensionRate}%)</span>
                    <span>{formatCurrency(payrollResult.pensionEmployer, customRates.currency)}</span>
                  </div>
                  <div className="flex justify-between text-orange-600 dark:text-orange-400">
                    <span>Health Levy Employer Share ({customRates.healthLevyRate}%)</span>
                    <span>{formatCurrency(payrollResult.healthEmployer, customRates.currency)}</span>
                  </div>
                  {payrollResult.sdlApplicable && (
                    <div className="flex justify-between text-purple-600 dark:text-purple-400">
                      <span>SDL (Skills Dev Levy 1%)</span>
                      <span>{formatCurrency(payrollResult.sdlAmount, customRates.currency)}</span>
                    </div>
                  )}
                  {!payrollResult.sdlApplicable && customRates.countryCode === 'ZM' && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>SDL (annual payroll &lt; K1,000,000)</span>
                      <span>Not applicable</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm text-primary pt-2 border-t mt-2">
                    <span>TOTAL EMPLOYER COST</span>
                    <span>{formatCurrency(payrollResult.totalEmployerCost, customRates.currency)}</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground text-center">Calculated using verified {customRates.countryName} statutory rates. Adjust rates in the configurator above to update calculations.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Account Modal */}
      <Dialog open={showAccountModal} onOpenChange={setShowAccountModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-base">Add New Account</DialogTitle></DialogHeader>
          <form onSubmit={handleAddAccount} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Account Code *</Label>
              <Input value={newAccount.code} onChange={e => setNewAccount({ ...newAccount, code: e.target.value })} placeholder="e.g. 5040" required className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Account Name *</Label>
              <Input value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} placeholder="e.g. Lab Equipment Lease" required className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Category Type</Label>
                <Select value={newAccount.type} onValueChange={v => setNewAccount({ ...newAccount, type: v as any })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asset">Asset</SelectItem>
                    <SelectItem value="Liability">Liability</SelectItem>
                    <SelectItem value="Equity">Equity</SelectItem>
                    <SelectItem value="Revenue">Revenue</SelectItem>
                    <SelectItem value="Expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Initial Balance</Label>
                <Input type="number" value={newAccount.balance} onChange={e => setNewAccount({ ...newAccount, balance: Number(e.target.value) })} className="h-8 text-xs" />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAccountModal(false)}>Cancel</Button>
              <Button type="submit" size="sm">Save Account</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Journal Modal */}
      <Dialog open={showJournalModal} onOpenChange={setShowJournalModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle className="text-base">Post Journal Entry</DialogTitle></DialogHeader>
          <form onSubmit={handleAddJournal} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Reference Number</Label>
              <Input value={newJournal.reference} onChange={e => setNewJournal({ ...newJournal, reference: e.target.value })} placeholder="e.g. INV-902" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Description *</Label>
              <Input value={newJournal.description} onChange={e => setNewJournal({ ...newJournal, description: e.target.value })} placeholder="e.g. X-Ray Machine Service Fee" required className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Debit Account *</Label>
                <Select value={newJournal.debitAccount} onValueChange={v => setNewJournal({ ...newJournal, debitAccount: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.code} value={a.code} className="text-xs">{a.code} - {a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Credit Account *</Label>
                <Select value={newJournal.creditAccount} onValueChange={v => setNewJournal({ ...newJournal, creditAccount: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.code} value={a.code} className="text-xs">{a.code} - {a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Amount ({customRates.currency}) *</Label>
              <Input type="number" value={newJournal.amount} onChange={e => setNewJournal({ ...newJournal, amount: Number(e.target.value) })} min={1} required className="h-8 text-xs" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowJournalModal(false)}>Cancel</Button>
              <Button type="submit" size="sm">Post Entry</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
