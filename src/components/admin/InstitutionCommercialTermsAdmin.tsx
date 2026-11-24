// InstitutionCommercialTermsAdmin — platform superadmin editor for
// per-institution commercial terms (CEO order 2026-11-24).
//
// Every commercial term (pilot free days, pilot per-doctor/facility
// rates, year-one discount, tier monthly rate, founding-cohort
// membership) can be overridden for ONE institution so a specific
// arrangement with a hospital is honoured in the system. Blank fields
// mean "platform default applies". Writes are super_admin-only in the
// database (RLS); every change is audit-logged server-side.
import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Save, Trash2, HandCoins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import {
  PLATFORM_COMMERCIAL_DEFAULTS,
  fetchAllCommercialTermsOverrides,
  fetchCommercialTermsOverride,
  fetchEffectiveTerms,
  upsertCommercialTermsOverride,
  clearCommercialTermsOverride,
  type CommercialTermsOverride,
} from "@/services/institutionCommercialTerms";

type FormState = {
  tierRate: string;
  pilotFreeDays: string;
  pilotDoctorRate: string;
  pilotFacilityRate: string;
  discountPct: string;
  founding: "default" | "yes" | "no";
  pilotStartedAt: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  tierRate: "",
  pilotFreeDays: "",
  pilotDoctorRate: "",
  pilotFacilityRate: "",
  discountPct: "",
  founding: "default",
  pilotStartedAt: "",
  notes: "",
};

const formFromOverride = (o: CommercialTermsOverride | null): FormState => {
  if (!o) return EMPTY_FORM;
  const s = (v: number | null) => (v === null || v === undefined ? "" : String(v));
  return {
    tierRate: s(o.tier_monthly_rate_override),
    pilotFreeDays: s(o.pilot_free_days),
    pilotDoctorRate: s(o.pilot_per_doctor_rate),
    pilotFacilityRate: s(o.pilot_facility_rate),
    discountPct: s(o.year_one_discount_pct),
    founding: o.is_founding_cohort === null ? "default" : o.is_founding_cohort ? "yes" : "no",
    pilotStartedAt: o.pilot_started_at ? o.pilot_started_at.slice(0, 10) : "",
    notes: o.notes || "",
  };
};

const parseNum = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const fmtK = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `K${Number(n).toLocaleString("en-ZM", { maximumFractionDigits: 2 })}`;

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/40";
const labelCls = "block text-xs font-semibold text-muted-foreground mb-1";

