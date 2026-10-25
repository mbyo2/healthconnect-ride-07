-- Provider-types sweep 2026-10-25: dental charting never persisted.
-- DentistWorkflow kept the FDI tooth chart in component state only — no
-- table, no patient link; every chart vanished on navigation and no
-- patient could ever see it. (Long-standing P2 remainder: "dentist chart
-- persistence".) Create the chart store the workflow now writes to:
-- one chart per (patient, dental provider), chart = { tooth: condition }.
CREATE TABLE IF NOT EXISTS public.dental_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chart jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (patient_id, provider_id)
);

ALTER TABLE public.dental_charts ENABLE ROW LEVEL SECURITY;

-- Dental providers (dentist + dental therapist — the charting charter)
-- manage charts they own; nobody else writes.
CREATE POLICY "Dental providers manage own charts"
  ON public.dental_charts
  FOR ALL
  USING ((provider_id = auth.uid()) AND EXISTS ( SELECT 1
     FROM user_roles ur
    WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['dentist'::app_role, 'dental_therapist'::app_role])))))
  WITH CHECK ((provider_id = auth.uid()) AND EXISTS ( SELECT 1
     FROM user_roles ur
    WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['dentist'::app_role, 'dental_therapist'::app_role])))));

-- Patients read their own charts.
CREATE POLICY "Patients read own dental charts"
  ON public.dental_charts
  FOR SELECT
  USING (patient_id = auth.uid());

CREATE TRIGGER update_dental_charts_updated_at
  BEFORE UPDATE ON public.dental_charts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dental_charts TO authenticated;
GRANT ALL ON public.dental_charts TO service_role;
