-- Allow pharmacists to claim and dispense unassigned prescriptions
-- The SELECT policy (20261005_pharmacist_unassigned_rx_visibility) lets
-- pharmacists SEE unassigned prescriptions, but the UPDATE RLS still
-- blocks them from claiming (setting pharmacy_id) or dispensing
-- (status -> filled). The app showed a false "success" toast while the
-- DB row never changed. This UPDATE policy closes the gap.

CREATE POLICY "Pharmacists can claim and dispense unassigned prescriptions"
ON public.comprehensive_prescriptions
FOR UPDATE
USING (
  pharmacy_id IS NULL
  AND status IN ('pending', 'assigned')
  AND NOT public.is_provider_suspended(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('pharmacist', 'pharmacy_technologist')
  )
)
WITH CHECK (
  -- Pharmacist may claim it (set their institution) or dispense it.
  -- They cannot reassign to a random pharmacy or alter clinical fields
  -- beyond fulfillment status; the app layer controls field edits.
  NOT public.is_provider_suspended(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('pharmacist', 'pharmacy_technologist')
  )
);

COMMENT ON POLICY "Pharmacists can claim and dispense unassigned prescriptions" ON public.comprehensive_prescriptions IS
  'Lets pharmacy staff claim (assign pharmacy_id) and dispense unassigned prescriptions. Fixes false-success toast where UPDATE was silently blocked.';
