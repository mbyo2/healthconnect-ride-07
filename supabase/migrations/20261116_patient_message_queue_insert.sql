-- Patient flows (doc swarm 2026-11-16, group 1): message_queue is the
-- WhatsApp/SMS outbox. The client (queueSmsMessage in
-- src/utils/sms-reminder-service.ts, called by BookingModal after every
-- booking and by queueAppointmentReminders / queueLabResultAlert) inserts
-- as the signed-in patient — but the table carried only a SELECT policy
-- ("Patients view own messages"), so every patient-side insert failed
-- with 42501 and no WhatsApp appointment reminder was ever queued
-- (proven live 2026-11-16: POST /message_queue as a patient -> 403).
-- The send-messages edge function drains the queue with the service role,
-- so this is the only missing link in the WhatsApp-first path.
--
-- Scoped INSERT: a patient may queue only rows addressed to themselves
-- (patient_id = auth.uid()). No other column is trusted from the client;
-- the drain function owns delivery state.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'message_queue'
      AND policyname = 'Patients queue own messages'
  ) THEN
    CREATE POLICY "Patients queue own messages"
      ON public.message_queue FOR INSERT TO authenticated
      WITH CHECK (patient_id = auth.uid());
  END IF;
END $$;
