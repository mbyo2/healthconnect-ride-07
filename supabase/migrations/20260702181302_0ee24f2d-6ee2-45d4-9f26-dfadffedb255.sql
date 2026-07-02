
-- video_consultations: drop overly-permissive insert
DROP POLICY IF EXISTS "Users can insert video consultations" ON public.video_consultations;

-- reviews: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Authenticated users can view reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (true);

-- form_submissions: allow users to submit their own forms
CREATE POLICY "Users can submit own forms"
  ON public.form_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- pharmacy_inventory: allow pharmacy admins/staff to manage
CREATE POLICY "Pharmacy admins can insert inventory"
  ON public.pharmacy_inventory FOR INSERT TO authenticated
  WITH CHECK (
    public.is_institution_admin(pharmacy_id)
    OR public.is_institution_staff_member(pharmacy_id)
  );
CREATE POLICY "Pharmacy admins can update inventory"
  ON public.pharmacy_inventory FOR UPDATE TO authenticated
  USING (
    public.is_institution_admin(pharmacy_id)
    OR public.is_institution_staff_member(pharmacy_id)
  )
  WITH CHECK (
    public.is_institution_admin(pharmacy_id)
    OR public.is_institution_staff_member(pharmacy_id)
  );
CREATE POLICY "Pharmacy admins can delete inventory"
  ON public.pharmacy_inventory FOR DELETE TO authenticated
  USING (
    public.is_institution_admin(pharmacy_id)
    OR public.is_institution_staff_member(pharmacy_id)
  );
