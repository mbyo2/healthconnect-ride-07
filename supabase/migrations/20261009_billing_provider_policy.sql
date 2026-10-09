-- Allow providers to manage invoices at their institution
-- Providers need to create invoices, mark paid, and generate receipts

CREATE POLICY "Providers manage institution invoices"
  ON public.billing_invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.institution_staff s
      WHERE s.provider_id = auth.uid()
      AND s.institution_id = billing_invoices.institution_id
      AND s.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.institution_staff s
      WHERE s.provider_id = auth.uid()
      AND s.institution_id = billing_invoices.institution_id
      AND s.is_active = true
    )
  );
