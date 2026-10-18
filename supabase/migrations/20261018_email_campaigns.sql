-- Email marketing: bulk patient campaigns for recalls, screening reminders,
-- health tips. Respects patient opt-out.

-- Opt-out flag on profiles (patients control marketing email consent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'email_marketing_opt_out'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN email_marketing_opt_out BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  target_audience JSONB NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped_opt_out')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_institution ON public.email_campaigns(institution_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_campaign ON public.email_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_status ON public.email_campaign_recipients(status);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Uses existing SECURITY DEFINER helpers: is_institution_staff_member(institution_id).

DROP POLICY IF EXISTS "Campaign staff read" ON public.email_campaigns;
CREATE POLICY "Campaign staff read"
ON public.email_campaigns FOR SELECT TO authenticated
USING (public.is_institution_staff_member(institution_id));

DROP POLICY IF EXISTS "Campaign staff write" ON public.email_campaigns;
CREATE POLICY "Campaign staff write"
ON public.email_campaigns FOR ALL TO authenticated
USING (public.is_institution_staff_member(institution_id))
WITH CHECK (public.is_institution_staff_member(institution_id));

DROP POLICY IF EXISTS "Recipient staff read" ON public.email_campaign_recipients;
CREATE POLICY "Recipient staff read"
ON public.email_campaign_recipients FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.email_campaigns c
    WHERE c.id = email_campaign_recipients.campaign_id
      AND public.is_institution_staff_member(c.institution_id)
  )
);

-- Service role (edge functions) bypasses RLS for actual sending.

COMMENT ON TABLE public.email_campaigns IS 'Bulk patient email campaigns (recalls, screening reminders, health tips).';
COMMENT ON TABLE public.email_campaign_recipients IS 'Per-recipient delivery tracking for email campaigns.';
COMMENT ON COLUMN public.profiles.email_marketing_opt_out IS 'Patient opted out of marketing emails; campaigns must skip these patients.';
