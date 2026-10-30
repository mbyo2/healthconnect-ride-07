/**
 * LocalisationTaxCard
 * Odoo-style localisation & tax settings for an institution.
 * Reads/writes a single row on public.country_statutory_configs
 * (UNIQUE on institution_id) — strictly institution-scoped.
 *
 * NOTE: the parallel `src/utils/taxConfig.ts` task may not have landed yet,
 * so the InstitutionTaxConfig interface + Zambia defaults are defined locally
 * here in the exact agreed shape. If that util appears later, import from it
 * and delete the local copies.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Globe, Loader2, RotateCcw, Save, Plus, Trash2, AlertCircle } from "lucide-react";
import { COUNTRY_CONFIGS, type CountryStatutoryConfig } from "@/utils/universalPayroll";
import { friendlyErrorMessage } from "@/utils/friendly-error";

// ─── Local interface (matches agreed shape; see file header) ────────────────
export interface PayeBracket {
  min: number;
  max: number | null;
  rate: number; // decimal, e.g. 0.37
}

export interface InstitutionTaxConfig {
  country_code: string;
  country_name: string;
  currency: string;
  vat_rate: number; // percent
  paye_brackets: PayeBracket[];
  napsa_employee_rate: number;
  napsa_employer_rate: number;
  napsa_ceiling: number | null;
  napsa_reduces_paye: boolean;
  nhima_employee_rate: number;
  nhima_employer_rate: number;
  nhima_reduces_paye: boolean;
  sdl_rate: number;
  sdl_annual_threshold: number;
  sdl_enabled: boolean;
  fiscal_year_start: number; // 1–12
}

export const ZAMBIA_DEFAULT_CONFIG: InstitutionTaxConfig = {
  country_code: "ZM",
  country_name: "Zambia",
  currency: "ZMW",
  vat_rate: 16,
  paye_brackets: [
    { min: 0, max: 5100, rate: 0 },
    { min: 5100, max: 7100, rate: 0.2 },
    { min: 7100, max: 9200, rate: 0.3 },
    { min: 9200, max: null, rate: 0.37 },
  ],
  napsa_employee_rate: 5,
  napsa_employer_rate: 5,
  napsa_ceiling: 29816,
  napsa_reduces_paye: true,
  nhima_employee_rate: 1,
  nhima_employer_rate: 1,
  nhima_reduces_paye: false,
  sdl_rate: 1,
  sdl_annual_threshold: 1_000_000,
  sdl_enabled: true,
  fiscal_year_start: 1,
};

// ─── Form model (strings so inputs can be empty) ─────────────────────────────
type BracketRow = { min: string; max: string; rate: string };

type TaxForm = {
  country_code: string;
  country_name: string;
  currency: string;
  currencyCustom: boolean;
  vat_rate: string;
  brackets: BracketRow[];
  pension_employee_rate: string;
  pension_employer_rate: string;
  pension_ceiling: string;
  pension_reduces_paye: boolean;
  health_employee_rate: string;
  health_employer_rate: string;
  health_reduces_paye: boolean;
  sdl_enabled: boolean;
  sdl_rate: string;
  sdl_annual_threshold: string;
  fiscal_year_start: string;
};

const COUNTRIES = [
  { code: "ZM", name: "Zambia" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "IN", name: "India" },
  { code: "OTHER", name: "Other" },
];

const CURRENCIES = ["ZMW", "USD", "ZAR", "KES", "NGN", "GHS", "GBP", "EUR", "INR"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pct = (n: number) => Math.round(n * 100 * 100) / 100; // decimal → percent

function configToForm(c: InstitutionTaxConfig): { form: TaxForm; customCurrency: string } {
  const inCurrencies = CURRENCIES.includes(c.currency);
  return {
    form: {
      country_code: c.country_code,
      country_name: c.country_name,
      currency: inCurrencies ? c.currency : "custom",
      currencyCustom: !inCurrencies,
      vat_rate: String(c.vat_rate),
      brackets: c.paye_brackets.map((b) => ({
        min: String(b.min),
        max: b.max === null ? "" : String(b.max),
        rate: String(pct(b.rate)),
      })),
      pension_employee_rate: String(c.napsa_employee_rate),
      pension_employer_rate: String(c.napsa_employer_rate),
      pension_ceiling: c.napsa_ceiling === null ? "" : String(c.napsa_ceiling),
      pension_reduces_paye: c.napsa_reduces_paye,
      health_employee_rate: String(c.nhima_employee_rate),
      health_employer_rate: String(c.nhima_employer_rate),
      health_reduces_paye: c.nhima_reduces_paye,
      sdl_enabled: c.sdl_enabled,
      sdl_rate: String(c.sdl_rate),
      sdl_annual_threshold: String(c.sdl_annual_threshold),
      fiscal_year_start: String(c.fiscal_year_start),
    },
    customCurrency: inCurrencies ? "" : c.currency,
  };
}

function presetToConfig(p: CountryStatutoryConfig): InstitutionTaxConfig {
  const bands = (p.payeBands ?? []).map((b) => ({
    min: b.from,
    max: b.to === Infinity ? null : b.to,
    rate: b.rate,
  }));
  return {
    country_code: p.countryCode,
    country_name: p.countryName,
    currency: p.currency,
    vat_rate: p.vatRate,
    paye_brackets: bands,
    napsa_employee_rate: p.pensionEmployeeRate,
    napsa_employer_rate: p.pensionEmployerRate,
    napsa_ceiling: p.pensionCeiling ?? null,
    napsa_reduces_paye: p.pensionReducesPaye,
    nhima_employee_rate: p.healthEmployeeRate,
    nhima_employer_rate: p.healthEmployerRate,
    nhima_reduces_paye: p.healthReducesPaye,
    sdl_rate: p.sdlRate ?? 0,
    sdl_annual_threshold: p.sdlAnnualThreshold ?? 0,
    sdl_enabled: p.sdlEnabled ?? false,
    fiscal_year_start: 1,
  };
}

/** Validate PAYE bracket rows: ordered, contiguous, no gaps/overlaps. */
function validateBrackets(rows: BracketRow[]): string | null {
  const parsed: { min: number; max: number | null; rate: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const min = Number(r.min);
    const rate = Number(r.rate);
    if (!Number.isFinite(min) || min < 0) return `Row ${i + 1}: minimum income must be a number ≥ 0.`;
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return `Row ${i + 1}: rate must be between 0 and 100%.`;
    const max = r.max.trim() === "" ? null : Number(r.max);
    if (max !== null && (!Number.isFinite(max) || max <= min)) return `Row ${i + 1}: maximum must be greater than minimum (or left empty for no limit).`;
    parsed.push({ min, max, rate });
  }
  if (parsed.some((p) => p.max === null) && parsed[parsed.length - 1].max !== null)
    return "Only the last row may have an empty maximum (no upper limit).";
  for (let i = 1; i < parsed.length; i++) {
    const prev = parsed[i - 1];
    const cur = parsed[i];
    if (prev.max === null) return `Row ${i}: previous row has no upper limit, so this row is unreachable.`;
    if (cur.min !== prev.max) return `Row ${i + 1}: minimum (${cur.min}) must equal the previous row's maximum (${prev.max}) — no gaps or overlaps.`;
  }
  return null;
}

