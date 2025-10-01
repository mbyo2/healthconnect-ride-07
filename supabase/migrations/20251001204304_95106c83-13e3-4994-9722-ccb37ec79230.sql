-- Phase 1: Critical Security Fixes

-- 1. Create security_audit_log table (referenced in code but missing)
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on security_audit_log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Super admins can view all security logs
CREATE POLICY "Super admins can view all security logs"
ON public.security_audit_log
FOR SELECT
USING (public.is_super_admin());

-- Users can view their own security logs
CREATE POLICY "Users can view their own security logs"
ON public.security_audit_log
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert security logs
CREATE POLICY "System can insert security logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);

-- 2. Fix RLS recursion for healthcare_institutions and institution_staff
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Institution staff can view full institution details" ON public.healthcare_institutions;
DROP POLICY IF EXISTS "Staff can update institution" ON public.healthcare_institutions;
DROP POLICY IF EXISTS "Institution admins can view their staff" ON public.institution_staff;

-- Create security definer function to check institution staff
CREATE OR REPLACE FUNCTION public.is_institution_staff_member(institution_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM institution_staff 
    WHERE institution_staff.institution_id = $1 
    AND institution_staff.provider_id = auth.uid() 
    AND institution_staff.is_active = true
  );
$$;

-- Create security definer function to check institution admin
CREATE OR REPLACE FUNCTION public.is_institution_admin(institution_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM healthcare_institutions 
    WHERE healthcare_institutions.id = $1 
    AND healthcare_institutions.admin_id = auth.uid()
  );
$$;

-- Recreate institution policies without recursion
CREATE POLICY "Institution staff can view full institution details"
ON public.healthcare_institutions
FOR SELECT
USING (public.is_institution_staff_member(id));

CREATE POLICY "Institution admins can update institution"
ON public.healthcare_institutions
FOR UPDATE
USING (public.is_institution_admin(id));

-- Recreate staff policies without recursion
CREATE POLICY "Institution admins can view their staff"
ON public.institution_staff
FOR SELECT
USING (public.is_institution_admin(institution_id));

CREATE POLICY "Institution admins can manage their staff"
ON public.institution_staff
FOR ALL
USING (public.is_institution_admin(institution_id));

-- 3. Secure commission_settings table
-- Drop the public read policy
DROP POLICY IF EXISTS "Users can view commission settings" ON public.commission_settings;

-- Only super admins can view commission settings
CREATE POLICY "Only super admins can view commission settings"
ON public.commission_settings
FOR SELECT
USING (public.is_super_admin());

-- Add index for performance on security_audit_log
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON public.security_audit_log(event_type);