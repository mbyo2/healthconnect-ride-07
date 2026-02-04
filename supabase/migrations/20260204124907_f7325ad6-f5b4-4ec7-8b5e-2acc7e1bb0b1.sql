-- Create helper function to check if caller is service_role
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
$$;

-- Fix overly permissive system policies with service_role checks
-- 1. audit_logs
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (public.is_service_role() OR auth.uid() IS NOT NULL);

-- 2. security_audit_log (has two duplicate policies)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "System can insert security logs" ON public.security_audit_log;
CREATE POLICY "Service role can insert security logs"
ON public.security_audit_log FOR INSERT
WITH CHECK (public.is_service_role() OR auth.uid() IS NOT NULL);

-- 3. fraud_alerts
DROP POLICY IF EXISTS "System can insert fraud alerts" ON public.fraud_alerts;
CREATE POLICY "Service role can insert fraud alerts"
ON public.fraud_alerts FOR INSERT
WITH CHECK (public.is_service_role());

-- 4. sms_logs
DROP POLICY IF EXISTS "System can insert SMS logs" ON public.sms_logs;
CREATE POLICY "Service role can insert SMS logs"
ON public.sms_logs FOR INSERT
WITH CHECK (public.is_service_role());

-- 5. mobile_money_payments - linked via payment_id (service role only for system)
DROP POLICY IF EXISTS "System can manage mobile money payments" ON public.mobile_money_payments;
CREATE POLICY "Service role can manage mobile money payments"
ON public.mobile_money_payments FOR ALL
USING (
  public.is_service_role() OR 
  EXISTS (SELECT 1 FROM public.payments p WHERE p.id = payment_id AND p.patient_id = auth.uid())
);

-- 6. order_items - restrict to service_role and order owners (orders uses patient_id)
DROP POLICY IF EXISTS "System can manage order items" ON public.order_items;
CREATE POLICY "Service role can manage order items"
ON public.order_items FOR ALL
USING (public.is_service_role() OR EXISTS (
  SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.patient_id = auth.uid()
));

-- 7. user_sessions - restrict to service_role and session owners
DROP POLICY IF EXISTS "System can manage sessions" ON public.user_sessions;
CREATE POLICY "Service role can manage sessions"
ON public.user_sessions FOR ALL
USING (public.is_service_role() OR auth.uid() = user_id);

-- 8. notifications - fix INSERT policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications or service role"
ON public.notifications FOR INSERT
WITH CHECK (public.is_service_role() OR auth.uid() = user_id);

-- Add RLS policies for tables with RLS enabled but no policies
-- hospital_beds
CREATE POLICY "Staff can view hospital beds"
ON public.hospital_beds FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'health_personnel') OR
  public.is_institution_staff_member(hospital_id)
);

CREATE POLICY "Staff can manage hospital beds"
ON public.hospital_beds FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.is_institution_admin(hospital_id) OR
  public.is_institution_staff_member(hospital_id)
);

-- hospital_departments
CREATE POLICY "Staff can view hospital departments"
ON public.hospital_departments FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'health_personnel') OR
  public.is_institution_staff_member(hospital_id)
);

CREATE POLICY "Admins can manage hospital departments"
ON public.hospital_departments FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.is_institution_admin(hospital_id)
);

-- pharmacy_suppliers
CREATE POLICY "Pharmacy staff can view suppliers"
ON public.pharmacy_suppliers FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'pharmacy') OR
  public.is_institution_staff_member(pharmacy_id)
);

CREATE POLICY "Pharmacy admins can manage suppliers"
ON public.pharmacy_suppliers FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.is_institution_admin(pharmacy_id)
);

-- Fix functions missing search_path
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    UPDATE ai_chat_conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity)
    VALUES (NEW.user_id, 1, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET 
        current_streak = CASE
            WHEN user_streaks.last_activity::date = CURRENT_DATE - INTERVAL '1 day' THEN user_streaks.current_streak + 1
            WHEN user_streaks.last_activity::date = CURRENT_DATE THEN user_streaks.current_streak
            ELSE 1
        END,
        longest_streak = GREATEST(
            user_streaks.longest_streak,
            CASE
                WHEN user_streaks.last_activity::date = CURRENT_DATE - INTERVAL '1 day' THEN user_streaks.current_streak + 1
                ELSE 1
            END
        ),
        last_activity = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_generate_conversation_title()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    IF NEW.title IS NULL THEN
        SELECT SUBSTRING(content, 1, 50) INTO NEW.title
        FROM ai_chat_messages
        WHERE conversation_id = NEW.id
        AND role = 'user'
        ORDER BY created_at
        LIMIT 1;
        
        IF NEW.title IS NULL THEN
            NEW.title := 'New Conversation';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;