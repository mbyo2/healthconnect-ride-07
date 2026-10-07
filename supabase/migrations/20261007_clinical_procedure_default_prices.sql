-- Default prices for all clinical procedures
--
-- CONTEXT (2026-10-07): the clinical_procedures catalog has 11 procedures but
-- institution_procedure_pricing is completely empty (0/11 priced). The
-- consolidated patient bill needs every procedure to have a price.
--
-- FIX: add a default_price column to clinical_procedures with sensible
-- Kwacha defaults. Institutions can override per-procedure via
-- institution_procedure_pricing (which takes precedence when present).

ALTER TABLE public.clinical_procedures
  ADD COLUMN IF NOT EXISTS default_price numeric(12,2) NOT NULL DEFAULT 0;

-- Seed sensible Zambian private-healthcare defaults (Kwacha).
-- Institutions override these in their own tariff books.
UPDATE public.clinical_procedures SET default_price = 100 WHERE procedure_name = 'Async Health Consultation';
UPDATE public.clinical_procedures SET default_price = 350 WHERE procedure_name = 'Chest X-Ray';
UPDATE public.clinical_procedures SET default_price = 300 WHERE procedure_name = 'Complete Blood Count';
UPDATE public.clinical_procedures SET default_price = 600 WHERE procedure_name = 'Comprehensive Metabolic Panel';
UPDATE public.clinical_procedures SET default_price = 2500 WHERE procedure_name = 'CT Scan';
UPDATE public.clinical_procedures SET default_price = 150 WHERE procedure_name = 'In-Person General Consultation';
UPDATE public.clinical_procedures SET default_price = 350 WHERE procedure_name = 'Mental Health Session - Video';
UPDATE public.clinical_procedures SET default_price = 500 WHERE procedure_name = 'Specialist Consultation';
UPDATE public.clinical_procedures SET default_price = 200 WHERE procedure_name = 'Telemedicine Consultation - General';
UPDATE public.clinical_procedures SET default_price = 400 WHERE procedure_name = 'Telemedicine Consultation - Specialist';
UPDATE public.clinical_procedures SET default_price = 100 WHERE procedure_name = 'Video Consultation - Follow-up';

COMMENT ON COLUMN public.clinical_procedures.default_price IS
  'Default Kwacha price; institution_procedure_pricing overrides per institution when present.';
