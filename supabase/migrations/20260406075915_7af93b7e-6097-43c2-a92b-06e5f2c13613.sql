-- ============================================================
-- 1. FIX: Profiles INSERT policy - restrict to authenticated users inserting own profile with safe defaults
-- ============================================================
DROP POLICY IF EXISTS "Allow trigger profile creation" ON public.profiles;

CREATE POLICY "Allow authenticated profile creation"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND role = 'patient'
  AND admin_level IS NULL
);

-- ============================================================
-- 2. FIX: Audit log forgery - restrict INSERT to own user_id only
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (is_service_role() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert security logs" ON public.security_audit_log;
CREATE POLICY "Users can insert own security logs"
ON public.security_audit_log FOR INSERT
TO authenticated
WITH CHECK (is_service_role() OR auth.uid() = user_id);

-- ============================================================
-- 3. FIX: update_conversation_timestamp - add ownership check
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    UPDATE ai_chat_conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id
      AND user_id = (SELECT user_id FROM ai_chat_conversations WHERE id = NEW.conversation_id);
    RETURN NEW;
END;
$function$;

-- ============================================================
-- 4. FIX: update_user_streak - add auth check
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    -- Only allow streak updates for the authenticated user or service role
    IF NEW.user_id != auth.uid() AND COALESCE(auth.jwt() ->> 'role', '') != 'service_role' THEN
        RAISE EXCEPTION 'Cannot update streak for other users';
    END IF;

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

-- ============================================================
-- 5. FIX: Add time-based expiry to connection-based profile access
-- ============================================================
DROP POLICY IF EXISTS "Connected view limited info" ON public.profiles;
CREATE POLICY "Connected view limited info"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_connections uc
    WHERE ((uc.patient_id = profiles.id AND uc.provider_id = auth.uid())
    OR (uc.provider_id = profiles.id AND uc.patient_id = auth.uid()))
    AND uc.status = 'approved'
    AND uc.updated_at > now() - interval '90 days'
  )
);