-- Create emergency events table for tracking emergency situations
CREATE TABLE public.emergency_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude NUMERIC,
  longitude NUMERIC,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.emergency_events ENABLE ROW LEVEL SECURITY;

-- Create policies for emergency events
CREATE POLICY "Users can insert their own emergency events" 
ON public.emergency_events 
FOR INSERT 
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Users can view their own emergency events" 
ON public.emergency_events 
FOR SELECT 
USING (auth.uid() = patient_id);

CREATE POLICY "Users can update their own emergency events" 
ON public.emergency_events 
FOR UPDATE 
USING (auth.uid() = patient_id);

-- Create delivery zones table for pharmacy deliveries
CREATE TABLE public.delivery_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL,
  zone_name TEXT NOT NULL,
  coordinates JSONB NOT NULL, -- Store polygon coordinates
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  max_delivery_time INTEGER NOT NULL DEFAULT 60, -- minutes
  restrictions TEXT[], -- medication types that cannot be delivered
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Create policies for delivery zones
CREATE POLICY "Anyone can view active delivery zones" 
ON public.delivery_zones 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Pharmacies can manage their delivery zones" 
ON public.delivery_zones 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM healthcare_institutions hi 
  WHERE hi.id = delivery_zones.pharmacy_id 
  AND hi.admin_id = auth.uid()
));

-- Create pharmacy staff table for better management
CREATE TABLE public.pharmacy_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'pharmacist',
  is_active BOOLEAN NOT NULL DEFAULT true,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pharmacy_id, user_id)
);

-- Enable RLS
ALTER TABLE public.pharmacy_staff ENABLE ROW LEVEL SECURITY;

-- Create policies for pharmacy staff
CREATE POLICY "Staff can view their pharmacy details" 
ON public.pharmacy_staff 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Pharmacy admins can manage staff" 
ON public.pharmacy_staff 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM healthcare_institutions hi 
  WHERE hi.id = pharmacy_staff.pharmacy_id 
  AND hi.admin_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_emergency_events_updated_at
BEFORE UPDATE ON public.emergency_events
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();