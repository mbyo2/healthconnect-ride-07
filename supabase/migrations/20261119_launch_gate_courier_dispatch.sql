-- Launch gate 2026-11-19 (Doc'O Clock): C1 — pharmacy courier dispatch was
-- impossible live. The 2026-10-10 courier system migration
-- (20261010_courier_delivery_system.sql) never landed on the live database:
-- its delivery_tracking columns (courier_id, pickup_lat/lng, dropoff_lat/lng,
-- dispatched_at, estimated_arrival) and its dispatch RPCs
-- (dispatch_nearest_courier, assign_courier_to_delivery) are all absent live,
-- while the client (src/components/delivery/AutoDispatch.tsx, mounted by
-- PharmacyDeliveryTracking for pending deliveries) calls exactly those RPCs
-- and reads exactly those columns. Every dispatch attempt failed.
--
-- This migration completes the original design against the CURRENT live
-- schema (couriers now uses current_latitude/current_longitude NUMERIC and
-- carries pharmacy_id + verification_status; delivery_tracking is the board's
-- table, distinct from the delivery_orders stack). Additive only: both tables
-- were empty at apply time.
-- assign_courier_to_delivery is caller-guarded (institution admin/staff of
-- the order's pharmacy, or platform admin) and claims the courier atomically
-- so two dispatches cannot take the same rider.

alter table public.delivery_tracking
  add column if not exists courier_id uuid references public.couriers(id) on delete set null,
  add column if not exists pickup_lat double precision,
  add column if not exists pickup_lng double precision,
  add column if not exists dropoff_lat double precision,
  add column if not exists dropoff_lng double precision,
  add column if not exists dispatched_at timestamptz,
  add column if not exists estimated_arrival timestamptz;

create or replace function public.dispatch_nearest_courier(
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_institution_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_courier_id uuid;
begin
  select c.id into v_courier_id
  from public.couriers c
  where c.is_active
    and c.is_available
    and c.verification_status = 'verified'
    and c.current_latitude is not null
    and c.current_longitude is not null
    and (p_institution_id is null
         or c.institution_id = p_institution_id
         or c.pharmacy_id = p_institution_id
         or (c.institution_id is null and c.pharmacy_id is null))
  order by (
    6371 * acos(
      least(1.0, greatest(-1.0,
        cos(radians(p_pickup_lat)) * cos(radians(c.current_latitude::double precision)) *
        cos(radians(c.current_longitude::double precision) - radians(p_pickup_lng)) +
        sin(radians(p_pickup_lat)) * sin(radians(c.current_latitude::double precision))
      ))
    )
  ), c.rating desc nulls last
  limit 1;

  return v_courier_id;
end;
$$;

create or replace function public.assign_courier_to_delivery(
  p_delivery_id uuid,
  p_courier_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pharmacy_id uuid;
begin
  select o.pharmacy_id into v_pharmacy_id
  from public.delivery_tracking dt
  join public.orders o on o.id = dt.order_id
  where dt.id = p_delivery_id;

  if v_pharmacy_id is null then
    raise exception 'Delivery not found or has no pharmacy';
  end if;

  if not (public.user_affiliated_with_institution(v_pharmacy_id)
          or public.has_role(auth.uid(), 'admin'::app_role)) then
    raise exception 'Only staff of this pharmacy can dispatch its deliveries'
      using errcode = '42501';
  end if;

  -- Claim the courier only if still available (prevents double-dispatch).
  update public.couriers
  set is_available = false, updated_at = now()
  where id = p_courier_id and is_available and is_active;

  if not found then
    raise exception 'Courier % is no longer available', p_courier_id;
  end if;

  update public.delivery_tracking
  set courier_id = p_courier_id,
      status = 'assigned',
      dispatched_at = now(),
      updated_at = now()
  where id = p_delivery_id and status = 'pending' and courier_id is null;

  if not found then
    raise exception 'Delivery is not awaiting dispatch';
  end if;
end;
$$;

revoke all on function public.dispatch_nearest_courier(double precision, double precision, uuid) from public;
grant execute on function public.dispatch_nearest_courier(double precision, double precision, uuid) to authenticated;
revoke all on function public.assign_courier_to_delivery(uuid, uuid) from public;
grant execute on function public.assign_courier_to_delivery(uuid, uuid) to authenticated;

comment on function public.dispatch_nearest_courier is 'Automated dispatch: nearest available verified courier by Haversine distance. Completed at launch gate 2026-11-19.';
comment on function public.assign_courier_to_delivery is 'Atomic courier claim + delivery assignment for the pharmacy tracking board. Launch gate 2026-11-19.';
