
-- Create a public patients table without approval requirements
CREATE TABLE public.patients (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    birth_date DATE,
    gender VARCHAR(50),
    address TEXT,
    emergency_contact TEXT,
    medical_history TEXT,
    allergies TEXT,
    is_profile_complete BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Add RLS policies for patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Patients can view all patient profiles (needed for provider search)
CREATE POLICY "Patients can view patient profiles"
    ON public.patients
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Patients can update their own profile
CREATE POLICY "Patients can update their own profile"
    ON public.patients
    FOR UPDATE
    USING (auth.uid() = id);

-- Function to create patient profile on signup
CREATE OR REPLACE FUNCTION public.create_patient_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Create patient record for new users
    INSERT INTO public.patients (id, email)
    VALUES (new.id, new.email);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create patient profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created_patient
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_patient_profile();
