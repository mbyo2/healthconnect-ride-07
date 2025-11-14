-- Add timestamp column to security_events table
ALTER TABLE security_events 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create fraud_alerts table
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  risk_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create health_reminders table
CREATE TABLE IF NOT EXISTS health_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
  custom_schedule JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_triggered TIMESTAMP WITH TIME ZONE,
  next_trigger TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medication_alerts table
CREATE TABLE IF NOT EXISTS medication_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  times TEXT[] DEFAULT ARRAY[]::TEXT[],
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  adherence_tracking BOOLEAN NOT NULL DEFAULT true,
  missed_doses INTEGER NOT NULL DEFAULT 0,
  total_doses INTEGER NOT NULL DEFAULT 0,
  last_taken TIMESTAMP WITH TIME ZONE,
  side_effects_to_watch TEXT[] DEFAULT ARRAY[]::TEXT[],
  interactions TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reminder_notifications table
CREATE TABLE IF NOT EXISTS reminder_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fraud_alerts
CREATE POLICY "Users can view their own fraud alerts"
ON fraud_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all fraud alerts"
ON fraud_alerts FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert fraud alerts"
ON fraud_alerts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update fraud alerts"
ON fraud_alerts FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for health_reminders
CREATE POLICY "Users can manage their own health reminders"
ON health_reminders FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Healthcare providers can view patient reminders"
ON health_reminders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.patient_id = health_reminders.user_id
    AND a.provider_id = auth.uid()
  )
);

-- RLS Policies for medication_alerts
CREATE POLICY "Users can manage their own medication alerts"
ON medication_alerts FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Healthcare providers can view patient medication alerts"
ON medication_alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.patient_id = medication_alerts.user_id
    AND a.provider_id = auth.uid()
  )
);

-- RLS Policies for reminder_notifications
CREATE POLICY "Users can manage their own reminder notifications"
ON reminder_notifications FOR ALL
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user_id ON fraud_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_resolved ON fraud_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_created_at ON fraud_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_health_reminders_user_id ON health_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_health_reminders_next_trigger ON health_reminders(next_trigger);
CREATE INDEX IF NOT EXISTS idx_health_reminders_is_active ON health_reminders(is_active);

CREATE INDEX IF NOT EXISTS idx_medication_alerts_user_id ON medication_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_alerts_is_active ON medication_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_medication_alerts_end_date ON medication_alerts(end_date);

CREATE INDEX IF NOT EXISTS idx_reminder_notifications_reminder_id ON reminder_notifications(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_user_id ON reminder_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_acknowledged ON reminder_notifications(acknowledged);

-- Add index on security_events timestamp
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);

-- Create trigger to update updated_at on fraud_alerts
CREATE OR REPLACE FUNCTION update_fraud_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fraud_alerts_updated_at
BEFORE UPDATE ON fraud_alerts
FOR EACH ROW
EXECUTE FUNCTION update_fraud_alerts_updated_at();

-- Create trigger to update updated_at on health_reminders
CREATE OR REPLACE FUNCTION update_health_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_health_reminders_updated_at
BEFORE UPDATE ON health_reminders
FOR EACH ROW
EXECUTE FUNCTION update_health_reminders_updated_at();

-- Create trigger to update updated_at on medication_alerts
CREATE OR REPLACE FUNCTION update_medication_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_medication_alerts_updated_at
BEFORE UPDATE ON medication_alerts
FOR EACH ROW
EXECUTE FUNCTION update_medication_alerts_updated_at();