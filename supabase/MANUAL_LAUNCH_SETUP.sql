-- Run this script in the Supabase SQL editor after reviewing it.
-- It is deliberately idempotent and is not a Supabase migration because the
-- project owner is applying the database changes manually.

create table if not exists public.data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('export', 'deletion')),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'rejected')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists data_subject_requests_user_requested_at_idx
  on public.data_subject_requests (user_id, requested_at desc);

-- Avoid sending the same request repeatedly while it awaits review.
create unique index if not exists data_subject_requests_one_pending_per_type_idx
  on public.data_subject_requests (user_id, request_type)
  where status in ('pending', 'in_progress');

alter table public.data_subject_requests enable row level security;

drop policy if exists "Users can view their own data requests" on public.data_subject_requests;
create policy "Users can view their own data requests"
  on public.data_subject_requests for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own data requests" on public.data_subject_requests;
create policy "Users can create their own data requests"
  on public.data_subject_requests for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'pending');

grant select, insert on public.data_subject_requests to authenticated;

-- Emergency events contain sensitive location data. Patients may only access
-- their own events; responders/admin workflows should use a server-side role.
alter table public.emergency_events enable row level security;

drop policy if exists "Users can view their own emergency events" on public.emergency_events;
create policy "Users can view their own emergency events"
  on public.emergency_events for select to authenticated
  using ((select auth.uid()) = patient_id);

drop policy if exists "Users can create their own emergency events" on public.emergency_events;
create policy "Users can create their own emergency events"
  on public.emergency_events for insert to authenticated
  with check ((select auth.uid()) = patient_id);

drop policy if exists "Users can update their own emergency events" on public.emergency_events;
create policy "Users can update their own emergency events"
  on public.emergency_events for update to authenticated
  using ((select auth.uid()) = patient_id)
  with check ((select auth.uid()) = patient_id);

grant select, insert, update on public.emergency_events to authenticated;
