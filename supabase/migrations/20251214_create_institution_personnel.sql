
-- Create institution_personnel table
CREATE TABLE IF NOT EXISTS public.institution_personnel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('doctor', 'nurse', 'admin', 'staff', 'technician')) DEFAULT 'staff',
    status TEXT CHECK (status IN ('active', 'inactive', 'pending')) DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(institution_id, user_id)
);

-- Enable RLS
ALTER TABLE public.institution_personnel ENABLE ROW LEVEL SECURITY;

-- Policies
-- Institution admins can view their personnel
DROP POLICY IF EXISTS "Institution admins can view their personnel" ON public.institution_personnel;
CREATE POLICY "Institution admins can view their personnel" ON public.institution_personnel
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.healthcare_institutions
            WHERE id = institution_personnel.institution_id
            AND admin_id = auth.uid()
        )
    );

-- Institution admins can manage their personnel
DROP POLICY IF EXISTS "Institution admins can manage their personnel" ON public.institution_personnel;
CREATE POLICY "Institution admins can manage their personnel" ON public.institution_personnel
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.healthcare_institutions
            WHERE id = institution_personnel.institution_id
            AND admin_id = auth.uid()
        )
    );

-- Personnel can view their own records
DROP POLICY IF EXISTS "Personnel can view their own records" ON public.institution_personnel;
CREATE POLICY "Personnel can view their own records" ON public.institution_personnel
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
