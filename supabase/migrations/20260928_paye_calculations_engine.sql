-- Record which tax engine produced each PAYE calculation so statutory vs
-- custom-slab results are never confused. Idempotent.
-- RUN VIA: Supabase Dashboard -> SQL Editor (or db query --linked).

alter table public.paye_calculations
  add column if not exists engine text not null default 'institution slabs';

comment on column public.paye_calculations.engine is
  'Either institution slabs (custom bands) or zra-statutory (2024/25 bands via the verified calculator).';
