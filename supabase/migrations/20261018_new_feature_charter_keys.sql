-- Unify new-feature module keys with the archetype charter namespace.
--
-- The 20261018_camp_and_indent_management migration seeded DB charter keys
-- 'camp_management' / 'indent_management', but the canonical key namespace
-- (facilityProfiles.ts archetype charter + moduleTabMapping.ts tab gating)
-- uses 'camps' / 'indents'. This migration renames the DB seeds to match,
-- and adds the missing 'art' (Fertility/ART-IVF) and 'campaigns'
-- (Email Campaigns) keys so getAllCharterModules returns them and admins
-- can grant/revoke all four via InstitutionModuleManager.
--
-- All four are 'planned' by default — admin grants them per institution.

-- 1. Rename camp/indent keys to the canonical namespace
UPDATE public.facility_module_charter
SET module_key = 'camps',
    module_name = 'Health Camp Outreach'
WHERE module_key = 'camp_management';

UPDATE public.facility_module_charter
SET module_key = 'indents',
    module_name = 'Indent Management'
WHERE module_key = 'indent_management';

-- 2. Seed ART/IVF and Email Campaigns keys (were missing from the DB catalog)
INSERT INTO public.facility_module_charter (tier, module_key, module_name, description, status, display_order)
VALUES
  ('secondary','art','Fertility (ART/IVF)','Assisted reproduction cycles with strict confidentiality','planned',30),
  ('tertiary','art','Fertility (ART/IVF)','Assisted reproduction cycles with strict confidentiality','planned',31),
  ('primary','campaigns','Email Campaigns','Bulk patient emails for recalls, screenings and health tips','planned',16),
  ('secondary','campaigns','Email Campaigns','Bulk patient emails for recalls, screenings and health tips','planned',32),
  ('tertiary','campaigns','Email Campaigns','Bulk patient emails for recalls, screenings and health tips','planned',33)
ON CONFLICT DO NOTHING;
