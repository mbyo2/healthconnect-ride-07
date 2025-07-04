-- Create SMS logs table for tracking messages
CREATE TABLE public.sms_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT,
  response_data JSONB,
  cost NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for SMS logs
CREATE POLICY "Users can view their own SMS logs" 
ON public.sms_logs 
FOR SELECT 
USING (auth.uid() = patient_id);

CREATE POLICY "System can insert SMS logs" 
ON public.sms_logs 
FOR INSERT 
WITH CHECK (true);

-- Create mobile money payments table for Zambian mobile money
CREATE TABLE public.mobile_money_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'mtn', 'vodacom', 'zamtel'
  phone_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_reference TEXT,
  external_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  webhook_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mobile_money_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for mobile money payments
CREATE POLICY "Users can view their own mobile money payments" 
ON public.mobile_money_payments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM payments p 
  WHERE p.id = mobile_money_payments.payment_id 
  AND (p.patient_id = auth.uid() OR p.provider_id = auth.uid())
));

CREATE POLICY "System can manage mobile money payments" 
ON public.mobile_money_payments 
FOR ALL 
USING (true);

-- Create pharmacy operating hours table
CREATE TABLE public.pharmacy_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  is_24_hours BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pharmacy_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.pharmacy_hours ENABLE ROW LEVEL SECURITY;

-- Create policies for pharmacy hours
CREATE POLICY "Anyone can view pharmacy hours" 
ON public.pharmacy_hours 
FOR SELECT 
USING (true);

CREATE POLICY "Pharmacy admins can manage their hours" 
ON public.pharmacy_hours 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM healthcare_institutions hi 
  WHERE hi.id = pharmacy_hours.pharmacy_id 
  AND hi.admin_id = auth.uid()
));