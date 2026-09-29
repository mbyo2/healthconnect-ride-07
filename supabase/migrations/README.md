# Migration authoring rules

Every migration in this folder changes the live production database.
Follow these rules so a migration never fails against the schema that is
actually there.

## 1. Read the live schema first — not your memory of it

Migrations are history, not the current truth. Before writing a migration
that touches an existing table, confirm the real column types in the live
project (dashboard Table Editor, or `SELECT pg_typeof(col) FROM tbl LIMIT 1`).

Real example (2026-09-29): ad-hoc SQL written as if role columns were
`text` failed with `42804` because the live schema uses two different
enum types:

- `public.user_roles.role` is `app_role`
- `public.profiles.role` is `user_role`

The fix is an explicit cast at every write site:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<uuid>', 'doctor'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles
SET role = 'doctor'::user_role
WHERE id = '<uuid>';
```

Never rely on implicit text→enum coercion in migrations or QA scripts.

## 2. Know what is already implemented before you add

- Check for existing triggers, functions, RLS policies, and indexes on
  the tables you touch (`pg_trigger`, `pg_policies`, `pg_indexes`).
  A new trigger can double-fire an existing one; a new policy can silently
  widen or narrow access.
- Check existing edge functions before changing their callers: required
  headers (e.g. `medgemma-chat` returns 401 without a valid Authorization
  JWT), expected body shape, and required secrets (`OPENROUTER_API_KEY`,
  `HF_TOKEN`). The functions are deployed separately from migrations —
  a migration cannot set their secrets.

## 3. Every migration is idempotent

Use `IF NOT EXISTS` / `OR REPLACE` / `ON CONFLICT DO NOTHING` /
`DROP ... IF EXISTS` before `CREATE`. A migration must be safe to
re-run; the live database may already contain the object from a manual
fix.

## 4. Every production change gets a matching migration file

If you fix something directly in the dashboard during an incident or QA,
add a migration that documents/captures it (idempotent — no-op if the
live object already exists). The repo must always be able to rebuild the
live schema.

## 5. Never break the build

Run `npx tsc --noEmit` and `npm run build` before every push. Verify the
deployed result afterwards — 'pushed' is not 'live and correct'.
