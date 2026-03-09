CREATE TABLE IF NOT EXISTS shift_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES healthcare_institutions(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL,
  staff_name TEXT,
  shift_date DATE NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'night', 'full_day')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  department TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES healthcare_institutions(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES asset_register(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('preventive', 'calibration', 'inspection', 'certification')),
  frequency_days INTEGER NOT NULL DEFAULT 30,
  last_completed DATE,
  next_due DATE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  instructions TEXT,
  estimated_duration_hours DECIMAL(4,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE asset_register ADD COLUMN IF NOT EXISTS maintenance_interval_days INTEGER;

ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff can view shifts" ON shift_schedules
  FOR SELECT TO authenticated
  USING (public.is_institution_staff_member(institution_id) OR public.is_institution_admin(institution_id));

CREATE POLICY "Institution staff can insert shifts" ON shift_schedules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_institution_staff_member(institution_id) OR public.is_institution_admin(institution_id));

CREATE POLICY "Institution staff can update shifts" ON shift_schedules
  FOR UPDATE TO authenticated
  USING (public.is_institution_staff_member(institution_id) OR public.is_institution_admin(institution_id));

CREATE POLICY "Institution staff can view maintenance" ON maintenance_schedules
  FOR SELECT TO authenticated
  USING (public.is_institution_staff_member(institution_id) OR public.is_institution_admin(institution_id));

CREATE POLICY "Institution staff can insert maintenance" ON maintenance_schedules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_institution_staff_member(institution_id) OR public.is_institution_admin(institution_id));

CREATE POLICY "Institution staff can update maintenance" ON maintenance_schedules
  FOR UPDATE TO authenticated
  USING (public.is_institution_staff_member(institution_id) OR public.is_institution_admin(institution_id));

CREATE INDEX IF NOT EXISTS idx_shift_schedules_institution_date ON shift_schedules(institution_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_institution ON maintenance_schedules(institution_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_due ON maintenance_schedules(next_due);