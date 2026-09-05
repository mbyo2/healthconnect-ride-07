-- Provider and Institution Application Enhancements Migration
-- Adds comprehensive data collection fields for marketplace listing and HMS-only institutions
-- Created: September 4, 2026

-- ============================================================================
-- HEALTHCARE INSTITUTIONS TABLE ENHANCEMENTS
-- ============================================================================

-- Marketplace Listing Control
ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS list_in_marketplace boolean DEFAULT true;

-- Operational Details
ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS operational_since date;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS number_of_beds integer;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS number_of_staff integer;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS emergency_services boolean DEFAULT false;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS ambulance_services boolean DEFAULT false;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS is_24_7 boolean DEFAULT false;

-- Accreditation & Compliance
ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS accreditation_body text;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS accreditation_number text;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS accreditation_expiry_date date;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS tax_id text;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS business_registration_number text;

-- Financial Information
ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS bank_name text;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS bank_account_number text;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS bank_account_name text;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS swift_code text;

-- Services & Capabilities
ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS services_offered text[];

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS equipment_available text[];

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS specialties text[];

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS languages_spoken text[];

-- Operating Hours (JSONB for flexible structure)
ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS operating_hours jsonb DEFAULT '{
  "monday": {"open": "08:00", "close": "17:00", "closed": false},
  "tuesday": {"open": "08:00", "close": "17:00", "closed": false},
  "wednesday": {"open": "08:00", "close": "17:00", "closed": false},
  "thursday": {"open": "08:00", "close": "17:00", "closed": false},
  "friday": {"open": "08:00", "close": "17:00", "closed": false},
  "saturday": {"open": "08:00", "close": "13:00", "closed": false},
  "sunday": {"open": "00:00", "close": "00:00", "closed": true}
}'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_institutions_marketplace ON healthcare_institutions(list_in_marketplace);
CREATE INDEX IF NOT EXISTS idx_institutions_type ON healthcare_institutions(type);
CREATE INDEX IF NOT EXISTS idx_institutions_emergency ON healthcare_institutions(emergency_services) WHERE emergency_services = true;
CREATE INDEX IF NOT EXISTS idx_institutions_24_7 ON healthcare_institutions(is_24_7) WHERE is_24_7 = true;

-- Add comments for documentation
COMMENT ON COLUMN healthcare_institutions.list_in_marketplace IS 'Whether institution should be listed in public marketplace. False = HMS-only access';
COMMENT ON COLUMN healthcare_institutions.operating_hours IS 'Weekly operating hours in JSON format with open/close times and closed flags';


-- ============================================================================
-- PROFILES TABLE ENHANCEMENTS (FOR PROVIDERS)
-- ============================================================================

-- Professional Education
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS medical_school text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS graduation_year integer;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS board_certifications text[];

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subspecialties text[];

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS languages_spoken text[];

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS research_publications text[];

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS awards_recognition text[];

-- Practice Information
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS primary_practice_location text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS affiliated_hospitals text[];

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS consultation_fee_min numeric(10,2);

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS consultation_fee_max numeric(10,2);

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS accepts_insurance boolean DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS insurance_providers_accepted text[];

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS telemedicine_available boolean DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS home_visits_available boolean DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS typical_wait_time text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS appointment_types text[];

-- Availability Schedule (JSONB for flexible structure)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS availability_schedule jsonb DEFAULT '{
  "monday": {"available": true, "hours": ["09:00-12:00", "14:00-17:00"]},
  "tuesday": {"available": true, "hours": ["09:00-12:00", "14:00-17:00"]},
  "wednesday": {"available": true, "hours": ["09:00-12:00", "14:00-17:00"]},
  "thursday": {"available": true, "hours": ["09:00-12:00", "14:00-17:00"]},
  "friday": {"available": true, "hours": ["09:00-12:00", "14:00-17:00"]},
  "saturday": {"available": false, "hours": []},
  "sunday": {"available": false, "hours": []}
}'::jsonb;

