import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getFacilityArchetype,
  archetypeToCharter,
  type FacilityArchetype,
} from "@/config/facilityProfiles";
import type { SubscriptionGateState } from "@/services/subscriptionStatus";

export type CharterModule = {
  module_key: string;
  module_name: string;
  description: string | null;
  status: string; // charter status: 'live' | 'planned'
  display_order?: number | null;
};

export type EffectiveModule = CharterModule & {
  /** Effective state after admin overrides: 'live' | 'planned' | 'disabled'. */
  effective: "live" | "planned" | "disabled";
  /** Where the effective state came from. */
  source: "charter" | "admin_grant" | "admin_revoke" | "subscription_expired";
  granted_by?: string | null;
  granted_at?: string | null;
  note?: string | null;
};

export type EntitlementRow = {
  institution_id: string;
  module_key: string;
  module_name: string;
  is_enabled: boolean;
  granted_by: string | null;
  granted_at: string | null;
  note: string | null;
};

/**
 * Resolve the facility tier for an institution from its type_code.
 * type_code is the lowercased signup label; institution_types.name keeps
 * display casing, so the match must be case-insensitive.
 */
export async function resolveInstitutionTier(
  supabase: SupabaseClient,
  typeCode: string | null | undefined
): Promise<{ tier: string | null; label: string | null }> {
  const code = (typeCode || "").trim();
  if (!code) return { tier: null, label: null };
  try {
    const { data } = await supabase
      .from("institution_types")
      .select("name, tier, description")
      .ilike("name", code);
    if (!data || data.length === 0) return { tier: null, label: null };
    // Duplicate display names exist (e.g. Children's Hospital ×2 tiers):
    // prefer the tier with the richest module charter.
    let best: any = data[0];
    if (data.length > 1) {
      const { data: counts } = await supabase
        .from("facility_module_charter")
        .select("tier");
      const perTier: Record<string, number> = {};
      (counts || []).forEach((r: any) => {
        perTier[r.tier] = (perTier[r.tier] || 0) + 1;
      });
      best = [...data].sort(
        (a: any, b: any) => (perTier[b.tier] || 0) - (perTier[a.tier] || 0)
      )[0];
    }
    return { tier: best.tier as string, label: (best.description || best.name) as string };
  } catch {
    return { tier: null, label: null };
  }
}

/** Charter modules for a tier (the default module set). */
export async function getTierCharter(
  supabase: SupabaseClient,
  tier: string
): Promise<CharterModule[]> {
  const { data, error } = await supabase
    .from("facility_module_charter")
    .select("module_key, module_name, description, status, display_order")
    .eq("tier", tier)
    .order("display_order");
  if (error) throw error;
  return (data || []) as CharterModule[];
}

/** Admin overrides for one institution. */
export async function getEntitlements(
  supabase: SupabaseClient,
  institutionId: string
): Promise<EntitlementRow[]> {
  const { data, error } = await supabase
    .from("institution_module_entitlements")
    .select("institution_id, module_key, module_name, is_enabled, granted_by, granted_at, note")
    .eq("institution_id", institutionId);
  if (error) throw error;
  return (data || []) as EntitlementRow[];
}

/**
 * Effective modules = tier charter overlaid with admin entitlements.
 * A grant (is_enabled=true) turns even a "planned" module live;
 * a revoke (is_enabled=false) suspends even a "live" module.
 * Grants for module_keys outside the tier charter are appended as live.
 */
export function mergeEffectiveModules(
  charter: CharterModule[],
  entitlements: EntitlementRow[]
): EffectiveModule[] {
  const byKey = new Map<string, EntitlementRow>();
  entitlements.forEach((e) => byKey.set(e.module_key, e));

  const merged: EffectiveModule[] = charter.map((m) => {
    const e = byKey.get(m.module_key);
    if (!e) return { ...m, effective: m.status === "live" ? "live" : "planned", source: "charter" as const };
    return {
      ...m,
      module_name: e.module_name || m.module_name,
      effective: e.is_enabled ? "live" : "disabled",
      source: e.is_enabled ? ("admin_grant" as const) : ("admin_revoke" as const),
      granted_by: e.granted_by,
      granted_at: e.granted_at,
      note: e.note,
    };
  });

  // Off-charter grants (e.g. ICU for a clinic that requested it).
  const charterKeys = new Set(charter.map((m) => m.module_key));
  entitlements
    .filter((e) => !charterKeys.has(e.module_key) && e.is_enabled)
    .forEach((e) => {
      merged.push({
        module_key: e.module_key,
        module_name: e.module_name || e.module_key,
        description: null,
        status: "planned",
        effective: "live",
        source: "admin_grant",
        granted_by: e.granted_by,
        granted_at: e.granted_at,
        note: e.note,
      });
    });

  return merged;
}

