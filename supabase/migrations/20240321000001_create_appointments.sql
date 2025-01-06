-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
    type VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Add RLS policies for appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own appointments"
    ON public.appointments
    FOR SELECT
    USING (
        auth.uid() = patient_id 
        OR 
        auth.uid() = provider_id
    );

CREATE POLICY "Patients can create appointments"
    ON public.appointments
    FOR INSERT
    WITH CHECK (
        auth.uid() = patient_id
    );

CREATE POLICY "Users can update their own appointments"
    ON public.appointments
    FOR UPDATE
    USING (
        auth.uid() = patient_id 
        OR 
        auth.uid() = provider_id
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER handle_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();