-- Professional References (JSONB array)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS professional_references jsonb DEFAULT '[]'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_specialty ON profiles(specialty);
CREATE INDEX IF NOT EXISTS idx_profiles_telemedicine ON profiles(telemedicine_available) WHERE telemedicine_available = true;
CREATE INDEX IF NOT EXISTS idx_profiles_home_visits ON profiles(home_visits_available) WHERE home_visits_available = true;
CREATE INDEX IF NOT EXISTS idx_profiles_accepts_insurance ON profiles(accepts_insurance) WHERE accepts_insurance = true;

-- Add comments for documentation
COMMENT ON COLUMN profiles.availability_schedule IS 'Weekly availability schedule in JSON format with available flag and time slots';
COMMENT ON COLUMN profiles.professional_references IS 'Array of professional references with name, title, institution, phone, and email';


-- ============================================================================
-- APPLICATION EXTENDED DATA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS application_extended_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  application_type text NOT NULL CHECK (application_type IN ('provider', 'institution')),
  extended_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  verification_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  admin_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_application_extended_type ON application_extended_data(application_type);
CREATE INDEX IF NOT EXISTS idx_application_extended_id ON application_extended_data(application_id);

-- Add comments
COMMENT ON TABLE application_extended_data IS 'Stores extended application data, verification checklists, and admin notes for provider and institution applications';
COMMENT ON COLUMN application_extended_data.extended_data IS 'Additional application data that does not fit in main tables (operating hours, references, etc.)';
COMMENT ON COLUMN application_extended_data.verification_checklist IS 'Admin verification checklist items with completion status';
COMMENT ON COLUMN application_extended_data.admin_notes IS 'Admin review notes with timestamp and author';

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_application_extended_data_updated_at 
    BEFORE UPDATE ON application_extended_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- UPDATE EXISTING TABLES WITH MISSING FIELDS
-- ============================================================================

-- Ensure healthcare_institutions has all required base fields
ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS license_number text;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS website text;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS state text;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS postal_code text;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS latitude numeric(10,8);

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS longitude numeric(11,8);

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

ALTER TABLE healthcare_institutions 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));

-- Add geospatial index for location-based queries
CREATE INDEX IF NOT EXISTS idx_institutions_location ON healthcare_institutions(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on application_extended_data
ALTER TABLE application_extended_data ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all extended data
CREATE POLICY admin_view_extended_data ON application_extended_data
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can insert/update extended data
CREATE POLICY admin_manage_extended_data ON application_extended_data
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Update RLS for healthcare_institutions to respect list_in_marketplace
DROP POLICY IF EXISTS public_view_institutions ON healthcare_institutions;

CREATE POLICY public_view_institutions ON healthcare_institutions
  FOR SELECT
  USING (
    -- Public can see listed institutions that are approved
    (list_in_marketplace = true AND verified = true AND status = 'approved')
    OR
    -- Authenticated users can see their own institutions
    (auth.uid() = admin_id)
    OR
    -- Admins can see all institutions
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );


-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get comprehensive institution data for admin review
CREATE OR REPLACE FUNCTION get_institution_application_details(institution_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'institution', to_jsonb(hi.*),
    'extended_data', COALESCE(aed.extended_data, '{}'::jsonb),
    'verification_checklist', COALESCE(aed.verification_checklist, '[]'::jsonb),
    'admin_notes', COALESCE(aed.admin_notes, '[]'::jsonb)
  )
  INTO result
  FROM healthcare_institutions hi
  LEFT JOIN application_extended_data aed ON aed.application_id = hi.id AND aed.application_type = 'institution'
  WHERE hi.id = institution_id;

  RETURN result;
END;
$$;

-- Function to get comprehensive provider application details
CREATE OR REPLACE FUNCTION get_provider_application_details(provider_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'provider', to_jsonb(p.*),
    'extended_data', COALESCE(aed.extended_data, '{}'::jsonb),
    'verification_checklist', COALESCE(aed.verification_checklist, '[]'::jsonb),
    'admin_notes', COALESCE(aed.admin_notes, '[]'::jsonb)
  )
  INTO result
  FROM profiles p
  LEFT JOIN application_extended_data aed ON aed.application_id = p.id AND aed.application_type = 'provider'
  WHERE p.id = provider_id;

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_institution_application_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_application_details(uuid) TO authenticated;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add migration record
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations') THEN
    INSERT INTO schema_migrations (version, name)
    VALUES ('20260904', 'provider_institution_enhancements')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
