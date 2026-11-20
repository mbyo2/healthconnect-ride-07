-- End-of-meeting bookkeeping for video consultations (2026-11-20).
--
-- The video-consultations flow gains a real "End meeting" action
-- (end-video-consultation edge function): the provider ends the visit
-- for everyone, the Daily room is deleted, and the consultation row is
-- stamped so every participant's client can show "The meeting has
-- ended". Until now the table had no place to record who ended the
-- visit or when — status alone was flipped (or, in practice, never
-- flipped at all: visits stayed 'scheduled'/'active' forever).
--
-- Additive only: two nullable columns, no data rewritten, no policy
-- changes (clients never UPDATE this table directly — there is no
-- UPDATE policy by design; the service-role edge functions write).

ALTER TABLE public.video_consultations
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_by uuid REFERENCES public.profiles(id);

COMMENT ON COLUMN public.video_consultations.ended_at IS
  'When the meeting was ended for everyone (provider End action or the stale-visit sweep).';
COMMENT ON COLUMN public.video_consultations.ended_by IS
  'Profile id of the provider who ended the meeting; NULL when the sweep closed a stale visit.';

-- Stale-visit sweep: a visit left 'active' long past its scheduled end
-- (browser closed without ending, etc.) is closed off so lists and
-- records stay coherent. The Daily room itself already self-terminates
-- (24h exp with eject_at_room_exp), so no room cleanup is needed here.
-- Guarded so a re-run never creates a duplicate job.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'video-consultation-sweep') THEN
    PERFORM cron.schedule(
      'video-consultation-sweep',
      '17 * * * *',
      $job$
        UPDATE public.video_consultations
        SET status = 'completed',
            ended_at = COALESCE(ended_at, scheduled_end)
        WHERE status = 'active'
          AND scheduled_end < now() - interval '2 hours'
      $job$
    );
  END IF;
END $$;
