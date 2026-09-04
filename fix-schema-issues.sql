-- ============================================================================
-- COMPREHENSIVE SCHEMA FIX MIGRATION
-- Run this in Supabase SQL Editor to fix all schema issues
-- ============================================================================

-- ============================================================================
-- 1. FIX ARRAY TYPE ISSUES
-- ============================================================================

-- Fix delivery_zones restrictions column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_zones' AND column_name = 'restrictions'
  ) THEN
    ALTER TABLE public.delivery_zones DROP COLUMN IF EXISTS restrictions;
    ALTER TABLE public.delivery_zones ADD COLUMN restrictions TEXT[];
  END IF;
END $$;

-- Fix health_articles tags column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_articles' AND column_name = 'tags'
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE public.health_articles DROP COLUMN IF EXISTS tags;
    ALTER TABLE public.health_articles ADD COLUMN tags TEXT[];
  END IF;
END $$;

-- Fix health_personnel_applications documents_url column
-- Must drop dependent view first
DROP VIEW IF EXISTS public.pending_applications;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_personnel_applications' AND column_name = 'documents_url'
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE public.health_personnel_applications DROP COLUMN IF EXISTS documents_url;
    ALTER TABLE public.health_personnel_applications ADD COLUMN documents_url TEXT[];
  END IF;
END $$;

-- Recreate the pending_applications view after column fix
CREATE OR REPLACE VIEW public.pending_applications AS
SELECT 
  'health_personnel' as application_type,
  hp.id,
  hp.user_id as applicant_id,
  p.first_name || ' ' || COALESCE(p.last_name, '') as applicant_name,
  p.email,
  p.phone,
  hp.status,
  hp.created_at as submitted_date,
  hp.documents_url,
  hp.review_notes,
  hp.reviewed_by,
  hp.reviewed_at
FROM public.health_personnel_applications hp
LEFT JOIN public.profiles p ON hp.user_id = p.id
WHERE hp.status IN ('pending', 'under_review')

UNION ALL

SELECT 
  'institution' as application_type,
  ia.id,
  ia.applicant_id,
  ia.institution_name as applicant_name,
  NULL as email,
  NULL as phone,
  ia.status,
  ia.submitted_at as submitted_date,
  NULL as documents_url,
  ia.reviewer_notes as review_notes,
  NULL as reviewed_by,
  ia.reviewed_at
FROM public.institution_applications ia
WHERE ia.status IN ('pending', 'under_review');

GRANT SELECT ON public.pending_applications TO authenticated;

-- Fix healthcare_institutions accepted_insurance_providers column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'healthcare_institutions' AND column_name = 'accepted_insurance_providers'
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE public.healthcare_institutions DROP COLUMN IF EXISTS accepted_insurance_providers;
    ALTER TABLE public.healthcare_institutions ADD COLUMN accepted_insurance_providers TEXT[];
  END IF;
END $$;

-- Fix profiles accepted_insurances column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'accepted_insurances'
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS accepted_insurances;
    ALTER TABLE public.profiles ADD COLUMN accepted_insurances TEXT[];
  END IF;
END $$;

-- Fix medication_reminders reminder_time column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medication_reminders' AND column_name = 'reminder_time'
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE public.medication_reminders DROP COLUMN IF EXISTS reminder_time;
    ALTER TABLE public.medication_reminders ADD COLUMN reminder_time TEXT[];
  END IF;
END $$;

-- Fix comprehensive_medical_records attachments column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comprehensive_medical_records' AND column_name = 'attachments'
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE public.comprehensive_medical_records DROP COLUMN IF EXISTS attachments;
    ALTER TABLE public.comprehensive_medical_records ADD COLUMN attachments TEXT[];
  END IF;
END $$;

-- Fix emergency_protocols medications_to_avoid column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emergency_protocols' AND column_name = 'medications_to_avoid'
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE public.emergency_protocols DROP COLUMN IF EXISTS medications_to_avoid;
    ALTER TABLE public.emergency_protocols ADD COLUMN medications_to_avoid TEXT[];
  END IF;
END $$;

-- Fix emergency_protocols emergency_medications column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emergency_protocols' AND column_name = 'emergency_medications'
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE public.emergency_protocols DROP COLUMN IF EXISTS emergency_medications;
    ALTER TABLE public.emergency_protocols ADD COLUMN emergency_medications TEXT[];
  END IF;
END $$;

-- Fix emergency_protocols emergency_contact_ids column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emergency_protocols' AND column_name = 'emergency_contact_ids'
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE public.emergency_protocols DROP COLUMN IF EXISTS emergency_contact_ids;
    ALTER TABLE public.emergency_protocols ADD COLUMN emergency_contact_ids UUID[];
  END IF;
END $$;

-- Fix medication_alerts times column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medication_alerts' AND column_name = 'times'
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE public.medication_alerts DROP COLUMN IF EXISTS times;
    ALTER TABLE public.medication_alerts ADD COLUMN times TEXT[];
  END IF;
END $$;

-- Fix medication_alerts side_effects_to_watch column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medication_alerts' AND column_name = 'side_effects_to_watch'
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE public.medication_alerts DROP COLUMN IF EXISTS side_effects_to_watch;
    ALTER TABLE public.medication_alerts ADD COLUMN side_effects_to_watch TEXT[];
  END IF;
END $$;

-- Fix medication_alerts interactions column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medication_alerts' AND column_name = 'interactions'
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE public.medication_alerts DROP COLUMN IF EXISTS interactions;
    ALTER TABLE public.medication_alerts ADD COLUMN interactions TEXT[];
  END IF;
END $$;

-- ============================================================================
-- 2. CREATE MISSING REFERENCED TABLES
-- ============================================================================

