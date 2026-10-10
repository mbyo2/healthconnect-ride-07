/**
 * Module → Dashboard tab entitlement mapping
 * ------------------------------------------------------------------
 * Maps every InstitutionDashboard tab to the facility-charter module key(s)
 * it requires. Used for module entitlement enforcement: tabs whose required
 * modules are not effective-live for an institution are hidden/locked.
 *
 * Module keys come from `public.facility_module_charter` (see
 * supabase/migrations/20260925_facility_taxonomy_and_module_charter.sql).
 * A tab is visible when it is essential OR when ANY of its required modules
 * is effective-live for the institution (see institutionModules service).
 *
 * NOT YET WIRED INTO THE DASHBOARD — awaiting CEO sign-off on this table.
 */

import type { EffectiveModule } from "@/services/institutionModules";

/** Every tab rendered by InstitutionDashboard's tab navigation. */
export type InstitutionTabKey =
  | "overview"
  | "patients"
  | "queue"
  | "pediatrics"
  | "physio"
  | "dispensary"
  | "care"
  | "erp_stock"
  | "erp_admin"
  | "procedures"
  | "lis_ris"
  | "bloodbank"
  | "fhir"
  | "rcm"
  | "governance";

export interface TabModuleRule {
  tab: InstitutionTabKey;
  label: string;
  /**
   * Charter module keys — tab is visible if ANY is effective-live.
   * Empty array = essential tab, always visible.
   */
  requiredModules: string[];
  /** Essential tabs are always visible regardless of entitlements. */
  essential: boolean;
  /** Ambiguity / CEO decision notes. */
  notes?: string;
}

export const TAB_MODULE_MAP: TabModuleRule[] = [
  {
    tab: "overview",
    label: "Dashboard Overview",
    requiredModules: [],
    essential: true,
    notes: "Dashboard home — always visible.",
  },
  {
    tab: "patients",
    label: "Patient Hub (Central MRN)",
    requiredModules: ["patient_registration"],
    essential: true,
    notes:
      "patient_registration is live in every charter tier, so this is effectively always visible. Marked essential because every facility registers patients.",
  },
  {
    tab: "queue",
    label: "Queue & Calling Desk",
    requiredModules: ["opd", "appointments"],
    essential: false,
    notes:
      "Queue desk serves the outpatient/appointment flow. Visible when either OPD or Appointments is live.",
  },
  {
    tab: "pediatrics",
    label: "Pediatric Center",
    requiredModules: ["pediatrics"],
    essential: false,
    notes:
      "Dedicated pediatrics charter module (added 2026-10-10).",
  },
  {
    tab: "physio",
    label: "Physiotherapy Center",
    requiredModules: ["rehabilitation"],
    essential: false,
    notes:
      "Dedicated rehabilitation charter module (added 2026-10-10).",
  },
  {
    tab: "dispensary",
    label: "Dispensary Operations",
    requiredModules: ["pharmacy", "drug_stock"],
    essential: false,
    notes:
      "Dispensary = in-house dispensing. pharmacy (tier) or drug_stock (community tier) both cover it.",
  },
  {
    tab: "care",
    label: "Care Management (OPD/IPD)",
    requiredModules: ["opd", "ipd_wards"],
    essential: false,
    notes: "CareManagementSuite covers OPD and IPD care episodes.",
  },
  {
    tab: "erp_stock",
    label: "ERP Stock & Buying",
    requiredModules: ["erp_inventory"],
    essential: false,
    notes:
      "Dedicated erp_inventory charter module (added 2026-10-10).",
  },
  {
    tab: "erp_admin",
    label: "ERP Admin & Finance",
    requiredModules: ["billing", "hr_staff"],
    essential: false,
    notes:
      "ERPAdministration covers finance and admin. billing is the closest charter match; hr_staff covers the personnel side.",
  },
  {
    tab: "procedures",
    label: "Clinical Coding (ICD/CPT)",
    requiredModules: ["clinical_coding"],
    essential: false,
    notes:
      "Dedicated clinical_coding charter module (added 2026-10-10).",
  },
  {
    tab: "lis_ris",
    label: "LIS & RIS Imaging",
    requiredModules: ["laboratory", "imaging"],
    essential: false,
    notes: "LISRadiologySuite = lab information system + radiology imaging suite.",
  },
  {
    tab: "bloodbank",
    label: "Blood Bank",
    requiredModules: ["blood_bank"],
    essential: false,
    notes: "Exact charter match.",
  },
  {
    tab: "fhir",
    label: "HL7 FHIR Interoperability",
    requiredModules: ["interoperability"],
    essential: false,
    notes:
      "Dedicated interoperability charter module (added 2026-10-10).",
  },
  {
    tab: "rcm",
    label: "Revenue Cycle & Insurance",
    requiredModules: ["billing", "insurance"],
    essential: false,
    notes: "AdvancedRevenueCycle = billing + insurance claims.",
  },
  {
    tab: "governance",
    label: "Multi-Center Governance",
    requiredModules: ["governance"],
    essential: false,
    notes:
      "Dedicated governance charter module (added 2026-10-10).",
  },
];

/** All 15 dashboard tab keys in display order. */
export const ALL_TABS: InstitutionTabKey[] = TAB_MODULE_MAP.map((r) => r.tab);

/** Tabs that are always visible regardless of entitlements. */
export const ESSENTIAL_TABS: InstitutionTabKey[] = TAB_MODULE_MAP.filter(
  (r) => r.essential
).map((r) => r.tab);

/** Look up the rule for a tab key. */
export function getTabRule(tab: InstitutionTabKey): TabModuleRule | undefined {
  return TAB_MODULE_MAP.find((r) => r.tab === tab);
}

/**
 * Whether a tab is accessible given the institution's effective modules.
 * Essential tabs (or tabs with no required modules) are always accessible.
 * Otherwise accessible when ANY required module is effective-live.
 */
export function isTabAccessible(
  rule: TabModuleRule,
  effectiveModules: EffectiveModule[]
): boolean {
  if (rule.essential || rule.requiredModules.length === 0) return true;
  const live = new Set(
    effectiveModules
      .filter((m) => m.effective === "live")
      .map((m) => m.module_key)
  );
  return rule.requiredModules.some((k) => live.has(k));
}

/**
 * Which required modules are missing (all not-live) for a tab.
 * Useful for "request this module" UX.
 */
export function missingModulesForTab(
  rule: TabModuleRule,
  effectiveModules: EffectiveModule[]
): string[] {
  if (rule.essential || rule.requiredModules.length === 0) return [];
  const live = new Set(
    effectiveModules
      .filter((m) => m.effective === "live")
      .map((m) => m.module_key)
  );
  return rule.requiredModules.filter((k) => !live.has(k));
}
