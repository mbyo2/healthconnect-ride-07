drop policy if exists "Authenticated read provider locations" on public.provider_locations;
drop policy if exists "Authenticated users can view provider locations" on public.provider_locations;
create policy "Authenticated read verified provider locations"
on public.provider_locations for select to authenticated
using (exists (select 1 from public.profiles p where p.id = provider_id and p.is_verified = true));

drop policy if exists "Authenticated read provider availability" on public.provider_availability;
drop policy if exists "Authenticated users can read provider availability" on public.provider_availability;
create policy "Authenticated read verified provider availability"
on public.provider_availability for select to authenticated
using (exists (select 1 from public.profiles p where p.id = provider_id and p.is_verified = true));