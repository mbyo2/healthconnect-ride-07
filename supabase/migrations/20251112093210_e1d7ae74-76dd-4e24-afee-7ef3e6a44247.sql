-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;

-- Create audit_logs table if not exists
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  category TEXT NOT NULL CHECK (category IN ('authentication', 'authorization', 'data_access', 'data_modification', 'system', 'security', 'payment')),
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'partial')),
  session_id TEXT,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create security_events table if not exists
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  event_data JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns to user_sessions if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_sessions' AND column_name = 'location') THEN
    ALTER TABLE public.user_sessions ADD COLUMN location TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_sessions' AND column_name = 'device_info') THEN
    ALTER TABLE public.user_sessions ADD COLUMN device_info TEXT;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for security_events
DROP POLICY IF EXISTS "Admins can manage security events" ON public.security_events;
DROP POLICY IF EXISTS "Users can view their own security events" ON public.security_events;

CREATE POLICY "Admins can manage security events"
  ON public.security_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own security events"
  ON public.security_events FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for user_sessions
CREATE POLICY "Admins can view all sessions"
  ON public.user_sessions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions"
  ON public.user_sessions FOR ALL
  USING (auth.uid() = user_id);

-- Create indexes for performance (IF NOT EXISTS not supported, so we use DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_user_id') THEN
    CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_timestamp') THEN
    CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_category') THEN
    CREATE INDEX idx_audit_logs_category ON public.audit_logs(category);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_security_events_user_id') THEN
    CREATE INDEX idx_security_events_user_id ON public.security_events(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_security_events_resolved') THEN
    CREATE INDEX idx_security_events_resolved ON public.security_events(resolved);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sessions_user_id') THEN
    CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sessions_active') THEN
    CREATE INDEX idx_user_sessions_active ON public.user_sessions(is_active);
  END IF;
END $$;