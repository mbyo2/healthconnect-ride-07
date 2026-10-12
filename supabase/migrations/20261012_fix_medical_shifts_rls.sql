-- Fix: allow institution staff to manage shifts
-- ------------------------------------------------------------------
-- The medical_shifts table was missing RLS policies, causing
-- "permission denied" errors when trying to create shifts.

-- Enable RLS if not already enabled
ALTER TABLE public.medical_shifts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Institution staff can view shifts" ON public.medical_shifts;
DROP POLICY IF EXISTS "Institution staff can manage shifts" ON public.medical_shifts;

-- Staff can view shifts for their institution
CREATE POLICY "Institution staff can view shifts"
ON public.medical_shifts FOR SELECT
USING (
  public.user_affiliated_with_institution(institution_id)
);

-- Staff can create/update shifts for their institution
CREATE POLICY "Institution staff can manage shifts"
ON public.medical_shifts FOR ALL
USING (
  public.user_affiliated_with_institution(institution_id)
)
WITH CHECK (
  public.user_affiliated_with_institution(institution_id)
);
