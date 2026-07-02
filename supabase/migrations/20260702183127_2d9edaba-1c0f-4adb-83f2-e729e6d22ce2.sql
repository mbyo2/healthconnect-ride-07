
CREATE TYPE public.triage_urgency AS ENUM ('emergency', 'urgent', 'routine', 'self_care');

CREATE TABLE public.patient_triage_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  chief_complaint TEXT NOT NULL,
  duration TEXT,
  severity INTEGER CHECK (severity >= 0 AND severity <= 10),
  extra_notes TEXT,
  urgency public.triage_urgency NOT NULL DEFAULT 'routine',
  recommended_specialty TEXT,
  red_flags TEXT[] NOT NULL DEFAULT '{}',
  recommended_action TEXT,
  reasoning TEXT,
  model TEXT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  emergency_event_id UUID REFERENCES public.emergency_events(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'assessed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pts_patient ON public.patient_triage_sessions(patient_id, created_at DESC);
CREATE INDEX idx_pts_urgency ON public.patient_triage_sessions(urgency, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.patient_triage_sessions TO authenticated;
GRANT ALL ON public.patient_triage_sessions TO service_role;

ALTER TABLE public.patient_triage_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients read own triage sessions"
  ON public.patient_triage_sessions FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Patients create own triage sessions"
  ON public.patient_triage_sessions FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients update own triage sessions"
  ON public.patient_triage_sessions FOR UPDATE TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE TRIGGER trg_pts_updated_at
  BEFORE UPDATE ON public.patient_triage_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
