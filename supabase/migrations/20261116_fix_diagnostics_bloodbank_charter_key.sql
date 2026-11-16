-- 20261116_fix_diagnostics_bloodbank_charter_key.sql
-- Doc swarm group 3 (institution admin), 2026-11-16.
--
-- The diagnostics tier's Blood Bank charter row used module_key 'bloodbank'
-- ("Blood Bank"), while every other consumer of the key uses 'blood_bank':
--   - secondary + tertiary charter rows: 'blood_bank' ("Blood bank requests")
--   - src/config/moduleTabMapping.ts bloodbank tab: requiredModules ["blood_bank"]
--   - public.institution_module_pricing: price row keyed 'blood_bank' only
-- So a diagnostics-tier Blood Bank / Transfusion Service institution held
-- the charter key 'bloodbank', which matches NO tab rule, NO price row, and
-- NO other tier's key — its Blood Bank module could never be recognised as
-- the same module. (The tab map is not yet wired into the dashboard, so this
-- was latent, not user-facing — it would have bitten on wiring day.)
--
-- Fix: canonicalise on 'blood_bank' (name aligned with the other tiers).
-- Safe live: no institution_module_entitlements rows reference either key
-- (verified 2026-11-16), and the diagnostics tier keeps 8 charter keys.
-- The drifted live row ('bloodbank', added outside the repo migrations —
-- no repo migration contains that key) is renamed; a fresh database that
-- never had it gets the row inserted instead (repo seed gives diagnostics
-- only 7 keys, no Blood Bank row at all).
UPDATE public.facility_module_charter
SET module_key = 'blood_bank',
    module_name = 'Blood bank requests'
WHERE tier = 'diagnostics'
  AND module_key = 'bloodbank';

INSERT INTO public.facility_module_charter
  (tier, module_key, module_name, description, status, display_order)
SELECT 'diagnostics', 'blood_bank', 'Blood bank requests',
       'Request and track blood products', 'live', 8
WHERE NOT EXISTS (
  SELECT 1 FROM public.facility_module_charter
  WHERE tier = 'diagnostics' AND module_key = 'blood_bank'
);
