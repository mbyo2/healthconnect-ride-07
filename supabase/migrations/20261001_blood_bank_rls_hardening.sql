-- ============================================================
-- Doc'O Clock — Blood bank RLS hardening (2026-10-01)
--
-- Replaces the permissive `USING (true)` policies on blood bank tables
-- with institution-scoped access control. Also fixes live/repo drift
-- (missing indexes, missing donor trigger) and makes donation ->
-- inventory atomic via a single RPC.
--
-- Access model (all via SECURITY DEFINER helpers, no RLS recursion):
--   1. Platform superadmin (public.is_super_admin())
--   2. Institution superadmin (healthcare_institutions.admin_id)
--   3. Active institution staff (institution_staff.provider_id)
--   4. Active institution personnel (institution_personnel.user_id)
--
-- Idempotent; safe to re-run.
-- ============================================================

-- ─── 1. Comprehensive membership helper ───
CREATE OR REPLACE FUNCTION public.can_access_institution_blood_bank(p_institution_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_super_admin()
    OR public.is_institution_admin(p_institution_id)
    OR public.is_institution_staff_member(p_institution_id)
    OR EXISTS (
      SELECT 1 FROM public.institution_personnel ip
      WHERE ip.institution_id = p_institution_id
        AND ip.user_id = auth.uid()
        AND ip.status = 'active'
    );
$$;

-- ─── 2. Replace permissive policies on the three new tables ───
DROP POLICY IF EXISTS "Institution members manage donors" ON public.blood_donors;
DROP POLICY IF EXISTS "Institution members manage donations" ON public.blood_donations;
DROP POLICY IF EXISTS "Institution members manage compatibility" ON public.blood_compatibility_tests;

CREATE POLICY "Blood bank donors institution access"
  ON public.blood_donors FOR ALL TO authenticated
  USING (public.can_access_institution_blood_bank(hospital_id))
  WITH CHECK (public.can_access_institution_blood_bank(hospital_id));

CREATE POLICY "Blood bank donations institution access"
  ON public.blood_donations FOR ALL TO authenticated
  USING (public.can_access_institution_blood_bank(hospital_id))
  WITH CHECK (public.can_access_institution_blood_bank(hospital_id));

CREATE POLICY "Blood bank compatibility institution access"
  ON public.blood_compatibility_tests FOR ALL TO authenticated
  USING (public.can_access_institution_blood_bank(hospital_id))
  WITH CHECK (public.can_access_institution_blood_bank(hospital_id));

-- ─── 3. Harden the two pre-existing tables (same permissive flaw) ───
DROP POLICY IF EXISTS "Authenticated users access blood bank inventory" ON public.blood_bank_inventory;
DROP POLICY IF EXISTS "Hospital staff can manage blood bank inventory" ON public.blood_bank_inventory;
DROP POLICY IF EXISTS "Hospital staff can view blood bank inventory" ON public.blood_bank_inventory;

CREATE POLICY "Blood bank inventory institution access"
  ON public.blood_bank_inventory FOR ALL TO authenticated
  USING (public.can_access_institution_blood_bank(hospital_id))
  WITH CHECK (public.can_access_institution_blood_bank(hospital_id));

DROP POLICY IF EXISTS "Authenticated users access blood bank requests" ON public.blood_bank_requests;
DROP POLICY IF EXISTS "Hospital staff can manage blood bank requests" ON public.blood_bank_requests;
DROP POLICY IF EXISTS "Hospital staff can view blood bank requests" ON public.blood_bank_requests;

CREATE POLICY "Blood bank requests institution access"
  ON public.blood_bank_requests FOR ALL TO authenticated
  USING (public.can_access_institution_blood_bank(hospital_id))
  WITH CHECK (public.can_access_institution_blood_bank(hospital_id));

-- ─── 4. Fix drift: ensure all indexes exist ───
CREATE INDEX IF NOT EXISTS idx_blood_donors_hospital ON public.blood_donors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_donors_blood_type ON public.blood_donors(blood_type);
CREATE INDEX IF NOT EXISTS idx_blood_donations_hospital ON public.blood_donations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_donations_donor ON public.blood_donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_blood_compat_hospital ON public.blood_compatibility_tests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_compat_request ON public.blood_compatibility_tests(request_id);

-- ─── 5. Fix drift: ensure donor last-donation trigger exists ───
CREATE OR REPLACE FUNCTION public.update_donor_last_donation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.donor_id IS NOT NULL THEN
    UPDATE public.blood_donors
    SET last_donation_date = NEW.donation_date::date,
        updated_at = now()
    WHERE id = NEW.donor_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_donor_last_donation ON public.blood_donations;
CREATE TRIGGER trg_update_donor_last_donation
  AFTER INSERT ON public.blood_donations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_donor_last_donation();

-- ─── 6. Atomic donation -> inventory RPC ───
-- Records a donation and its inventory in ONE transaction.
-- The client must call this instead of doing separate inserts.
CREATE OR REPLACE FUNCTION public.record_blood_donation(
  p_hospital_id UUID,
  p_donor_id UUID,
  p_blood_type TEXT,
  p_component_type TEXT DEFAULT 'whole_blood',
  p_units_collected NUMERIC DEFAULT 1,
  p_screening_status TEXT DEFAULT 'pending',
  p_screening_notes TEXT DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL,
  p_collected_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_donation_id UUID;
  v_inventory_id UUID;
BEGIN
  -- Authorization: caller must have blood-bank access to this institution.
  IF NOT public.can_access_institution_blood_bank(p_hospital_id) THEN
    RAISE EXCEPTION 'Not authorized for this institution''s blood bank';
  END IF;

  -- Insert the donation.
  INSERT INTO public.blood_donations (
    hospital_id, donor_id, blood_type, component_type,
    units_collected, screening_status, screening_notes,
    expiry_date, collected_by
  ) VALUES (
    p_hospital_id, p_donor_id, p_blood_type, p_component_type,
    p_units_collected, p_screening_status, p_screening_notes,
    p_expiry_date, COALESCE(p_collected_by, auth.uid())
  ) RETURNING id INTO v_donation_id;

  -- Add screened units to inventory atomically.
  IF p_screening_status = 'passed' THEN
    INSERT INTO public.blood_bank_inventory (
      hospital_id, blood_type, component_type,
      units_available, expiry_date
    ) VALUES (
      p_hospital_id, p_blood_type, p_component_type,
      p_units_collected, p_expiry_date
    ) RETURNING id INTO v_inventory_id;

    UPDATE public.blood_donations
    SET inventory_id = v_inventory_id
    WHERE id = v_donation_id;
  END IF;

  -- The AFTER INSERT trigger updates the donor's last_donation_date.
  RETURN v_donation_id;
END;
$$;
