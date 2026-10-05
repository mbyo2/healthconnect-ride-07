-- Allow pharmacists to see unassigned prescriptions for fulfillment
-- Prescriptions created without a pharmacy_id (null) were invisible to all
-- pharmacists. This policy lets verified pharmacists/pharmacy staff view
-- pending unassigned prescriptions so they can claim and dispense them.

CREATE POLICY "Pharmacists can view unassigned prescriptions"
ON public.comprehensive_prescriptions
FOR SELECT
USING (
  pharmacy_id IS NULL
  -- Include dispensed statuses: PostgREST re-reads the row after UPDATE,
  -- and a 'filled' row must remain visible or the UPDATE reports RLS violation.
  AND status IN ('pending', 'assigned', 'processing', 'ready', 'filled', 'partially_filled', 'cancelled')
  AND NOT public.is_provider_suspended(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('pharmacist', 'pharmacy_technologist')
  )
);

COMMENT ON POLICY "Pharmacists can view unassigned prescriptions" ON public.comprehensive_prescriptions IS
  'Lets pharmacy staff see pending prescriptions not yet assigned to a pharmacy, so they can claim and dispense them.';
