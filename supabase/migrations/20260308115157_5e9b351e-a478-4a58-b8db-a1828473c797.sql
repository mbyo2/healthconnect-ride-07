
-- ══════════════════════════════════════════════════════════════
-- 1. STAFF INVITATIONS — email-based invite system
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  email text NOT NULL,
  staff_role text NOT NULL DEFAULT 'staff',
  department_id uuid REFERENCES public.hospital_departments(id) ON DELETE SET NULL,
  department_name text,
  specialty text,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institution_id, email, status)
);

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Institution admins can manage invitations
CREATE POLICY "Institution admins manage invitations" ON public.staff_invitations
  FOR ALL TO authenticated
  USING (public.is_institution_admin(institution_id) OR public.is_service_role())
  WITH CHECK (public.is_institution_admin(institution_id) OR public.is_service_role());

-- Staff can view their own invitations
CREATE POLICY "Users view own invitations" ON public.staff_invitations
  FOR SELECT TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- ══════════════════════════════════════════════════════════════
-- 2. STAFF SHIFTS — duty roster & scheduling
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.institution_staff(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.hospital_departments(id) ON DELETE SET NULL,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  shift_type text NOT NULL DEFAULT 'regular' CHECK (shift_type IN ('regular', 'on_call', 'overtime', 'night', 'emergency')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked_in', 'completed', 'absent', 'swapped')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution members manage shifts" ON public.staff_shifts
  FOR ALL TO authenticated
  USING (
    public.is_institution_admin(institution_id)
    OR public.is_institution_staff_member(institution_id)
    OR public.is_service_role()
  )
  WITH CHECK (
    public.is_institution_admin(institution_id)
    OR public.is_service_role()
  );

-- ══════════════════════════════════════════════════════════════
-- 3. INSTITUTION DEVICE CONNECTIONS — link IoT devices to hospitals
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.institution_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  device_name text NOT NULL,
  device_type text NOT NULL CHECK (device_type IN (
    'vital_monitor', 'lab_analyzer', 'imaging_machine', 'pharmacy_dispenser',
    'ecg_machine', 'ventilator', 'infusion_pump', 'pulse_oximeter',
    'blood_pressure_monitor', 'glucometer', 'defibrillator', 'other'
  )),
  manufacturer text,
  model_number text,
  serial_number text,
  department_id uuid REFERENCES public.hospital_departments(id) ON DELETE SET NULL,
  location_description text,
  connection_protocol text DEFAULT 'api' CHECK (connection_protocol IN ('hl7', 'fhir', 'dicom', 'astm', 'api', 'mqtt', 'bluetooth', 'wifi')),
  connection_config jsonb DEFAULT '{}',
  ip_address text,
  is_active boolean NOT NULL DEFAULT true,
  last_heartbeat timestamptz,
  battery_level integer,
  firmware_version text,
  calibration_date date,
  next_calibration_date date,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error', 'maintenance', 'calibrating')),
  registered_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.institution_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution members manage devices" ON public.institution_devices
  FOR ALL TO authenticated
  USING (
    public.is_institution_admin(institution_id)
    OR public.is_institution_staff_member(institution_id)
    OR public.is_service_role()
  )
  WITH CHECK (
    public.is_institution_admin(institution_id)
    OR public.is_service_role()
  );

-- ══════════════════════════════════════════════════════════════
-- 4. DEVICE DATA FEEDS — real-time data from connected machines
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.device_data_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.institution_devices(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  data_type text NOT NULL,
  data_value jsonb NOT NULL,
  unit text,
  is_critical boolean NOT NULL DEFAULT false,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_data_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution members access device feeds" ON public.device_data_feeds
  FOR ALL TO authenticated
  USING (
    public.is_institution_admin(institution_id)
    OR public.is_institution_staff_member(institution_id)
    OR public.is_service_role()
  )
  WITH CHECK (
    public.is_institution_admin(institution_id)
    OR public.is_institution_staff_member(institution_id)
    OR public.is_service_role()
  );

-- ══════════════════════════════════════════════════════════════
-- 5. Add extra columns to institution_staff for richer staff profiles
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.institution_staff 
  ADD COLUMN IF NOT EXISTS employee_id text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS qualification text,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS staff_type text DEFAULT 'clinical' CHECK (staff_type IN ('clinical', 'nursing', 'admin', 'support', 'lab', 'pharmacy', 'radiology', 'housekeeping', 'security', 'management')),
  ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'visiting', 'intern', 'resident')),
  ADD COLUMN IF NOT EXISTS hired_date date;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON public.staff_invitations(email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON public.staff_invitations(token);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date ON public.staff_shifts(shift_date, institution_id);
CREATE INDEX IF NOT EXISTS idx_device_data_feeds_device ON public.device_data_feeds(device_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_institution_devices_institution ON public.institution_devices(institution_id, is_active);
