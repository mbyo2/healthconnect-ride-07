# WhatsApp reminders via Meta Cloud API — setup guide

Doc'O Clock sends appointment reminders and lab-result alerts on WhatsApp
**directly through Meta's Cloud API** — no middleman (BSP) markup.
The code is done (`send-messages` drains `message_queue` via Meta first for
the `whatsapp` channel; `whatsapp-webhook` records delivery). Activation
needs a Meta business app + two approved templates + three secrets.
One-time, about 15–20 minutes.

## What it costs

- API access: **free** (no license, setup, or hosting fee; direct connection).
- Test phase: **free** — Meta's test number sends to up to 5 verified
  recipient numbers at no cost, no payment method required.
- Production: per **delivered** template message, utility category =
  the cheapest tier. African rates are roughly **US$0.004–0.010 per
  delivered reminder** (Kenya $0.0040, Nigeria $0.0101); the exact Zambia
  rate appears in Meta's rate card when the business account is created.
  Failed messages are not billed. Replies from patients inside the
  24-hour service window: first 1,000 service messages/month free.

## Step 1 — Create the Meta app (user's Meta account)

1. Go to developers.facebook.com → My Apps → Create App → type **Business**,
   name it "Doc'O Clock".
2. In the app dashboard, add the **WhatsApp** product → Set up.
3. WhatsApp → API Setup: Meta gives you a **test phone number** plus a
   temporary access token. Add your own phone as a verified recipient and
   send the test message — this proves the pipe end-to-end for free.
4. For production: add the real business number (a number NOT currently
   registered on the WhatsApp mobile app; a dedicated SIM is typical),
   complete business verification for Mabvuto Banda Science, Information
   Technical Consultancy, and create a **permanent** access token
   (Meta Business Settings → Users → System Users → generate token with
   `whatsapp_business_messaging` permission).

## Step 2 — Create these two templates (WhatsApp Manager → Message templates)

Category: **Utility** for both. Language: English.

### Template 1 — name: `appointment_reminder`
Body:
> Hello {{1}}, this is a reminder from {{2}}: your appointment is on {{3}} at {{4}}. Reply to this message if you need to reschedule.

Params: 1 = patient first name, 2 = facility (or doctor), 3 = date, 4 = time.

### Template 2 — name: `lab_result_ready`
Body:
> Hello {{1}}, your lab results are ready at {{2}}. Please check the Doc'O Clock app or visit the facility to collect them.

Params: 1 = patient first name, 2 = facility.

Utility templates are usually approved within minutes to a few hours.

## Step 3 — Secrets (Supabase Dashboard → Edge Functions → Secrets)

| Secret | Value |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Permanent system-user token from Step 1 |
| `WHATSAPP_PHONE_NUMBER_ID` | The number's Phone Number ID (API Setup page — NOT the number itself) |
| `WHATSAPP_VERIFY_TOKEN` | Any string you invent; used again in Step 4 |
| `WHATSAPP_APP_SECRET` | App secret (App Settings → Basic) — enables webhook signature checks |

## Step 4 — Webhook (delivery receipts)

In the Meta app → WhatsApp → Configuration → Webhook:
- Callback URL: `https://tthzcijscedgxjfnfnky.supabase.co/functions/v1/whatsapp-webhook`
- Verify token: the same `WHATSAPP_VERIFY_TOKEN` from Step 3
- Subscribe to the **messages** field.

Delivered/failed receipts then update each queued message automatically.

## Step 5 — Deploy the two functions

`send-messages` and `whatsapp-webhook` live in `supabase/functions/` in the
repo. Deploy via the Supabase Dashboard (Edge Functions → Deploy a new
function → paste the code) or `supabase functions deploy send-messages
whatsapp-webhook` with a project access token.

## How sending works after activation

- Every booking queues a WhatsApp confirmation + reminder(s) at the
  patient's chosen lead times (24h default) into `message_queue`.
- `send-messages` should be invoked on a schedule (e.g. every 5 minutes via
  pg_cron or an external cron hitting the function with the cron secret).
- WhatsApp tries Meta first; Africa's Talking and Twilio remain as
  automatic fallbacks if their keys are ever added.
- SMS stays parked until its own provider keys exist — patients who
  explicitly opted into SMS in their notification preferences still queue
  SMS rows; everyone else is WhatsApp-only.
