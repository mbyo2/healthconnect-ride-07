-- Add missing finance_manager role to enums (code references it but DB never had it)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance_manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'finance_manager';
