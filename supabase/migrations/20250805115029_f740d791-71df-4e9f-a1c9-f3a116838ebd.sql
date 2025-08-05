-- Fix database function security by setting search_path
-- Update existing functions to have proper search_path

-- First, update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient'::user_role)
  );
  RETURN NEW;
END;
$function$;

-- Add session timeout management
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on sessions table
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.user_sessions  
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can manage sessions" ON public.user_sessions
FOR ALL USING (true);

-- Two-Factor Authentication setup
CREATE TABLE IF NOT EXISTS public.user_two_factor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  secret TEXT NOT NULL,
  backup_codes TEXT[] NOT NULL,
  enabled BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on 2FA table
ALTER TABLE public.user_two_factor ENABLE ROW LEVEL SECURITY;

-- Create policies for 2FA
CREATE POLICY "Users can manage their own 2FA" ON public.user_two_factor
FOR ALL USING (auth.uid() = user_id);

-- Enhanced medical records with comprehensive structure
CREATE TABLE IF NOT EXISTS public.comprehensive_medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES auth.users(id),
  record_type TEXT NOT NULL CHECK (record_type IN ('diagnosis', 'treatment', 'lab_result', 'imaging', 'procedure', 'medication', 'allergy', 'vital_signs', 'vaccination')),
  title TEXT NOT NULL,
  description TEXT,
  clinical_data JSONB,
  attachments TEXT[],
  visit_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_private BOOLEAN DEFAULT false,
  severity_level TEXT CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'chronic', 'under_treatment'))
);

-- Enable RLS on comprehensive medical records
ALTER TABLE public.comprehensive_medical_records ENABLE ROW LEVEL SECURITY;

-- Create policies for comprehensive medical records
CREATE POLICY "Patients can view their own medical records" ON public.comprehensive_medical_records
FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert their own medical records" ON public.comprehensive_medical_records
FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their own medical records" ON public.comprehensive_medical_records
FOR UPDATE USING (auth.uid() = patient_id);

CREATE POLICY "Providers can view their patients' medical records" ON public.comprehensive_medical_records
FOR SELECT USING (
  auth.uid() = provider_id OR 
  EXISTS (
    SELECT 1 FROM appointments a 
    WHERE a.patient_id = comprehensive_medical_records.patient_id 
    AND a.provider_id = auth.uid()
  )
);

CREATE POLICY "Providers can create medical records for their patients" ON public.comprehensive_medical_records
FOR INSERT WITH CHECK (
  auth.uid() = provider_id AND
  EXISTS (
    SELECT 1 FROM appointments a 
    WHERE a.patient_id = comprehensive_medical_records.patient_id 
    AND a.provider_id = auth.uid()
  )
);

-- Enhanced prescription management
CREATE TABLE IF NOT EXISTS public.comprehensive_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id),
  pharmacy_id UUID REFERENCES healthcare_institutions(id),
  medication_name TEXT NOT NULL,
  generic_name TEXT,
  dosage TEXT NOT NULL,
  strength TEXT,
  quantity INTEGER NOT NULL,
  refills_remaining INTEGER DEFAULT 0,
  instructions TEXT NOT NULL,
  indication TEXT,
  duration_days INTEGER,
  prescribed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'partially_filled', 'cancelled', 'expired')),
  digital_signature TEXT,
  prescription_number TEXT UNIQUE,
  is_controlled_substance BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generate prescription number trigger
CREATE OR REPLACE FUNCTION generate_prescription_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.prescription_number = 'RX' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_prescription_number
  BEFORE INSERT ON public.comprehensive_prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION generate_prescription_number();

-- Enable RLS on comprehensive prescriptions
ALTER TABLE public.comprehensive_prescriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for comprehensive prescriptions
CREATE POLICY "Patients can view their own prescriptions" ON public.comprehensive_prescriptions
FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Providers can manage prescriptions for their patients" ON public.comprehensive_prescriptions
FOR ALL USING (auth.uid() = provider_id);

CREATE POLICY "Pharmacies can view and update assigned prescriptions" ON public.comprehensive_prescriptions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM healthcare_institutions hi
    WHERE hi.id = comprehensive_prescriptions.pharmacy_id 
    AND hi.admin_id = auth.uid()
  )
);

