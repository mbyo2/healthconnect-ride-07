-- Row Level Security (RLS) Policies for Advanced Features
-- Run this after the main migration

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_alerts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- BADGES - Public read, admin write
-- =====================================================

CREATE POLICY "Badges are viewable by everyone"
    ON public.badges FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert badges"
    ON public.badges FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- USER BADGES - Users can view their own
-- =====================================================

CREATE POLICY "Users can view their own badges"
    ON public.user_badges FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges"
    ON public.user_badges FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- ACHIEVEMENTS - Users can view and update their own
-- =====================================================

CREATE POLICY "Users can view their own achievements"
    ON public.achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
    ON public.achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements"
    ON public.achievements FOR UPDATE
    USING (auth.uid() = user_id);

-- =====================================================
-- USER STREAKS - Users can view and update their own
-- =====================================================

CREATE POLICY "Users can view their own streaks"
    ON public.user_streaks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
    ON public.user_streaks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
    ON public.user_streaks FOR UPDATE
    USING (auth.uid() = user_id);

-- =====================================================
-- USER EVENTS - Users can insert, admins can view all
-- =====================================================

CREATE POLICY "Users can insert their own events"
    ON public.user_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own events"
    ON public.user_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all events"
    ON public.user_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- IOT DEVICES - Users manage their own devices
-- =====================================================

CREATE POLICY "Users can view their own devices"
    ON public.iot_devices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices"
    ON public.iot_devices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices"
    ON public.iot_devices FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices"
    ON public.iot_devices FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- VITAL SIGNS - Users manage their own data
-- =====================================================

CREATE POLICY "Users can view their own vital signs"
    ON public.vital_signs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vital signs"
    ON public.vital_signs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Healthcare providers can view patient vital signs"
    ON public.vital_signs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('health_personnel', 'admin')
        )
    );

-- =====================================================
-- HEALTH METRICS - Users manage their own data
-- =====================================================

CREATE POLICY "Users can view their own health metrics"
    ON public.health_metrics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own health metrics"
    ON public.health_metrics FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health metrics"
    ON public.health_metrics FOR UPDATE
    USING (auth.uid() = user_id);

-- =====================================================
-- DEVICE ALERTS - Users view their device alerts
-- =====================================================

CREATE POLICY "Users can view alerts from their devices"
    ON public.device_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.iot_devices
            WHERE iot_devices.id = device_alerts.device_id
            AND iot_devices.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their device alerts"
    ON public.device_alerts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.iot_devices
            WHERE iot_devices.id = device_alerts.device_id
            AND iot_devices.user_id = auth.uid()
        )
    );

-- =====================================================
-- FUNCTIONS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger to update streak on health metrics insert
CREATE TRIGGER trigger_update_streak_on_health_metrics
    AFTER INSERT ON public.health_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_user_streak();

-- Trigger to update streak on vital signs insert
CREATE TRIGGER trigger_update_streak_on_vital_signs
    AFTER INSERT ON public.vital_signs
    FOR EACH ROW
    EXECUTE FUNCTION update_user_streak();
