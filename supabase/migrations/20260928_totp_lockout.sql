-- TOTP brute-force protection: per-user failure counter + temporary lockout.
-- Idempotent. RUN VIA: Supabase Dashboard -> SQL Editor (or db query --linked).

alter table public.user_two_factor
  add column if not exists failed_attempts integer not null default 0;

alter table public.user_two_factor
  add column if not exists locked_until timestamptz;
