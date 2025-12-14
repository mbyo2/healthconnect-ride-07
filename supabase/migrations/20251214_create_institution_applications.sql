
-- Add is_verified to healthcare_institutions
ALTER TABLE IF EXISTS public.healthcare_institutions
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Add operating_hours to healthcare_institutions if missing (used in form)
ALTER TABLE IF EXISTS public.healthcare_institutions
ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{}'::jsonb;

-- Create institution_applications table
CREATE TABLE IF NOT EXISTS public.institution_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_name TEXT NOT NULL,
    institution_type TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')) DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_notes TEXT,
    documents_complete BOOLEAN DEFAULT FALSE,
    verification_complete BOOLEAN DEFAULT FALSE,
    payment_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.institution_applications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own applications" ON public.institution_applications;
CREATE POLICY "Users can view their own applications" ON public.institution_applications
    FOR SELECT TO authenticated USING (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "Users can insert their own applications" ON public.institution_applications;
CREATE POLICY "Users can insert their own applications" ON public.institution_applications
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = applicant_id);

-- Allow updates for own application (e.g. if we add ability to edit)
DROP POLICY IF EXISTS "Users can update their own applications" ON public.institution_applications;
CREATE POLICY "Users can update their own applications" ON public.institution_applications
    FOR UPDATE TO authenticated USING (auth.uid() = applicant_id);