/**
 * A module is a PAID add-on only when the superadmin price list sells
 * it: billable AND priced above zero. NULL price, billable=false, or
 * K0 all mean "included / not sold" (see the pricing migration), so
 * those modules are core access and are never subscription-gated.
 */
export function isPaidModulePrice(price: ModulePrice | undefined | null): boolean {
  return !!price && price.is_billable && price.price_monthly != null && Number(price.price_monthly) > 0;
}

/**
 * Subscription-expiry gate, applied at the entitlement-resolution
 * layer: when the institution's paid subscription is effectively
 * expired / past due (see subscriptionStatus.ts), PAID add-on modules
 * that are currently live are suspended (effective -> "disabled",
 * source -> "subscription_expired"). Everything else — charter/core
 * modules, free add-ons, already-planned/disabled modules — is
 * returned untouched, and a non-blocking gate returns the list as-is.
 * Pure and reversible: renewing the subscription restores access on
 * the next resolution, with no entitlement rows written or removed.
 */
export function applySubscriptionGate(
  modules: EffectiveModule[],
  priceMap: Record<string, ModulePrice>,
  gate: SubscriptionGateState | null | undefined
): EffectiveModule[] {
  if (!gate?.blocksPaidModules) return modules;
  return modules.map((m) =>
    m.effective === "live" && isPaidModulePrice(priceMap[m.module_key])
      ? { ...m, effective: "disabled" as const, source: "subscription_expired" as const }
      : m
  );
}

/** One call: tier + charter + entitlements → effective module list. */
export async function getEffectiveInstitutionModules(
  supabase: SupabaseClient,
  institutionId: string,
  typeCode: string | null | undefined,
  options?: {
    /**
     * When supplied, the subscription-expiry gate is applied to the
     * resolved modules (paid add-ons suspended for a lapsed paid
     * subscription). Callers must also supply modulePrices (or let
     * this function load them) so "paid" can be determined. Admin
     * surfaces should omit this — they manage the raw entitlements.
     */
    subscriptionGate?: SubscriptionGateState | null;
    modulePrices?: Record<string, ModulePrice>;
  }
): Promise<{ tier: string | null; label: string | null; modules: EffectiveModule[]; source: "archetype" | "tier" }> {
  // Primary: archetype-based charter from facilityProfiles.ts (single source
  // of truth shared with the frontend tab de-emphasis). Falls back to the
  // DB tier charter only if the archetype cannot be resolved.
  const archetype: FacilityArchetype = getFacilityArchetype(typeCode);
  const entitlements = await getEntitlements(supabase, institutionId);

  // Subscription-expiry gate (opt-in): suspend paid add-ons when the
  // institution's paid subscription has lapsed. Price lookup failures
  // fail open — no price information means nothing is treated as paid.
  const gateModules = async (modules: EffectiveModule[]): Promise<EffectiveModule[]> => {
    if (!options?.subscriptionGate?.blocksPaidModules) return modules;
    const priceMap =
      options.modulePrices ??
      (await getModulePriceMap(supabase).catch(() => ({} as Record<string, ModulePrice>)));
    return applySubscriptionGate(modules, priceMap, options.subscriptionGate);
  };

  if (archetype) {
    const archetypeCharter = archetypeToCharter(typeCode);
    // Convert to CharterModule[] shape for mergeEffectiveModules
    const charter: CharterModule[] = archetypeCharter.map((m) => ({
      module_key: m.module_key,
      module_name: m.module_name,
      description: m.description,
      status: m.status,
      display_order: m.display_order,
    }));
    const { label } = await resolveInstitutionTier(supabase, typeCode).catch(() => ({ label: null }));
    return {
      tier: archetype,
      label: label || archetype,
      modules: await gateModules(mergeEffectiveModules(charter, entitlements)),
      source: "archetype",
    };
  }

  // Fallback: legacy DB tier charter
  const { tier, label } = await resolveInstitutionTier(supabase, typeCode);
  if (!tier) return { tier: null, label, modules: [], source: "tier" };
  const charter = await getTierCharter(supabase, tier);
  return { tier, label, modules: await gateModules(mergeEffectiveModules(charter, entitlements)), source: "tier" };
}