export default function LocalisationTaxCard({ institutionId }: { institutionId: string }) {
  const [form, setForm] = useState<TaxForm>(() => configToForm(ZAMBIA_DEFAULT_CONFIG).form);
  const [customCurrency, setCustomCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bracketError, setBracketError] = useState<string | null>(null);
  const [pendingPreset, setPendingPreset] = useState<CountryStatutoryConfig | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const set = <K extends keyof TaxForm>(key: K, value: TaxForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── Load: institution's row, or Zambia defaults when none exists ──────────
  useEffect(() => {
    if (!institutionId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("country_statutory_configs")
        .select("*")
        .eq("institution_id", institutionId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("Localisation load failed:", error);
        toast.error("Could not load localisation settings.", { description: friendlyErrorMessage(error) });
        setLoading(false);
        return;
      }
      if (data) {
        const row = data as any;
        // Prefer the flexible JSONB brackets; fall back to legacy rigid bands.
        let brackets: PayeBracket[];
        if (Array.isArray(row.paye_brackets) && row.paye_brackets.length > 0) {
          brackets = row.paye_brackets.map((b: any) => ({
            min: Number(b.min ?? 0),
            max: b.max === null || b.max === undefined ? null : Number(b.max),
            rate: Number(b.rate ?? 0),
          }));
        } else {
          brackets = [
            { min: 0, max: Number(row.paye_band_1_limit ?? 5100), rate: Number(row.paye_band_1_rate ?? 0) / 100 },
            { min: Number(row.paye_band_1_limit ?? 5100), max: Number(row.paye_band_2_limit ?? 7100), rate: Number(row.paye_band_2_rate ?? 20) / 100 },
            { min: Number(row.paye_band_2_limit ?? 7100), max: Number(row.paye_band_3_limit ?? 9200), rate: Number(row.paye_band_3_rate ?? 30) / 100 },
            { min: Number(row.paye_band_3_limit ?? 9200), max: null, rate: Number(row.paye_tax_rate ?? 37) / 100 },
          ];
        }
        const hydrated = configToForm({
          country_code: row.country_code ?? "ZM",
          country_name: row.country_name ?? "Zambia",
          currency: row.currency ?? "ZMW",
          vat_rate: Number(row.vat_rate ?? 16),
          paye_brackets: brackets,
          napsa_employee_rate: Number(row.napsa_employee_rate ?? 5),
          napsa_employer_rate: Number(row.napsa_employer_rate ?? 5),
          napsa_ceiling: row.napsa_ceiling === null || row.napsa_ceiling === undefined ? null : Number(row.napsa_ceiling),
          napsa_reduces_paye: row.napsa_reduces_paye ?? true,
          nhima_employee_rate: Number(row.nhima_employee_rate ?? 1),
          nhima_employer_rate: Number(row.nhima_employer_rate ?? 1),
          nhima_reduces_paye: row.nhima_reduces_paye ?? false,
          sdl_rate: Number(row.sdl_rate ?? 0),
          sdl_annual_threshold: Number(row.sdl_annual_threshold ?? 0),
          sdl_enabled: row.sdl_enabled ?? false,
          fiscal_year_start: Number(row.fiscal_year_start ?? 1),
        });
        setForm(hydrated.form);
        setCustomCurrency(hydrated.customCurrency);
      }
      // No row → keep Zambia defaults already in state.
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [institutionId]);

  // Re-validate brackets on every edit
  useEffect(() => {
    setBracketError(validateBrackets(form.brackets));
  }, [form.brackets]);

  // ── Country change → offer preset ─────────────────────────────────────────
  const handleCountryChange = (code: string) => {
    const country = COUNTRIES.find((c) => c.code === code);
    set("country_code", code);
    set("country_name", country?.name ?? code);
    set("currencyCustom", false);
    const preset = COUNTRY_CONFIGS[code];
    if (preset) {
      // Offer to load the preset — don't clobber silently.
      setPendingPreset(preset);
    } else {
      setPendingPreset(null);
    }
  };

  const applyPreset = (p: CountryStatutoryConfig) => {
    setForm(configToForm(presetToConfig(p)).form);
    setCustomCurrency("");
    setPendingPreset(null);
    toast.success(`${p.countryName} preset loaded.`, {
      description: "Review the rates below, then save.",
    });
  };

  // ── Bracket row helpers ───────────────────────────────────────────────────
  const updateBracket = (i: number, field: keyof BracketRow, value: string) =>
    set("brackets", form.brackets.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const addBracket = () => {
    const last = form.brackets[form.brackets.length - 1];
    const lastMin = Number(last?.min ?? 0);
    const lastMax = last?.max.trim() ? Number(last.max) : lastMin;
    // Close the previous row at its max (or its min if open) and start there.
    const rows = form.brackets.map((r, idx) =>
      idx === form.brackets.length - 1 && r.max.trim() === ""
        ? { ...r, max: String(lastMax) }
        : r
    );
    set("brackets", [...rows, { min: String(lastMax), max: "", rate: "30" }]);
  };

  const removeBracket = (i: number) => {
    if (form.brackets.length <= 1) return;
    set("brackets", form.brackets.filter((_, idx) => idx !== i));
  };

  // ── Reset to Zambia defaults (two-step destructive confirm) ───────────────
  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 5000);
      return;
    }
    setForm(configToForm(ZAMBIA_DEFAULT_CONFIG).form);
    setCustomCurrency("");
    setPendingPreset(null);
    setConfirmReset(false);
    toast.success("Reset to Zambia defaults.", {
      description: "Not saved yet — press Save to apply.",
    });
  };

  // ── Save (upsert, institution-scoped) ─────────────────────────────────────
  const handleSave = async () => {
    const err = validateBrackets(form.brackets);
    setBracketError(err);
    if (err) { toast.error("Fix the PAYE brackets first."); return; }
    const fy = Number(form.fiscal_year_start);
    if (!Number.isInteger(fy) || fy < 1 || fy > 12) {
      toast.error("Fiscal year start must be a month from January to December.");
      return;
    }
    const brackets: PayeBracket[] = form.brackets.map((r) => ({
      min: Number(r.min),
      max: r.max.trim() === "" ? null : Number(r.max),
      rate: Number(r.rate) / 100,
    }));
    const topRate = pct(brackets[brackets.length - 1].rate);
    const currency = form.currencyCustom ? (customCurrency.trim() || "ZMW") : form.currency;

    const payload = {
      institution_id: institutionId,
      country_code: form.country_code,
      country_name: form.country_name,
      currency,
      vat_rate: Number(form.vat_rate) || 0,
      paye_brackets: brackets,
      // Keep the legacy rigid band columns in sync for older consumers.
      paye_band_1_limit: brackets[0]?.max ?? null,
      paye_band_1_rate: brackets[0] ? pct(brackets[0].rate) : 0,
      paye_band_2_limit: brackets[1]?.max ?? null,
      paye_band_2_rate: brackets[1] ? pct(brackets[1].rate) : 0,
      paye_band_3_limit: brackets[2]?.max ?? null,
      paye_band_3_rate: brackets[2] ? pct(brackets[2].rate) : 0,
      paye_tax_rate: topRate,
      napsa_employee_rate: Number(form.pension_employee_rate) || 0,
      napsa_employer_rate: Number(form.pension_employer_rate) || 0,
      napsa_ceiling: form.pension_ceiling.trim() === "" ? null : Number(form.pension_ceiling),
      napsa_reduces_paye: form.pension_reduces_paye,
      nhima_employee_rate: Number(form.health_employee_rate) || 0,
      nhima_employer_rate: Number(form.health_employer_rate) || 0,
      nhima_reduces_paye: form.health_reduces_paye,
      sdl_enabled: form.sdl_enabled,
      sdl_rate: Number(form.sdl_rate) || 0,
      sdl_annual_threshold: Number(form.sdl_annual_threshold) || 0,
      fiscal_year_start: fy,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    try {
      const { error } = await supabase
        .from("country_statutory_configs")
        .upsert(payload, { onConflict: "institution_id" });
      if (error) throw error;
      toast.success("Localisation settings saved.");
    } catch (e: any) {
      console.error("Localisation save failed:", e);
      toast.error("Could not save localisation settings.", { description: friendlyErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const numInput = (id: string, value: string, onChange: (v: string) => void, placeholder?: string, step = "0.01") => (
    <Input
      id={id}
      type="number"
      min="0"
      step={step}
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11"
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Localisation &amp; Tax Settings
        </CardTitle>
        <CardDescription>
          Statutory rates used by payroll, billing and reporting for this institution. Changes apply to this institution only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span className="text-sm">Loading localisation settings…</span>
          </div>
        ) : (
          <>
            {/* ── Country / currency / VAT / fiscal year ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loc-country">Country</Label>
                <Select value={form.country_code} onValueChange={handleCountryChange}>
                  <SelectTrigger id="loc-country" className="h-11">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-currency">Currency</Label>
                <Select
                  value={form.currencyCustom ? "custom" : form.currency}
                  onValueChange={(v) => {
                    if (v === "custom") set("currencyCustom", true);
                    else { set("currencyCustom", false); set("currency", v); }
                  }}
                >
                  <SelectTrigger id="loc-currency" className="h-11">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value="custom">Custom…</SelectItem>
                  </SelectContent>
                </Select>
                {form.currencyCustom && (
                  <Input
                    id="loc-currency-custom"
                    value={customCurrency}
                    onChange={(e) => setCustomCurrency(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="e.g. ZMW"
                    maxLength={6}
                    className="h-11 mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-vat">VAT / sales tax rate (%)</Label>
                {numInput("loc-vat", form.vat_rate, (v) => set("vat_rate", v), "e.g. 16")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-fy">Fiscal year starts in</Label>
                <Select value={form.fiscal_year_start} onValueChange={(v) => set("fiscal_year_start", v)}>
                  <SelectTrigger id="loc-fy" className="h-11">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Country preset offer ── */}
            {pendingPreset && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 p-4">
                <p className="text-sm">
                  Load the <strong>{pendingPreset.countryName}</strong> statutory preset? It will replace the rates below (not saved until you press Save).
                </p>
                <div className="flex gap-2 shrink-0">
                  <Button type="button" size="sm" className="h-11" onClick={() => applyPreset(pendingPreset)}>
                    Load preset
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-11" onClick={() => setPendingPreset(null)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {/* ── PAYE brackets ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Income tax (PAYE) brackets</Label>
                <Button type="button" variant="outline" size="sm" className="h-11" onClick={addBracket}>
                  <Plus className="mr-1 h-4 w-4" /> Add bracket
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Rows must be ordered and continuous — each row starts where the previous one ends. Leave the last row&rsquo;s maximum empty for no upper limit.
              </p>
              <div className="space-y-2">
                {form.brackets.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <Label htmlFor={`bracket-min-${i}`} className="text-xs text-muted-foreground">From</Label>
                      <Input
                        id={`bracket-min-${i}`}
                        type="number" min="0" step="0.01" inputMode="decimal"
                        value={row.min}
                        onChange={(e) => updateBracket(i, "min", e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`bracket-max-${i}`} className="text-xs text-muted-foreground">To (empty = ∞)</Label>
                      <Input
                        id={`bracket-max-${i}`}
                        type="number" min="0" step="0.01" inputMode="decimal"
                        value={row.max}
                        onChange={(e) => updateBracket(i, "max", e.target.value)}
                        placeholder="No limit"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`bracket-rate-${i}`} className="text-xs text-muted-foreground">Rate %</Label>
                      <Input
                        id={`bracket-rate-${i}`}
                        type="number" min="0" max="100" step="0.01" inputMode="decimal"
                        value={row.rate}
                        onChange={(e) => updateBracket(i, "rate", e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-11 w-11 text-muted-foreground hover:text-destructive"
                      onClick={() => removeBracket(i)}
                      disabled={form.brackets.length <= 1}
                      aria-label={`Remove bracket row ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              {bracketError && (
                <p className="flex items-start gap-2 text-sm text-destructive" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {bracketError}
                </p>
              )}
            </div>

            {/* ── Pension / health schemes ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 rounded-xl border p-4">
                <p className="font-semibold">Pension scheme</p>
                <p className="text-xs text-muted-foreground">Statutory pension / social security (e.g. NAPSA in Zambia).</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="loc-pens-emp">Employee %</Label>
                    {numInput("loc-pens-emp", form.pension_employee_rate, (v) => set("pension_employee_rate", v), "e.g. 5")}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loc-pens-empr">Employer %</Label>
                    {numInput("loc-pens-empr", form.pension_employer_rate, (v) => set("pension_employer_rate", v), "e.g. 5")}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loc-pens-ceil">Ceiling (empty = no ceiling)</Label>
                  {numInput("loc-pens-ceil", form.pension_ceiling, (v) => set("pension_ceiling", v), "e.g. 29816")}
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <Label htmlFor="loc-pens-reduces" className="text-sm font-normal">Reduces taxable income</Label>
                  <Switch
                    id="loc-pens-reduces"
                    checked={form.pension_reduces_paye}
                    onCheckedChange={(v) => set("pension_reduces_paye", v)}
                  />
                </div>
              </div>
              <div className="space-y-3 rounded-xl border p-4">
                <p className="font-semibold">Health scheme</p>
                <p className="text-xs text-muted-foreground">Statutory health insurance (e.g. NHIMA in Zambia).</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="loc-health-emp">Employee %</Label>
                    {numInput("loc-health-emp", form.health_employee_rate, (v) => set("health_employee_rate", v), "e.g. 1")}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loc-health-empr">Employer %</Label>
                    {numInput("loc-health-empr", form.health_employer_rate, (v) => set("health_employer_rate", v), "e.g. 1")}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <Label htmlFor="loc-health-reduces" className="text-sm font-normal">Reduces taxable income</Label>
                  <Switch
                    id="loc-health-reduces"
                    checked={form.health_reduces_paye}
                    onCheckedChange={(v) => set("health_reduces_paye", v)}
                  />
                </div>
              </div>
            </div>

            {/* ── Skills development levy ── */}
            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Skills development levy</p>
                  <p className="text-xs text-muted-foreground">Employer levy on annual payroll (e.g. SDL in Zambia).</p>
                </div>
                <Switch
                  id="loc-sdl-enabled"
                  checked={form.sdl_enabled}
                  onCheckedChange={(v) => set("sdl_enabled", v)}
                />
              </div>
              {form.sdl_enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="loc-sdl-rate">Levy rate (%)</Label>
                    {numInput("loc-sdl-rate", form.sdl_rate, (v) => set("sdl_rate", v), "e.g. 1")}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loc-sdl-threshold">Annual payroll threshold</Label>
                    {numInput("loc-sdl-threshold", form.sdl_annual_threshold, (v) => set("sdl_annual_threshold", v), "e.g. 1000000")}
                  </div>
                </div>
              )}
            </div>

            {/* ── Actions ── */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="button" onClick={handleSave} disabled={saving || !!bracketError} className="h-11 flex-1 sm:flex-none sm:min-w-44">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save localisation
              </Button>
              <Button
                type="button"
                variant={confirmReset ? "destructive" : "outline"}
                onClick={handleReset}
                className="h-11"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {confirmReset ? "Click again to confirm reset" : "Reset to Zambia defaults"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
