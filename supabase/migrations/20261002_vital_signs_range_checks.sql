-- Add server-side physiological range validation for vital_signs.
--
-- The nurse vitals form (and any API client) previously relied solely on HTML
-- min/max attributes. A bypassed or buggy client could insert clinically
-- impossible values (e.g. heart_rate 99999), which is a patient-safety issue
-- for a safety-critical app. These CHECK constraints enforce plausible
-- ranges at the database level. All columns are nullable (partial recordings
-- are valid); CHECK constraints pass on NULL, so only present values are
-- validated.
--
-- Ranges chosen to admit all plausible human values including extremes
-- (neonatal tachycardia, severe hypo/hypertension, fever, etc.) while
-- rejecting obvious garbage.

-- Heart rate: 20–250 bpm
ALTER TABLE public.vital_signs
  ADD CONSTRAINT chk_vital_signs_heart_rate
  CHECK (heart_rate IS NULL OR (heart_rate >= 20 AND heart_rate <= 250));

-- Blood pressure systolic: 50–300 mmHg
ALTER TABLE public.vital_signs
  ADD CONSTRAINT chk_vital_signs_bp_sys
  CHECK (blood_pressure_systolic IS NULL OR (blood_pressure_systolic >= 50 AND blood_pressure_systolic <= 300));

-- Blood pressure diastolic: 30–200 mmHg
ALTER TABLE public.vital_signs
  ADD CONSTRAINT chk_vital_signs_bp_dia
  CHECK (blood_pressure_diastolic IS NULL OR (blood_pressure_diastolic >= 30 AND blood_pressure_diastolic <= 200));

-- Diastolic must not exceed systolic when both present
ALTER TABLE public.vital_signs
  ADD CONSTRAINT chk_vital_signs_bp_order
  CHECK (
    blood_pressure_systolic IS NULL OR blood_pressure_diastolic IS NULL
    OR blood_pressure_diastolic <= blood_pressure_systolic
  );

-- Temperature: 30–45 °C
ALTER TABLE public.vital_signs
  ADD CONSTRAINT chk_vital_signs_temperature
  CHECK (temperature IS NULL OR (temperature >= 30 AND temperature <= 45));

-- Oxygen saturation: 50–100 %
ALTER TABLE public.vital_signs
  ADD CONSTRAINT chk_vital_signs_spo2
  CHECK (oxygen_saturation IS NULL OR (oxygen_saturation >= 50 AND oxygen_saturation <= 100));

-- Respiratory rate: 5–60 /min
ALTER TABLE public.vital_signs
  ADD CONSTRAINT chk_vital_signs_resp_rate
  CHECK (respiratory_rate IS NULL OR (respiratory_rate >= 5 AND respiratory_rate <= 60));

-- Blood glucose: 1–40 mmol/L
ALTER TABLE public.vital_signs
  ADD CONSTRAINT chk_vital_signs_glucose
  CHECK (blood_glucose IS NULL OR (blood_glucose >= 1 AND blood_glucose <= 40));

-- Weight: 1–400 kg
ALTER TABLE public.vital_signs
  ADD CONSTRAINT chk_vital_signs_weight
  CHECK (weight IS NULL OR (weight >= 1 AND weight <= 400));
