-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    provider_id UUID, -- No FK constraint to allow for system IDs like 0000...
    service_id TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method TEXT,
    invoice_number TEXT,
    external_payment_id TEXT,
    payment_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    failed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Columns from status workflows migration (adding them here since previous migration skipped them)
    status_history JSONB DEFAULT '[]'::jsonb,
    refund_amount DECIMAL(10,2),
    refund_reason TEXT
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments 
    FOR SELECT TO authenticated 
    USING (auth.uid() = patient_id OR auth.uid() = provider_id);

-- Allow users to initiate payments (insert)
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
CREATE POLICY "Users can insert their own payments" ON public.payments 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = patient_id);

-- Service role policies (implicit, but good to document or explicit if needed)
-- Edge functions use service_role key which bypasses RLS, so no specific policy needed for update.
