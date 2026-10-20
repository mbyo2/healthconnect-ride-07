# Scheduled Jobs — what must be configured outside this repo

**Current state (verified 2026-10-20): no scheduled jobs are defined anywhere
in this repository.** There are no `pg_cron` schedules, no `pg_net` calls, and
no other in-repo invokers for the worker edge functions. If the configuration
below has not been done in the Supabase Dashboard, the workers below simply
never run — nothing fails loudly; messages just accumulate.

## The workers

| Function | What it does | Needed cadence | Auth |
|---|---|---|---|
| `send-messages` | Drains `message_queue`: sends queued appointment reminders and lab-result alerts, WhatsApp-first via Meta Cloud API (see `docs/whatsapp-setup.md`), then Africa's Talking / Twilio SMS fallbacks. Marks rows sent/failed. | Every 5 minutes | `x-cron-secret` header must equal the `CRON_SECRET` edge-function secret (or a valid service-role Authorization header) |
| `send-reminder` | Dispatches the 24h-before appointment reminders (in-app + push) and stamps `appointments.reminder_sent_at`. Idempotent — re-runs never double-notify. | Hourly | Same `x-cron-secret` check |

Not scheduled, by design: `send-appointment-reminder` is invoked synchronously
by the booking flow at booking time.

**Consequence of not configuring this:** booking still queues reminder rows
into `message_queue` correctly, but no WhatsApp/SMS reminder or lab alert is
ever delivered, and 24h reminders never fire.

## Activation — pick ONE route

### Route 1: pg_cron + pg_net (keeps everything inside Supabase)

1. **Extensions** — Dashboard → Database → Extensions: enable `pg_cron` and
   `pg_net`.
2. **Secret** — Dashboard → Project Settings → Edge Functions → Secrets: set
   `CRON_SECRET` to a long random value (or `supabase secrets set
   CRON_SECRET=...`). Both workers compare the `x-cron-secret` header against
   it and reject mismatches.
3. **Schedules** — Open `supabase/migrations/20261020_reminder_schedules.sql`,
   copy the two `cron.schedule(...)` statements, replace `<PROJECT_REF>` and
   `<CRON_SECRET>`, and run them in the SQL editor.
4. **Verify** — `SELECT jobname, schedule, active FROM cron.job;` shows both
   jobs; after a few minutes `cron.job_run_details` shows runs, and the Edge
   Functions logs for `send-messages` show queue drains. A quick end-to-end
   check: book an appointment as a QA user and confirm the `message_queue`
   rows move from `queued` to `sent` within ~5 minutes (once WhatsApp is
   activated per `docs/whatsapp-setup.md`).

### Route 2: Supabase Dashboard "Schedule function"

Dashboard → Edge Functions → select the function → **Schedule function**:
`send-messages` every 5 minutes, `send-reminder` hourly, each with header
`x-cron-secret: <CRON_SECRET>` (after setting the secret as in Route 1, step 2).

### Route 3: External cron (e.g. cron-job.org)

Hourly/5-minute HTTPS POSTs to
`https://<PROJECT_REF>.supabase.co/functions/v1/send-reminder` and
`.../functions/v1/send-messages` with header `x-cron-secret: <CRON_SECRET>`.
(The 2026-09-22 reminder-dispatch migration documents this option.)

## Notes

- Never commit the real `CRON_SECRET` or paste it into repo files — the
  migration file intentionally ships with placeholders only.
- The WhatsApp activation in `docs/whatsapp-setup.md` (Meta app, templates,
  `WHATSAPP_*` secrets, deploying `send-messages` + `whatsapp-webhook`) is a
  separate prerequisite: scheduling makes the drainer run, the Meta setup
  makes WhatsApp delivery succeed. SMS stays parked until Africa's Talking
  keys are added.
