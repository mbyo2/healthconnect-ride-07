create table if not exists public.appointments (
    id uuid default gen_random_uuid() primary key,
    patient_id uuid references public.profiles(id) not null,
    provider_id uuid references public.profiles(id) not null,
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

create policy "Users can view their own appointments"
    on public.appointments for select
    using (
        auth.uid() = patient_id or 
        auth.uid() = provider_id
    );

create policy "Patients can create appointments"
    on public.appointments for insert
    with check (
        auth.uid() = patient_id
    );

create policy "Users can update their own appointments"
    on public.appointments for update
    using (
        auth.uid() = patient_id or 
        auth.uid() = provider_id
    );

-- Add indexes for better query performance
create index appointments_patient_id_idx on public.appointments(patient_id);
create index appointments_provider_id_idx on public.appointments(provider_id);
create index appointments_date_idx on public.appointments(date);