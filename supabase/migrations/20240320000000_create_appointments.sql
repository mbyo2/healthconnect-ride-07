create table if not exists public.appointments (
    id uuid default gen_random_uuid() primary key,
    patient_id uuid references auth.users(id) on delete cascade not null,
    provider_id uuid references auth.users(id) on delete cascade not null,
    date date not null,
    time text not null,
    status text not null default 'scheduled',
    type text not null,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table public.appointments enable row level security;

-- Patients can view their own appointments
create policy "Users can view own appointments"
    on appointments for select
    using (auth.uid() = patient_id);

-- Providers can view appointments where they are the provider
create policy "Providers can view their appointments"
    on appointments for select
    using (auth.uid() = provider_id);

-- Patients can create appointments
create policy "Users can create appointments"
    on appointments for insert
    with check (auth.uid() = patient_id);

-- Patients can update their own appointments
create policy "Users can update own appointments"
    on appointments for update
    using (auth.uid() = patient_id);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger appointments_handle_updated_at
    before update on public.appointments
    for each row
    execute function public.handle_updated_at();