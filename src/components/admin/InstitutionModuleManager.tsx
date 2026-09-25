import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, CheckCircle2, Hourglass, Ban, RotateCcw, Plus, Search, Loader2, Sparkles } from "lucide-react";
import {
  getEffectiveInstitutionModules,
  getAllCharterModules,
  getModulePriceMap,
  formatModulePrice,
  setInstitutionModuleEnabled,
  clearInstitutionModuleOverride,
  type EffectiveModule,
  type CharterModule,
  type ModulePrice,
} from "@/services/institutionModules";

type Institution = { id: string; name: string; type_code: string | null; city: string | null };

/**
 * Institution Module Manager — admin / superadmin surface for the modular HMS.
 * When a hospital manager requests a module, the admin finds the institution
 * here and flips the module on. No code change, no redeploy: the institution
 * dashboard picks the entitlement up on next load.
 */
export const InstitutionModuleManager = () => {
  const [query, setQuery] = useState("");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [tier, setTier] = useState<string | null>(null);
  const [tierLabel, setTierLabel] = useState<string | null>(null);
  const [modules, setModules] = useState<EffectiveModule[]>([]);
  const [catalog, setCatalog] = useState<CharterModule[]>([]);
  const [prices, setPrices] = useState<Record<string, ModulePrice>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [grantKey, setGrantKey] = useState("");

  // Institution search (debounced lightly by only querying on 2+ chars).
  useEffect(() => {
    if (query.trim().length < 2) { setInstitutions([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("healthcare_institutions")
          .select("id, name, type_code, city")
          .ilike("name", `%${query.trim()}%`)
          .order("name")
          .limit(15);
        if (!cancelled) setInstitutions(error ? [] : (data as Institution[]));
      } catch { if (!cancelled) setInstitutions([]); }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const selected = useMemo(
    () => institutions.find((i) => i.id === selectedId) || null,
    [institutions, selectedId]
  );

  const loadModules = async (instId: string, typeCode: string | null) => {
    setLoading(true);
    try {
      const [eff, all, priceMap] = await Promise.all([
        getEffectiveInstitutionModules(supabase as any, instId, typeCode),
        getAllCharterModules(supabase as any),
        getModulePriceMap(supabase as any).catch(() => ({} as Record<string, ModulePrice>)),
      ]);
      setTier(eff.tier);
      setTierLabel(eff.label);
      setModules(eff.modules);
      setCatalog(all);
      setPrices(priceMap);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load modules");
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  const pickInstitution = (inst: Institution) => {
    setSelectedId(inst.id);
    setQuery(inst.name);
    setInstitutions([inst]);
    loadModules(inst.id, inst.type_code);
  };

  const toggleModule = async (m: EffectiveModule) => {
    const enable = m.effective !== "live";
    const priceLabel = formatModulePrice(prices[m.module_key]);
    setSaving(m.module_key);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await setInstitutionModuleEnabled(
        supabase as any,
        selectedId,
        m.module_key,
        m.module_name,
        enable,
        user?.id || "",
        enable
          ? `Enabled by platform admin${priceLabel ? ` @ ${priceLabel}` : ""}${tier ? ` (tier default: ${m.status})` : ""}`
          : "Suspended by platform admin"
      );
      toast.success(enable ? `“${m.module_name}” enabled for ${selected?.name}${priceLabel ? ` (${priceLabel})` : ""}` : `“${m.module_name}” suspended for ${selected?.name}`);
      await loadModules(selectedId, selected?.type_code || null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update module");
    } finally {
      setSaving(null);
    }
  };

  const resetModule = async (m: EffectiveModule) => {
    setSaving(m.module_key);
    try {
      await clearInstitutionModuleOverride(supabase as any, selectedId, m.module_key);
      toast.success(`“${m.module_name}” reset to tier default`);
      await loadModules(selectedId, selected?.type_code || null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to reset module");
    } finally {
      setSaving(null);
    }
  };

  const grantOffPlan = async () => {
    if (!grantKey) return;
    const meta = catalog.find((c) => c.module_key === grantKey);
    setSaving(grantKey);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await setInstitutionModuleEnabled(
        supabase as any, selectedId, grantKey, meta?.module_name || grantKey,
        true, user?.id || "", "Off-plan module granted by platform admin"
      );
      toast.success(`“${meta?.module_name || grantKey}” granted to ${selected?.name}`);
      setGrantKey("");
      await loadModules(selectedId, selected?.type_code || null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to grant module");
    } finally {
      setSaving(null);
    }
  };

  const liveCount = modules.filter((m) => m.effective === "live").length;
  const offPlanOptions = catalog.filter(
    (c) => !modules.some((m) => m.module_key === c.module_key)
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-extrabold text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary-500" /> Institution Module Manager
        </h2>
        <p className="text-xs text-graphite-500 mt-1">
          Flip modules on or off per institution — e.g. when a hospital manager requests ICU, theatre,
          or insurance claims. Changes apply on the institution's next dashboard load. No code, no redeploy.
        </p>
      </div>

      {/* Institution picker */}
      <div className="relative max-w-xl">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-graphite-400" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedId(""); }}
          placeholder="Search institution by name…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-canvas-silk text-sm font-medium focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
        {institutions.length > 0 && !selectedId && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-canvas-silk bg-white shadow-lg overflow-hidden">
            {institutions.map((i) => (
              <button
                key={i.id}
                onClick={() => pickInstitution(i)}
                className="w-full text-left px-4 py-2.5 hover:bg-primary-100 text-sm flex items-center gap-2"
              >
                <Building2 className="h-4 w-4 text-graphite-400 shrink-0" />
                <span className="font-bold truncate">{i.name}</span>
                {i.city && <span className="text-xs text-graphite-400 ml-auto shrink-0">{i.city}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedId && (
        <div className="rounded-2xl border border-canvas-silk bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="font-extrabold text-sm">{selected?.name}</h3>
            <span className="text-[11px] font-bold text-graphite-500">
              Tier: <span className="text-midnight">{tier || "unknown"}</span>
              {tierLabel && <span className="text-graphite-400"> · {tierLabel}</span>}
              {" · "}{liveCount} live
            </span>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
          ) : !tier ? (
            <p className="text-sm text-warning-600 py-4">
              Could not resolve this institution's facility tier (type_code “{selected?.type_code || "—"}” has no
              institution_types match). Fix the type_code before managing modules.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3">
                {modules.map((m) => {
                  const isLive = m.effective === "live";
                  const isPlanned = m.effective === "planned";
                  const priceLabel = formatModulePrice(prices[m.module_key]);
                  return (
                    <div
                      key={m.module_key}
                      className={`rounded-xl border p-3 flex items-start gap-2.5 ${
                        isLive ? "border-success-200 bg-success-50/40" : isPlanned ? "border-canvas-silk bg-canvas-mist/40" : "border-error-200 bg-error-50/40"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isLive ? <CheckCircle2 className="h-4 w-4 text-success-500" />
                        : isPlanned ? <Hourglass className="h-4 w-4 text-graphite-400" />
                        : <Ban className="h-4 w-4 text-error-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold truncate" title={m.module_name}>{m.module_name}</p>
                        <p className="text-[10px] text-graphite-500">
                          {m.source === "charter" ? (isLive ? "Tier default" : "Tier default · planned")
                          : m.source === "admin_grant" ? "Added by admin" : "Suspended by admin"}
                          {priceLabel && <span className="ml-1 font-extrabold text-primary-600">{priceLabel}</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => toggleModule(m)}
                            disabled={saving === m.module_key}
                            className={`text-[11px] font-extrabold px-3 py-1 rounded-full transition-colors ${
                              isLive ? "bg-error-100 text-error-600 hover:bg-error-200" : "bg-success-100 text-success-700 hover:bg-success-200"
                            }`}
                          >
                            {saving === m.module_key ? "…" : isLive ? "Suspend" : "Enable"}
                          </button>
                          {m.source !== "charter" && (
                            <button
                              onClick={() => resetModule(m)}
                              disabled={saving === m.module_key}
                              title="Remove override — back to tier default"
                              className="text-[11px] font-bold text-graphite-500 hover:text-midnight flex items-center gap-1"
                            >
                              <RotateCcw className="h-3 w-3" /> Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grant an off-plan module */}
              <div className="mt-4 pt-4 border-t border-canvas-silk">
                <p className="text-xs font-extrabold mb-2 flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Grant a module outside this tier</p>
                <div className="flex gap-2 max-w-xl">
                  <select
                    value={grantKey}
                    onChange={(e) => setGrantKey(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-canvas-silk text-sm font-medium"
                  >
                    <option value="">Choose module…</option>
                    {offPlanOptions.map((c) => (
                      <option key={c.module_key} value={c.module_key}>{c.module_name} ({c.module_key})</option>
                    ))}
                  </select>
                  <button
                    onClick={grantOffPlan}
                    disabled={!grantKey || !!saving}
                    className="vf-btn-primary text-sm px-4"
                  >
                    {saving ? "…" : "Grant"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