export const InstitutionCommercialTermsAdmin = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: institutions, isLoading: instLoading } = useQuery({
    queryKey: ["commercial-terms-institutions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("healthcare_institutions")
        .select("id, name, type, status")
        .order("name");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const { data: allOverrides } = useQuery({
    queryKey: ["commercial-terms-overrides"],
    queryFn: fetchAllCommercialTermsOverrides,
  });
  const overriddenIds = new Set((allOverrides || []).map((o) => o.institution_id));

  const { data: override, isLoading: ovrLoading } = useQuery({
    queryKey: ["commercial-terms-override", selectedId],
    queryFn: () => fetchCommercialTermsOverride(selectedId),
    enabled: !!selectedId,
  });

  const { data: effective, isLoading: effLoading } = useQuery({
    queryKey: ["commercial-terms-effective", selectedId],
    queryFn: () => fetchEffectiveTerms(selectedId),
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (selectedId) setForm(formFromOverride(override ?? null));
  }, [selectedId, override]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["commercial-terms-overrides"] });
    queryClient.invalidateQueries({ queryKey: ["commercial-terms-override", selectedId] });
    queryClient.invalidateQueries({ queryKey: ["commercial-terms-effective", selectedId] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await upsertCommercialTermsOverride({
        institution_id: selectedId,
        tier_monthly_rate_override: parseNum(form.tierRate),
        pilot_free_days: parseNum(form.pilotFreeDays),
        pilot_per_doctor_rate: parseNum(form.pilotDoctorRate),
        pilot_facility_rate: parseNum(form.pilotFacilityRate),
        year_one_discount_pct: parseNum(form.discountPct),
        is_founding_cohort:
          form.founding === "default" ? null : form.founding === "yes",
        pilot_started_at: form.pilotStartedAt
          ? new Date(`${form.pilotStartedAt}T00:00:00Z`).toISOString()
          : null,
        notes: form.notes.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Commercial terms saved for this institution.");
      invalidate();
    },
    onError: (e: any) =>
      toast.error(friendlyErrorMessage(e, "We couldn't save those terms. Please try again.")),
  });

  const clearMutation = useMutation({
    mutationFn: () => clearCommercialTermsOverride(selectedId),
    onSuccess: () => {
      toast.success("Overrides cleared — platform defaults now apply to this institution.");
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (e: any) =>
      toast.error(friendlyErrorMessage(e, "We couldn't clear those overrides. Please try again.")),
  });

  const d = PLATFORM_COMMERCIAL_DEFAULTS;
  const busy = saveMutation.isPending || clearMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <HandCoins className="h-4 w-4 text-primary-500" />
          Platform defaults (apply wherever an institution has no override)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Pilot free days</p><p className="font-semibold">{d.pilotFreeDays} days</p></div>
          <div><p className="text-xs text-muted-foreground">Pilot rate / doctor</p><p className="font-semibold">{fmtK(d.pilotPerDoctorRate)}/mo</p></div>
          <div><p className="text-xs text-muted-foreground">Pilot rate / facility</p><p className="font-semibold">{fmtK(d.pilotFacilityRate)}/mo</p></div>
          <div><p className="text-xs text-muted-foreground">Year-one discount</p><p className="font-semibold">up to {d.yearOneDiscountPct}%</p></div>
          <div><p className="text-xs text-muted-foreground">Founding cohort cap</p><p className="font-semibold">{d.foundingCohortCap} institutions</p></div>
          <div><p className="text-xs text-muted-foreground">Tier list prices</p><p className="font-semibold">K8,500 · K22,000 · K90,500 /mo</p></div>
        </div>
        <p className="text-xs text-muted-foreground">
          Tier list prices themselves are edited under Subscription Pricing. The terms below override them for one institution only.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div>
          <label className={labelCls} htmlFor="ct-institution">Institution</label>
          {instLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading institutions…</p>
          ) : (
            <select
              id="ct-institution"
              className={inputCls}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Select an institution…</option>
              {(institutions || []).map((i: any) => (
                <option key={i.id} value={i.id}>
                  {i.name} {overriddenIds.has(i.id) ? "• has overrides" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedId && (
          <>
            <div className="rounded-xl bg-muted/50 border border-border p-3">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Effective terms for this institution
              </h3>
              {effLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
              ) : effective ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Tier</p><p className="font-semibold">{effective.tierName || "No tier subscription yet"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tier rate</p><p className="font-semibold">{fmtK(effective.tierMonthlyRate)}/mo{effective.tierListMonthly !== null && effective.tierMonthlyRate !== effective.tierListMonthly ? ` (list ${fmtK(effective.tierListMonthly)})` : ""}</p></div>
                  <div><p className="text-xs text-muted-foreground">Year-one rate</p><p className="font-semibold">{fmtK(effective.yearOneMonthlyRate)}/mo ({effective.yearOneDiscountPct}% off)</p></div>
                  <div><p className="text-xs text-muted-foreground">Pilot</p><p className="font-semibold">{effective.pilotFreeDays} free days, then {fmtK(effective.pilotPerDoctorRate)}/doctor + {fmtK(effective.pilotFacilityRate)}/facility</p></div>
                  <div><p className="text-xs text-muted-foreground">Founding cohort</p><p className="font-semibold">{effective.isFoundingCohort ? "Yes" : "No"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Source</p><p className="font-semibold">{effective.hasOverride ? "Institution override" : "Platform defaults"}</p></div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">We couldn't load the effective terms for this institution.</p>
              )}
              {override?.updated_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Overrides last changed {new Date(override.updated_at).toLocaleString()}
                  {override.updated_by ? ` by ${override.updated_by}` : ""}. Every change is recorded in the Audit Log.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <div>
                <label className={labelCls} htmlFor="ct-tier">Tier monthly rate override (K) — blank = list price</label>
                <input id="ct-tier" className={inputCls} inputMode="decimal" value={form.tierRate} onChange={(e) => setForm({ ...form, tierRate: e.target.value })} placeholder="e.g. 18000" />
              </div>
              <div>
                <label className={labelCls} htmlFor="ct-discount">Year-one discount % — blank = {d.yearOneDiscountPct}%</label>
                <input id="ct-discount" className={inputCls} inputMode="decimal" value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: e.target.value })} placeholder="e.g. 60" />
              </div>
              <div>
                <label className={labelCls} htmlFor="ct-free">Pilot free days — blank = {d.pilotFreeDays}</label>
                <input id="ct-free" className={inputCls} inputMode="numeric" value={form.pilotFreeDays} onChange={(e) => setForm({ ...form, pilotFreeDays: e.target.value })} placeholder="e.g. 45" />
              </div>
              <div>
                <label className={labelCls} htmlFor="ct-doctor">Pilot rate per doctor (K/mo) — blank = {fmtK(d.pilotPerDoctorRate)}</label>
                <input id="ct-doctor" className={inputCls} inputMode="decimal" value={form.pilotDoctorRate} onChange={(e) => setForm({ ...form, pilotDoctorRate: e.target.value })} placeholder="e.g. 300" />
              </div>
              <div>
                <label className={labelCls} htmlFor="ct-facility">Pilot rate per facility (K/mo) — blank = {fmtK(d.pilotFacilityRate)}</label>
                <input id="ct-facility" className={inputCls} inputMode="decimal" value={form.pilotFacilityRate} onChange={(e) => setForm({ ...form, pilotFacilityRate: e.target.value })} placeholder="e.g. 2000" />
              </div>
              <div>
                <label className={labelCls} htmlFor="ct-founding">Founding Clinics cohort</label>
                <select id="ct-founding" className={inputCls} value={form.founding} onChange={(e) => setForm({ ...form, founding: e.target.value as FormState["founding"] })}>
                  <option value="default">Default (not in cohort)</option>
                  <option value="yes">Yes — founding cohort member</option>
                  <option value="no">No — explicitly not a member</option>
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="ct-start">Pilot start date</label>
                <input id="ct-start" type="date" className={inputCls} value={form.pilotStartedAt} onChange={(e) => setForm({ ...form, pilotStartedAt: e.target.value })} />
              </div>
              <div className="sm:col-span-2 xl:col-span-2">
                <label className={labelCls} htmlFor="ct-notes">Notes (the arrangement this honours)</label>
                <input id="ct-notes" className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Agreed with hospital director, 24 Nov 2026" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={busy || ovrLoading}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full bg-[#FFC439] text-[#001435] hover:brightness-95 disabled:opacity-50 transition"
              >
                {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save overrides
              </button>
              {override && (
                <button
                  onClick={() => clearMutation.mutate()}
                  disabled={busy}
                  className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 transition"
                >
                  {clearMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Clear all overrides
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InstitutionCommercialTermsAdmin;