/**
 * Grant or revoke a module for an institution (admin / superadmin only —
 * enforced by RLS on institution_module_entitlements).
 */
export async function setInstitutionModuleEnabled(
  supabase: SupabaseClient,
  institutionId: string,
  moduleKey: string,
  moduleName: string,
  enabled: boolean,
  grantedBy: string,
  note?: string | null
): Promise<void> {
  const { error } = await supabase
    .from("institution_module_entitlements")
    .upsert(
      {
        institution_id: institutionId,
        module_key: moduleKey,
        module_name: moduleName,
        is_enabled: enabled,
        granted_by: grantedBy,
        granted_at: new Date().toISOString(),
        note: note || null,
      },
      { onConflict: "institution_id,module_key" }
    );
  if (error) throw error;
}

/** Remove an override, restoring the pure charter default. */
export async function clearInstitutionModuleOverride(
  supabase: SupabaseClient,
  institutionId: string,
  moduleKey: string
): Promise<void> {
  const { error } = await supabase
    .from("institution_module_entitlements")
    .delete()
    .eq("institution_id", institutionId)
    .eq("module_key", moduleKey);
  if (error) throw error;
}

/** Full module catalog across all tiers (for granting off-plan modules). */
export async function getAllCharterModules(
  supabase: SupabaseClient
): Promise<CharterModule[]> {
  const { data, error } = await supabase
    .from("facility_module_charter")
    .select("module_key, module_name, description, status, display_order")
    .order("module_key");
  if (error) throw error;
  const seen = new Map<string, CharterModule>();
  (data || []).forEach((m: any) => {
    if (!seen.has(m.module_key)) seen.set(m.module_key, m);
  });
  return [...seen.values()];
}

// ── Paid add-on pricing (superadmin-set) ─────────────────────────────

export type ModulePrice = {
  module_key: string;
  module_name: string;
  price_monthly: number | null;
  currency: string;
  is_billable: boolean;
  updated_at?: string | null;
};

/** All module prices (superadmin price list). */
export async function getAllModulePrices(supabase: SupabaseClient): Promise<ModulePrice[]> {
  const { data, error } = await supabase
    .from("institution_module_pricing")
    .select("module_key, module_name, price_monthly, currency, is_billable, updated_at")
    .order("module_name");
  if (error) throw error;
  return (data || []) as ModulePrice[];
}

/** Prices keyed by module_key for quick lookup. */
export async function getModulePriceMap(
  supabase: SupabaseClient
): Promise<Record<string, ModulePrice>> {
  const rows = await getAllModulePrices(supabase);
  const map: Record<string, ModulePrice> = {};
  rows.forEach((r) => { map[r.module_key] = r; });
  return map;
}

/** Set (or update) a module's add-on price — superadmin only (RLS-enforced). */
export async function setModulePrice(
  supabase: SupabaseClient,
  moduleKey: string,
  moduleName: string,
  priceMonthly: number | null,
  isBillable: boolean,
  updatedBy: string,
  currency: string = "ZMW"
): Promise<void> {
  const { error } = await supabase
    .from("institution_module_pricing")
    .upsert(
      {
        module_key: moduleKey,
        module_name: moduleName,
        price_monthly: priceMonthly,
        currency,
        is_billable: isBillable,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "module_key" }
    );
  if (error) throw error;
}

export function formatModulePrice(p: ModulePrice | undefined): string | null {
  if (!p || !p.is_billable || p.price_monthly == null) return null;
  const n = Number(p.price_monthly);
  if (n === 0) return "Free";
  const formatted = n % 1 === 0 ? n.toLocaleString("en-ZM") : n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `K${formatted}/mo`;
}
