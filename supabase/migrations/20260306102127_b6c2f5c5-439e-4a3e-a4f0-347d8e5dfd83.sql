
-- 1. VITAL SIGNS: Replace overly permissive policy with appointment-based access
DROP POLICY IF EXISTS "Healthcare providers can view patient vital signs" ON vital_signs;
CREATE POLICY "Providers with active appointments can view vital signs"
  ON vital_signs FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = vital_signs.user_id
        AND a.provider_id = auth.uid()
        AND a.status IN ('scheduled', 'confirmed', 'in_progress', 'completed')
        AND a.date >= (CURRENT_DATE - INTERVAL '90 days')
    )
  );

-- 2. COMPREHENSIVE MEDICAL RECORDS: Restrict provider access to recent active appointments
DROP POLICY IF EXISTS "Providers can view their patients' medical records" ON comprehensive_medical_records;
CREATE POLICY "Providers with recent appointments can view medical records"
  ON comprehensive_medical_records FOR SELECT TO authenticated
  USING (
    auth.uid() = patient_id
    OR auth.uid() = provider_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = comprehensive_medical_records.patient_id
        AND a.provider_id = auth.uid()
        AND a.status IN ('scheduled', 'confirmed', 'in_progress', 'completed')
        AND a.date >= (CURRENT_DATE - INTERVAL '180 days')
    )
  );

-- 3. COMPREHENSIVE HEALTH METRICS: Restrict to recent appointments
DROP POLICY IF EXISTS "Healthcare providers can view patient health metrics" ON comprehensive_health_metrics;
CREATE POLICY "Providers with recent appointments can view health metrics"
  ON comprehensive_health_metrics FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = comprehensive_health_metrics.user_id
        AND a.provider_id = auth.uid()
        AND a.status IN ('scheduled', 'confirmed', 'in_progress', 'completed')
        AND a.date >= (CURRENT_DATE - INTERVAL '90 days')
    )
  );

-- 4. MEDICATION ALERTS: Restrict to recent appointments
DROP POLICY IF EXISTS "Healthcare providers can view patient medication alerts" ON medication_alerts;
CREATE POLICY "Providers with recent appointments can view medication alerts"
  ON medication_alerts FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = medication_alerts.user_id
        AND a.provider_id = auth.uid()
        AND a.status IN ('scheduled', 'confirmed', 'in_progress', 'completed')
        AND a.date >= (CURRENT_DATE - INTERVAL '90 days')
    )
  );

-- 5. EMERGENCY CONTACTS: Restrict to assigned providers only (not all health_personnel)
DROP POLICY IF EXISTS "Emergency contacts restricted access" ON emergency_contacts;
CREATE POLICY "Emergency contacts restricted to assigned providers"
  ON emergency_contacts FOR SELECT TO authenticated
  USING (
    auth.uid() = patient_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = emergency_contacts.patient_id
        AND a.provider_id = auth.uid()
        AND a.status IN ('scheduled', 'confirmed', 'in_progress')
    )
    OR EXISTS (
      SELECT 1 FROM emergency_events ee
      JOIN appointments a ON a.patient_id = ee.patient_id AND a.provider_id = auth.uid()
      WHERE ee.patient_id = emergency_contacts.patient_id
        AND ee.status = 'active'
        AND ee.created_at > (now() - INTERVAL '24 hours')
    )
  );

-- 6. EMERGENCY EVENTS: Restrict to assigned providers
DROP POLICY IF EXISTS "Emergency events restricted access" ON emergency_events;
CREATE POLICY "Emergency events restricted to assigned providers"
  ON emergency_events FOR SELECT TO authenticated
  USING (
    auth.uid() = patient_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = emergency_events.patient_id
        AND a.provider_id = auth.uid()
        AND a.status IN ('scheduled', 'confirmed', 'in_progress')
    )
  );

-- 7. PROFILES: Remove duplicate/overly broad SELECT policies, keep only tight ones
DROP POLICY IF EXISTS "Connected providers can view patient basic info only" ON profiles;
DROP POLICY IF EXISTS "Connected view limited info" ON profiles;
DROP POLICY IF EXISTS "Institution colleagues view basics" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile only" ON profiles;
DROP POLICY IF EXISTS "Users view own profile only" ON profiles;

-- Recreate consolidated profile SELECT policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Approved connections can view limited profile"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_connections uc
      WHERE ((uc.patient_id = profiles.id AND uc.provider_id = auth.uid())
          OR (uc.provider_id = profiles.id AND uc.patient_id = auth.uid()))
        AND uc.status = 'approved'
    )
  );

CREATE POLICY "Active institution colleagues can view profile"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM institution_staff is1
      JOIN institution_staff is2 ON is1.institution_id = is2.institution_id
      WHERE is1.provider_id = auth.uid()
        AND is2.provider_id = profiles.id
        AND is1.is_active = true
        AND is2.is_active = true
    )
  );
