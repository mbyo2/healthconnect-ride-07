-- HealthConnect Advanced Features Database Schema
-- Run this migration in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- GAMIFICATION TABLES
-- =====================================================

-- Badges table
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    category TEXT NOT NULL CHECK (category IN ('onboarding', 'health', 'social', 'achievement', 'milestone')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User badges (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL CHECK (achievement_type IN ('first_login', 'profile_complete', 'first_appointment', 'health_streak', 'community_helper')),
    progress INTEGER DEFAULT 0,
    target INTEGER DEFAULT 100,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User streaks table
CREATE TABLE IF NOT EXISTS public.user_streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ANALYTICS TABLES
-- =====================================================

-- User events table for analytics
CREATE TABLE IF NOT EXISTS public.user_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'button_click', 'form_submit', 'onboarding_start', 'onboarding_complete', 'appointment_booked', 'appointment_cancelled', 'profile_updated', 'search_performed', 'feature_used', 'error_occurred')),
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON public.user_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON public.user_events(event_type);

-- =====================================================
-- IOT TABLES
-- =====================================================

-- IoT devices table
CREATE TABLE IF NOT EXISTS public.iot_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL CHECK (device_type IN ('smartwatch', 'fitness_tracker', 'blood_pressure_monitor', 'glucose_meter', 'pulse_oximeter', 'thermometer', 'weight_scale', 'ecg_monitor')),
    device_id TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    firmware_version TEXT,
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vital signs table
CREATE TABLE IF NOT EXISTS public.vital_signs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.iot_devices(id) ON DELETE SET NULL,
    heart_rate INTEGER CHECK (heart_rate > 0 AND heart_rate < 300),
    blood_pressure_systolic INTEGER CHECK (blood_pressure_systolic > 0 AND blood_pressure_systolic < 300),
    blood_pressure_diastolic INTEGER CHECK (blood_pressure_diastolic > 0 AND blood_pressure_diastolic < 200),
    temperature DECIMAL(4,1) CHECK (temperature > 30 AND temperature < 45),
    oxygen_saturation INTEGER CHECK (oxygen_saturation >= 0 AND oxygen_saturation <= 100),
    respiratory_rate INTEGER CHECK (respiratory_rate > 0 AND respiratory_rate < 100),
    blood_glucose DECIMAL(5,1),
    weight DECIMAL(5,1),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health metrics table
CREATE TABLE IF NOT EXISTS public.health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    steps INTEGER DEFAULT 0,
    calories_burned INTEGER DEFAULT 0,
    distance DECIMAL(6,2) DEFAULT 0,
    active_minutes INTEGER DEFAULT 0,
    sleep_hours DECIMAL(4,1),
    water_intake DECIMAL(5,1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Device alerts table
CREATE TABLE IF NOT EXISTS public.device_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES public.iot_devices(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('abnormal_reading', 'low_battery', 'connection_lost', 'threshold_exceeded', 'device_malfunction')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vital_signs_user_id ON public.vital_signs(user_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded_at ON public.vital_signs(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_date ON public.health_metrics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_iot_devices_user_id ON public.iot_devices(user_id);

-- =====================================================
-- SEED DATA - Predefined Badges
-- =====================================================

INSERT INTO public.badges (name, description, category) VALUES
    ('Newcomer', 'Completed your profile setup', 'onboarding'),
    ('First Step', 'Booked your first appointment', 'health'),
    ('Health Champion', 'Logged health data for 7 consecutive days', 'achievement'),
    ('Community Star', 'Helped 5 community members', 'social'),
    ('Century', 'Completed 100 health activities', 'milestone'),
    ('Early Bird', 'Logged in before 6 AM', 'achievement'),
    ('Night Owl', 'Logged health data after 10 PM', 'achievement'),
    ('Consistency King', '30-day health tracking streak', 'achievement'),
    ('Wellness Warrior', 'Completed 10 video consultations', 'health'),
    ('Data Driven', 'Connected 3 or more IoT devices', 'milestone')
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.badges IS 'Predefined badges that users can earn';
COMMENT ON TABLE public.user_badges IS 'Tracks which badges each user has earned';
COMMENT ON TABLE public.achievements IS 'User progress towards various achievements';
COMMENT ON TABLE public.user_streaks IS 'Tracks user activity streaks';
COMMENT ON TABLE public.user_events IS 'Analytics events for tracking user behavior';
COMMENT ON TABLE public.iot_devices IS 'IoT devices connected to user accounts';
COMMENT ON TABLE public.vital_signs IS 'Vital signs measurements from devices';
COMMENT ON TABLE public.health_metrics IS 'Daily health metrics aggregated data';
COMMENT ON TABLE public.device_alerts IS 'Alerts generated by IoT devices';
