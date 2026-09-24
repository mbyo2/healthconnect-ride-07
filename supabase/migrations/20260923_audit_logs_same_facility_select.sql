-- Let institution staff view audit events initiated by colleagues of the SAME
-- facility (joins via institution_personnel). Super-admin full access and
-- own-row access policies already exist; this adds the facility-team view
-- the Institution Dashboard audit feed needs. Idempotent.

drop policy if exists "Same-facility staff can view team audit logs" on public.audit_logs;

create policy "Same-facility staff can view team audit logs"
  on public.audit_logs for select
  to authenticated
  using (
    exists (
      select 1
      from public.institution_personnel mine
      join public.institution_personnel theirs
        on theirs.institution_id = mine.institution_id
      where mine.user_id = auth.uid()
        and theirs.user_id = audit_logs.user_id
        and mine.status is distinct from 'inactive'
    )
  );
