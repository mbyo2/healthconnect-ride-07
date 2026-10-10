import { useMemo } from "react";
import type { EffectiveModule } from "@/services/institutionModules";
import {
  TAB_MODULE_MAP,
  isTabAccessible,
  getTabRule,
  type InstitutionTabKey,
} from "@/config/moduleTabMapping";

/**
 * useModuleAccess — dashboard tab entitlement enforcement.
 *
 * Takes the institution's effective modules (from getEffectiveInstitutionModules)
 * and exposes:
 *   - canAccess(tabKey): whether the tab should be visible/enabled
 *   - visibleTabs(): ordered list of accessible tab keys
 *   - lockedTabs(): ordered list of tab keys hidden by entitlements
 *
 * NOT YET WIRED INTO InstitutionDashboard — awaiting CEO sign-off.
 */
export function useModuleAccess(effectiveModules: EffectiveModule[]) {
  return useMemo(() => {
    const canAccess = (tab: InstitutionTabKey): boolean => {
      const rule = getTabRule(tab);
      // Unknown tabs default to visible (fail-open for forward-compat;
      // switch to fail-closed when wiring into the dashboard if preferred).
      if (!rule) return true;
      return isTabAccessible(rule, effectiveModules);
    };

    const visibleTabs = (): InstitutionTabKey[] =>
      TAB_MODULE_MAP.filter((r) => isTabAccessible(r, effectiveModules)).map(
        (r) => r.tab
      );

    const lockedTabs = (): InstitutionTabKey[] =>
      TAB_MODULE_MAP.filter((r) => !isTabAccessible(r, effectiveModules)).map(
        (r) => r.tab
      );

    return { canAccess, visibleTabs, lockedTabs };
  }, [effectiveModules]);
}