-- Create clinic_specialty_catalog if it doesn't exist
CREATE TABLE IF NOT EXISTS public.clinic_specialty_catalog (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT clinic_specialty_catalog_pkey PRIMARY KEY (id)
);

-- Add code column if table exists without it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'clinic_specialty_catalog'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clinic_specialty_catalog' AND column_name = 'code'
  ) THEN
    ALTER TABLE public.clinic_specialty_catalog ADD COLUMN code text;
  END IF;
END $$;

-- Create specialty_staff_roles if it doesn't exist
CREATE TABLE IF NOT EXISTS public.specialty_staff_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT specialty_staff_roles_pkey PRIMARY KEY (id)
);

-- Add code column if table exists without it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'specialty_staff_roles'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'specialty_staff_roles' AND column_name = 'code'
  ) THEN
    ALTER TABLE public.specialty_staff_roles ADD COLUMN code text;
  END IF;
END $$;

-- ============================================================================
-- 3. FIX INSTITUTION_STAFF FOREIGN KEYS
-- ============================================================================

-- Remove foreign key constraints that reference non-existent tables
DO $$
BEGIN
  -- Drop specialty_id foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'institution_staff_specialty_id_fkey'
  ) THEN
    ALTER TABLE public.institution_staff DROP CONSTRAINT institution_staff_specialty_id_fkey;
  END IF;
  
  -- Drop specialty_role_id foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'institution_staff_specialty_role_id_fkey'
  ) THEN
    ALTER TABLE public.institution_staff DROP CONSTRAINT institution_staff_specialty_role_id_fkey;
  END IF;
END $$;

-- Re-add foreign key constraints with proper handling
DO $$
BEGIN
  -- Add specialty_id foreign key if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_staff' AND column_name = 'specialty_id'
  ) THEN
    ALTER TABLE public.institution_staff 
    ADD CONSTRAINT institution_staff_specialty_id_fkey 
    FOREIGN KEY (specialty_id) REFERENCES public.clinic_specialty_catalog(id);
  END IF;
  
  -- Add specialty_role_id foreign key if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'institution_staff' AND column_name = 'specialty_role_id'
  ) THEN
    ALTER TABLE public.institution_staff 
    ADD CONSTRAINT institution_staff_specialty_role_id_fkey 
    FOREIGN KEY (specialty_role_id) REFERENCES public.specialty_staff_roles(id);
  END IF;
END $$;

-- ============================================================================
-- 4. FIX AI_CHAT_CONVERSATIONS DUPLICATE FOREIGN KEY
-- ============================================================================

DO $$
BEGIN
  -- Drop the duplicate fk_user constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_user'
    ) THEN
    ALTER TABLE public.ai_chat_conversations DROP CONSTRAINT fk_user;
  END IF;
END $$;

-- ============================================================================
-- 5. FIX AI_CHAT_MESSAGES DUPLICATE FOREIGN KEY
-- ============================================================================

DO $$
BEGIN
  -- Drop the duplicate fk_conversation constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_conversation'
  ) THEN
    ALTER TABLE public.ai_chat_messages DROP CONSTRAINT fk_conversation;
  END IF;
END $$;

-- ============================================================================
-- 6. ENSURE ALL TABLES HAVE RLS ENABLED
-- ============================================================================

-- Enable RLS on tables that might not have it
DO $$
BEGIN
  -- Check and enable RLS for key tables using pg_class
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' 
    AND c.relname = 'delivery_zones'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' 
    AND c.relname = 'pharmacy_staff'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.pharmacy_staff ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================================
-- 7. ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_delivery_zones_pharmacy ON public.delivery_zones(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON public.delivery_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_pharmacy_staff_pharmacy ON public.pharmacy_staff(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_staff_user ON public.pharmacy_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_institution_staff_institution ON public.institution_staff(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_staff_provider ON public.institution_staff(provider_id);
CREATE INDEX IF NOT EXISTS idx_clinic_specialty_catalog_code ON public.clinic_specialty_catalog(code);
CREATE INDEX IF NOT EXISTS idx_specialty_staff_roles_code ON public.specialty_staff_roles(code);

-- ============================================================================
-- 8. ADD TRIGGER FOR UPDATED_AT ON TABLES THAT NEED IT
-- ============================================================================

-- Create or replace the handle_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to tables that have updated_at column
DO $$
BEGIN
  -- delivery_zones
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'update_delivery_zones_updated_at'
  ) THEN
    CREATE TRIGGER update_delivery_zones_updated_at
    BEFORE UPDATE ON public.delivery_zones
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  
  -- pharmacy_staff
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'update_pharmacy_staff_updated_at'
  ) THEN
    CREATE TRIGGER update_pharmacy_staff_updated_at
    BEFORE UPDATE ON public.pharmacy_staff
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  
  -- institution_staff
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'update_institution_staff_updated_at'
  ) THEN
    CREATE TRIGGER update_institution_staff_updated_at
    BEFORE UPDATE ON public.institution_staff
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Schema fix migration completed successfully!';
  RAISE NOTICE 'Fixed ARRAY type issues in: delivery_zones, health_articles, health_personnel_applications, healthcare_institutions, profiles, medication_reminders, comprehensive_medical_records, emergency_protocols, medication_alerts';
  RAISE NOTICE 'Created missing tables: clinic_specialty_catalog, specialty_staff_roles';
  RAISE NOTICE 'Fixed institution_staff foreign key constraints';
  RAISE NOTICE 'Removed duplicate foreign key constraints from ai_chat tables';
  RAISE NOTICE 'Enabled RLS on key tables';
  RAISE NOTICE 'Added performance indexes';
  RAISE NOTICE 'Added updated_at triggers';
END $$;
