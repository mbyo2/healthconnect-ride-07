-- Marketplace delivery pipeline: every placed order opens a tracking row so
-- the pharmacy portal (and the patient) have something real to follow.
-- Does NOT touch money: totals triggers are left exactly as they are.
-- Idempotent. RUN VIA: SQL Editor (or db query --linked).

-- 1) Record the chosen delivery zone on the order (informational only;
--    any fee is settled on dispatch, never added to the order total here).
alter table public.orders
  add column if not exists delivery_zone_id uuid;

-- 2) Auto-create the tracking row on order placement (SECURITY DEFINER so
--    patient RLS on delivery_tracking — select-only — is not a blocker).
create or replace function public.trg_create_delivery_tracking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.delivery_tracking (order_id, status)
  values (new.id, 'pending')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_orders_create_delivery_tracking on public.orders;
create trigger trg_orders_create_delivery_tracking
  after insert on public.orders
  for each row execute function public.trg_create_delivery_tracking();

-- 3) Pharmacy staff of the order's institution may advance tracking status.
drop policy if exists "Pharmacy staff can update own deliveries" on public.delivery_tracking;
create policy "Pharmacy staff can update own deliveries"
  on public.delivery_tracking for update
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      join public.institution_personnel ip
        on ip.institution_id = o.pharmacy_id
      where o.id = delivery_tracking.order_id
        and ip.user_id = auth.uid()
        and ip.status is distinct from 'inactive'
    )
  );
