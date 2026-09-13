# Launch Readiness Plan — Doc' O Clock

The app builds cleanly and there are no type errors. What is left is real-money setup, messaging setup, a role-by-role workflow pass, and a short list of unfinished items.

## 1. Blockers that need something from you

These cannot be finished from inside the app.

| Item | What is needed |
|------|----------------|
| Live DPO account | Live company token + service type (the current ones are the sandbox pair). Until then no real money moves. |
| Live PayPal account | Live client ID and secret (currently sandbox). |
| Text messages (SMS) | An SMS provider account. Reminders, OTP and critical-result texts currently go nowhere. |
| Email | An email sending key. Receipts, invitations, appointment confirmations currently do not send. |
| Leaked-password protection | One toggle in the Supabase dashboard: Authentication → Providers → Password settings. |
| Login/redirect URLs | Set doc0clock.online as the site URL and allowed redirect in Supabase, so sign-in works on the live domain. |
| Domain routing | On the host: doc0clock.online as primary with no redirect; www redirects to it. |

I will ask for each credential one at a time, with instructions on where to get it, and store it securely.

## 2. Payments — finish end to end

- Switch DPO and PayPal to live mode behind a single environment flag so sandbox stays testable.
- Full test of every paying path: consultation booking, pharmacy order, wallet top-up, hospital/pharmacy subscription fee, refund.
- Confirm each payment lands as: platform fee + exactly one payee (provider or pharmacy), matching the pricing page (K30–K120 per booking, K0 to list; pharmacy K200/mo or K2,000/yr with 2.5% per order; hospitals free listing, monthly fee).
- Receipts generated and downloadable after every successful payment.
- Prepare Lenco as a third payment engine so it can become the default later.

## 3. Role-by-role workflow pass

Walk every screen for every role against the live app, complete the headline journey, fix whatever breaks, and record the result:

1. Patient — register, book, pay, video visit, prescription, results
2. Doctor / specialist — queue, notes, prescription, interaction warning, referral
3. Nurse — vitals, medication administration, rounds
4. Pharmacist — order in, dispense, stock, expiry alerts
5. Lab / pathology / radiology — order, sample, result, critical-result alert
6. Facility admin — staff, services, pricing, billing, reports
7. Solo provider — availability, bookings, earnings
8. Admin and superadmin — approvals, verification, plans, platform reports

Each role gets a pass/fail row with screenshots and no console errors left behind.

## 4. Known unfinished items to close

- Business profile form: one section of the institution form has a broken layout that needs tidying.
- Remaining hardcoded values in a handful of hospital modules to switch to live records.
- Empty-state and "do this first" guidance on any screen that still shows a dead button.
- Approval badge visible on every public listing so patients can see a facility was approved.
- Notification centre: make sure in-app, push, email and SMS all fire from the same events.
- Cleanup: remove leftover audit and status markdown files from the project root.

## 5. Pre-launch checks

- Mobile pass on phone and tablet widths for the busiest screens.
- Speed pass: first load under two seconds on the landing, dashboard and booking pages.
- Accessibility pass: labels, contrast, keyboard navigation.
- Titles, descriptions, sitemap and robots for the public pages.
- Final security scan with no unresolved findings.
- Seeded demo facility so the hospital can trial the system with realistic data.

## Suggested order

1. Payments live + messaging keys (needs your credentials)
2. Unfinished items in section 4
3. Role-by-role pass with fixes
4. Pre-launch checks, then publish

## Technical notes

- Live/sandbox switching via a `PAYMENTS_MODE` secret read in the DPO and PayPal edge functions; no code branches duplicated per provider.
- Settlement stays centralised in `_shared/settle.ts` → `process_payment_with_splits`, idempotent on the gateway reference.
- Lenco added as another adapter behind the same settle contract.
- Role pass driven headless against `http://localhost:8080` with per-role sessions, results logged in `docs/RELEASE_QA.md`.
- AI stays on the shared `_shared/ai.ts` chain (OpenRouter primary, fallbacks already wired).
