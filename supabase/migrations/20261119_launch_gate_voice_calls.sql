-- Launch gate 2026-11-19 (Doc'O Clock):
-- D1: the in-app call client writes status='cancelled' when the caller hangs
-- up before the callee answers (useVoiceCall writes a "Call cancelled" thread
-- summary), but the live voice_calls status CHECK did not include 'cancelled',
-- so those updates failed with 400 and the call row stayed 'ringing' forever.
-- Add 'cancelled' to the allowed statuses.
-- Grant hygiene: voice_calls was created with the platform default ACL, which
-- left anon with the full privilege set (incl. TRUNCATE, which bypasses RLS)
-- and authenticated with TRUNCATE/REFERENCES/TRIGGER. RLS policies are
-- participant-scoped; align the table ACL with the fleet standard
-- (authenticated: select/insert/update/delete governed by RLS; anon: none).

alter table public.voice_calls drop constraint voice_calls_status_check;
alter table public.voice_calls add constraint voice_calls_status_check
  check (status = any (array['ringing','accepted','ended','declined','missed','failed','cancelled']));

revoke all privileges on public.voice_calls from anon;
revoke truncate, references, trigger on public.voice_calls from authenticated;
