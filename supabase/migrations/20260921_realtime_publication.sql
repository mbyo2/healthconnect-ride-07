-- ============================================================================
-- Realtime publication for safety-critical tables.
-- The app subscribes to postgres_changes on these tables (chat, queues,
-- emergency, admissions, beds, labs, video visits, referrals, billing…).
-- Without this publication those subscriptions silently receive NOTHING,
-- so this migration is what makes "realtime" actually real.
-- Safe to re-run (each ADD is guarded).
-- ============================================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    -- communication
    'messages',
    'notifications',
    'hospital_notifications',
    -- scheduling & flow
    'appointments',
    'queue_tokens',
    'video_consultations',
    -- emergency (lives depend on these arriving instantly)
    'emergency_cases',
    'emergency_events',
    'ambulance_dispatches',
    -- inpatient
    'hospital_admissions',
    'hospital_beds',
    'hospital_departments',
    -- clinical results
    'lab_tests',
    'radiology_requests',
    'comprehensive_prescriptions',
    'comprehensive_medical_records',
    'patient_allergies',
    'vital_signs',
    -- coordination
    'referrals',
    'insurance_claims',
    'hospital_billing',
    'pharmacy_sales',
    'ot_surgeries',
    'blood_bank_requests',
    'discharge_checklists',
    'triage_assessments',
    'pathologist_reviews',
    'work_orders',
    'device_alerts',
    -- money movement (dashboards stay live)
    'payments',
    'wallet_transactions',
    -- subscribed by the app but missing from the first revision —
    -- without these the channels below silently receive NOTHING
    'user_wallets', -- WalletCard balance
    'device_data_feeds', -- DeviceManagement telemetry
    'billing_invoices', -- useBillingModule
    'billing_payments', -- useBillingModule
    'hospital_inventory', -- useHospitalInventory
    'asset_register', -- useMaintenanceModule
    'iot_devices' -- useIoT device list
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END IF;
  END LOOP;
END $$;
