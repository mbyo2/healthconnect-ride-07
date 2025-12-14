
-- Policies for institution_applications
-- Admins can view all applications
DROP POLICY IF EXISTS "Admins can view all applications" ON public.institution_applications;
CREATE POLICY "Admins can view all applications" ON public.institution_applications
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Admins can update all applications
DROP POLICY IF EXISTS "Admins can update all applications" ON public.institution_applications;
CREATE POLICY "Admins can update all applications" ON public.institution_applications
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Policies for audit_logs
-- Admins can view all audit logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );
