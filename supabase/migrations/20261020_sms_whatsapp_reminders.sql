-- SMS/WhatsApp Reminders System
-- Zambia-critical: reaches patients without smartphones/data
-- Providers: Africa's Talking (primary, best Zambia coverage) + Twilio (fallback)
-- Date: 2026-10-20

-- Patient notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Channels
  sms_enabled BOOLEAN DEFAULT TRUE,
  whatsapp_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  -- Reminder types
  appointment_reminders BOOLEAN DEFAULT TRUE,
  appointment_reminder_hours INTEGER DEFAULT 24, -- hours before appointment
  second_reminder_hours INTEGER DEFAULT 2, -- optional second reminder
  medication_reminders BOOLEAN DEFAULT FALSE,
  lab_result_alerts BOOLEAN DEFAULT TRUE,
  refill_reminders BOOLEAN DEFAULT TRUE,
  -- Contact (overrides profile phone if set)
  preferred_phone TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id)
);

-- Message queue (outbox pattern - edge function drains this)
CREATE TABLE IF NOT EXISTS public.message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Recipient
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  -- Message
  template_key TEXT, -- e.g., 'appointment_reminder', 'lab_result_ready'
  message_body TEXT NOT NULL,
  -- Context
  institution_id UUID REFERENCES public.healthcare_institutions(id),
  appointment_id UUID,
  reference_type TEXT, -- 'appointment', 'lab_result', 'prescription', 'general'
  reference_id UUID,
  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  -- Delivery
  provider TEXT, -- 'africas_talking', 'twilio'
  provider_message_id TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Institution reminder settings
CREATE TABLE IF NOT EXISTS public.institution_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  sms_enabled BOOLEAN DEFAULT TRUE,
  whatsapp_enabled BOOLEAN DEFAULT TRUE,
  -- Templates (with {patient_name}, {date}, {time}, {doctor}, {facility} placeholders)
  appointment_template TEXT DEFAULT 'Hello {patient_name}, reminder: you have an appointment at {facility} on {date} at {time} with {doctor}. Reply STOP to opt out.',
  lab_result_template TEXT DEFAULT 'Hello {patient_name}, your lab results are ready at {facility}. Please visit or check the Doc''O Clock app.',
  refill_template TEXT DEFAULT 'Hello {patient_name}, your prescription refill is ready for pickup at {facility}.',
  -- Sender ID (alphanumeric, max 11 chars for SMS)
  sms_sender_id TEXT DEFAULT 'DOCOCLOCK',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id)
);

-- RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage own notification prefs"
  ON public.notification_preferences FOR ALL
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients view own messages"
  ON public.message_queue FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Institution staff view institution messages"
  ON public.message_queue FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_staff
      WHERE provider_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Institution admins manage reminder settings"
  ON public.institution_reminder_settings FOR ALL
  USING (public.is_institution_admin(institution_id))
  WITH CHECK (public.is_institution_admin(institution_id));

CREATE POLICY "Institution staff view reminder settings"
  ON public.institution_reminder_settings FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_staff
      WHERE provider_id = auth.uid() AND is_active = TRUE
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_queue_status ON public.message_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_message_queue_patient ON public.message_queue(patient_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_patient ON public.notification_preferences(patient_id);
