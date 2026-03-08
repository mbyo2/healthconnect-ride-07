
-- 1. Add missing values to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'doctor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'nurse';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pharmacist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lab_technician';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'radiologist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lab';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
