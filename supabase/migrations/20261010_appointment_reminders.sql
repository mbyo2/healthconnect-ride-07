-- Appointment reminders: tracks sent reminders to prevent duplicates
CREATE TABLE IF NOT EXISTS public.appointment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT '24h_before' CHECK (reminder_type IN ('24h_before', '1h_before', 'custom')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(appointment_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_appt_reminders_patient ON public.appointment_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_reminders_appointment ON public.appointment_reminders(appointment_id);

ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients view own reminders"
  ON public.appointment_reminders FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients create reminders"
  ON public.appointment_reminders FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Providers view reminders for their appointments"
  ON public.appointment_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_reminders.appointment_id
      AND a.provider_id = auth.uid()
    )
  );