CREATE POLICY "Pharmacies can update prescription status" ON public.comprehensive_prescriptions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM healthcare_institutions hi
    WHERE hi.id = comprehensive_prescriptions.pharmacy_id 
    AND hi.admin_id = auth.uid()
  )
);

-- Insurance verification system
CREATE TABLE IF NOT EXISTS public.insurance_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insurance_info_id UUID REFERENCES insurance_information(id),
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'denied', 'expired')),
  coverage_details JSONB,
  copay_amount NUMERIC,
  deductible_remaining NUMERIC,
  coverage_percentage NUMERIC,
  pre_authorization_required BOOLEAN DEFAULT false,
  verification_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date DATE,
  verification_notes TEXT,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on insurance verifications
ALTER TABLE public.insurance_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for insurance verifications
CREATE POLICY "Patients can view their own insurance verifications" ON public.insurance_verifications
FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Healthcare providers can view patient insurance verifications" ON public.insurance_verifications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM appointments a 
    WHERE a.patient_id = insurance_verifications.patient_id 
    AND a.provider_id = auth.uid()
  )
);

CREATE POLICY "Admin staff can manage insurance verifications" ON public.insurance_verifications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'health_personnel')
  )
);

-- Emergency protocols and contacts system
CREATE TABLE IF NOT EXISTS public.emergency_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_type TEXT NOT NULL CHECK (protocol_type IN ('medical_emergency', 'psychiatric_emergency', 'allergic_reaction', 'medication_overdose', 'cardiac_event', 'custom')),
  condition_description TEXT NOT NULL,
  emergency_instructions TEXT NOT NULL,
  medications_to_avoid TEXT[],
  emergency_medications TEXT[],
  special_considerations TEXT,
  emergency_contact_ids UUID[],
  healthcare_provider_contact TEXT,
  is_active BOOLEAN DEFAULT true,
  priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on emergency protocols
ALTER TABLE public.emergency_protocols ENABLE ROW LEVEL SECURITY;

-- Create policies for emergency protocols
CREATE POLICY "Patients can manage their own emergency protocols" ON public.emergency_protocols
FOR ALL USING (auth.uid() = patient_id);

CREATE POLICY "Emergency responders can view emergency protocols" ON public.emergency_protocols
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'health_personnel'
  )
);

-- Comprehensive health metrics tracking
CREATE TABLE IF NOT EXISTS public.comprehensive_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_category TEXT NOT NULL CHECK (metric_category IN ('vital_signs', 'laboratory', 'physical_assessment', 'mental_health', 'lifestyle', 'symptom_tracking')),
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  reference_range_min NUMERIC,
  reference_range_max NUMERIC,
  status TEXT CHECK (status IN ('normal', 'abnormal', 'critical', 'needs_attention')),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by UUID REFERENCES auth.users(id),
  device_used TEXT,
  notes TEXT,
  is_patient_entered BOOLEAN DEFAULT true,
  trend_direction TEXT CHECK (trend_direction IN ('improving', 'stable', 'declining', 'fluctuating')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on comprehensive health metrics
ALTER TABLE public.comprehensive_health_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for comprehensive health metrics
CREATE POLICY "Users can manage their own health metrics" ON public.comprehensive_health_metrics
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Healthcare providers can view patient health metrics" ON public.comprehensive_health_metrics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM appointments a 
    WHERE a.patient_id = comprehensive_health_metrics.user_id 
    AND a.provider_id = auth.uid()
  )
);

-- Create updated_at triggers
CREATE TRIGGER update_user_two_factor_updated_at
  BEFORE UPDATE ON public.user_two_factor
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_comprehensive_medical_records_updated_at
  BEFORE UPDATE ON public.comprehensive_medical_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_comprehensive_prescriptions_updated_at
  BEFORE UPDATE ON public.comprehensive_prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_insurance_verifications_updated_at
  BEFORE UPDATE ON public.insurance_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_emergency_protocols_updated_at
  BEFORE UPDATE ON public.emergency_protocols
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();