# QA helpers (NOT migrations)

This folder holds hand-run helper scripts for the disposable QA program
(`qa9-*` / `qax4-*` accounts). **These are never applied by the migration
runner** — they are run manually in the Supabase dashboard SQL editor
against the live project during QA sweeps, and every row they touch is
deleted in the final QA cleanup.

## Gotchas learned the hard way (2026-09-29)

1. **Role columns are different enum types — always cast from text.**
   - `public.user_roles.role` is `app_role`
   - `public.profiles.role` is `user_role`
   - A bare text value fails with `42804: column "role" is of type
     app_role/user_role but expression is of type text`.
     Write `'doctor'::app_role` / `'doctor'::user_role`.
2. **Inserting into `auth.users` fires the app's real signup triggers**
   (`handle_new_user` → `profiles` row, `create_patient_profile` →
   `patients` row). A direct SQL insert produces exactly what the
   browser signup produces — safe to use when the UI route is blocked.
   Required columns: `id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at, raw_app_meta_data,
   raw_user_meta_data, is_super_admin`.
3. **Dashboard SQL editor mangles long statements.** Keep every statement
   under ~120 characters, typed in one shot in a fresh tab. For N accounts,
   run N tiny statements instead of one big CTE.
4. **Check the live schema before writing SQL.** The repo's migrations are
   history, not the current truth — confirm column types in the dashboard
   (`pg_typeof`) when a statement touches an unfamiliar table.

## Files

- `create-qa-user.sql` — insert one disposable QA auth user (patient
  signup equivalent). Replace `<QA_EMAIL>`, `<QA_FULL_NAME>`,
  `<QA_PASSWORD_HASH>` (bcrypt via `crypt('pw', gen_salt('bf'))`).
- `grant-role.sql` — grant one exact role to a QA user: canonical
  `user_roles` row + `profiles.role` mirror + `is_verified`, with the
  correct enum casts. Replace `<QA_EMAIL>` and `<ROLE>`.

## Cleanup

Final QA cleanup deletes every `qa9-*` / `qax4-*` auth user and all
dependent rows (profiles, patients, user_roles, institutions,
memberships, invitations, inventory, batches, audits, appointments,
fees), then verifies zero counts. Real data must be untouched —
every statement here scopes to the QA email pattern.
