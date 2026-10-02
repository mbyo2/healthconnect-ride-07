-- Fix: provider-recorded vitals must not fail on the gamification streak trigger.
--
-- The AFTER INSERT trigger on public.vital_signs calls update_user_streak(),
-- which RAISED 'Cannot update streak for other users' whenever NEW.user_id
-- (the patient) differed from auth.uid() (the nurse/doctor recording the
-- vitals). That exception rolled back the entire clinical INSERT, so nurses
-- could not save vitals at all (proven live 2026-10-02).
--
-- Streaks are a patient self-logging gamification feature. When a provider
-- records vitals for a patient, the streak simply does not increment — but
-- the clinical save must succeed. Change the hard exception into a silent
-- skip (RETURN NEW) for non-self inserts.

CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    -- Only update streaks for self-logged activity. Provider-recorded vitals
    -- (or metrics) for another user skip the streak silently instead of
    -- raising — the clinical write must never fail because of gamification.
    IF NEW.user_id != auth.uid() AND COALESCE(auth.jwt() ->> 'role', '') != 'service_role' THEN
        RETURN NEW;
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
