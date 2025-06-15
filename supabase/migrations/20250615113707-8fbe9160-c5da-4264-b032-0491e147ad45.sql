
-- Create user connections table for manual connections
CREATE TABLE public.user_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_type TEXT NOT NULL DEFAULT 'manual' CHECK (connection_type IN ('manual', 'automatic', 'appointment_based', 'chat_based')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'blocked')),
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()),
  UNIQUE(patient_id, provider_id)
);

-- Create primary provider assignments table
CREATE TABLE public.primary_provider_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  provider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW())
);

-- Enable RLS on user connections
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- Users can view connections they are part of
CREATE POLICY "Users can view their own connections"
  ON public.user_connections
  FOR SELECT
  USING (
    auth.uid() = patient_id OR 
    auth.uid() = provider_id
  );

-- Users can create connection requests
CREATE POLICY "Users can create connection requests"
  ON public.user_connections
  FOR INSERT
  WITH CHECK (
    auth.uid() = requested_by AND
    (auth.uid() = patient_id OR auth.uid() = provider_id)
  );

-- Users can update connections they are part of
CREATE POLICY "Users can update their connections"
  ON public.user_connections
  FOR UPDATE
  USING (
    auth.uid() = patient_id OR 
    auth.uid() = provider_id
  );

-- Enable RLS on primary provider assignments
ALTER TABLE public.primary_provider_assignments ENABLE ROW LEVEL SECURITY;

-- Patients can view their own primary provider assignment
CREATE POLICY "Patients can view their primary provider"
  ON public.primary_provider_assignments
  FOR SELECT
  USING (auth.uid() = patient_id);

-- Providers can view assignments where they are the primary provider
CREATE POLICY "Providers can view their assignments"
  ON public.primary_provider_assignments
  FOR SELECT
  USING (auth.uid() = provider_id);

-- Only admins or the patient can create/update primary provider assignments
CREATE POLICY "Admins and patients can manage primary provider assignments"
  ON public.primary_provider_assignments
  FOR ALL
  USING (
    auth.uid() = patient_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (admin_level = 'admin' OR admin_level = 'superadmin')
    )
  );

-- Function to automatically create connections based on appointments
CREATE OR REPLACE FUNCTION public.create_automatic_connection()
RETURNS TRIGGER AS $$
BEGIN
  -- Create automatic connection when appointment is created
  INSERT INTO public.user_connections (
    patient_id, 
    provider_id, 
    connection_type, 
    status, 
    requested_by
  )
  VALUES (
    NEW.patient_id, 
    NEW.provider_id, 
    'automatic', 
    'approved', 
    NEW.patient_id
  )
  ON CONFLICT (patient_id, provider_id) 
  DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic connections on appointments
CREATE TRIGGER create_connection_on_appointment
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_automatic_connection();

-- Function to create connections based on video consultations
CREATE OR REPLACE FUNCTION public.create_video_connection()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_connections (
    patient_id, 
    provider_id, 
    connection_type, 
    status, 
    requested_by
  )
  VALUES (
    NEW.patient_id, 
    NEW.provider_id, 
    'automatic', 
    'approved', 
    NEW.patient_id
  )
  ON CONFLICT (patient_id, provider_id) 
  DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic connections on video consultations
CREATE TRIGGER create_connection_on_video_consultation
  AFTER INSERT ON public.video_consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_video_connection();

-- Function to create connections based on messages
CREATE OR REPLACE FUNCTION public.create_chat_connection()
RETURNS TRIGGER AS $$
DECLARE
  patient_user_id UUID;
  provider_user_id UUID;
BEGIN
  -- Determine which user is patient and which is provider
  SELECT 
    CASE WHEN p1.role = 'patient' THEN p1.id ELSE p2.id END,
    CASE WHEN p1.role = 'health_personnel' THEN p1.id ELSE p2.id END
  INTO patient_user_id, provider_user_id
  FROM profiles p1, profiles p2
  WHERE p1.id = NEW.sender_id AND p2.id = NEW.receiver_id;
  
  -- Only create connection if we have both patient and provider
  IF patient_user_id IS NOT NULL AND provider_user_id IS NOT NULL THEN
    INSERT INTO public.user_connections (
      patient_id, 
      provider_id, 
      connection_type, 
      status, 
      requested_by
    )
    VALUES (
      patient_user_id, 
      provider_user_id, 
      'chat_based', 
      'approved', 
      NEW.sender_id
    )
    ON CONFLICT (patient_id, provider_id) 
    DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic connections on messages
CREATE TRIGGER create_connection_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_chat_connection();

-- Add updated_at trigger for user_connections
CREATE TRIGGER handle_user_connections_updated_at
  BEFORE UPDATE ON public.user_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add updated_at trigger for primary_provider_assignments
CREATE TRIGGER handle_primary_provider_assignments_updated_at
  BEFORE UPDATE ON public.primary_provider_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
