# Doc Swarm Group 4/6 — Billing & Money — Report

- Branch: `docswarm/billing` (commits `e7a5d22e`, `1bae16e7`, `dff3add9`, `4e4d5124`)
- Scope: billing + money paths, sandbox only. Live site `www.doc0clock.online` serves the
  pre-gate bundle (stale Vercel build), so client behaviour is labelled
  local-build-verified / code-verified / live-verified below.
- QA users: `swarm-billing-patient@`, `swarm-billing-admin@`, `swarm-billing-doctor@doc0clock.online`
  (creds in `~/.qa-tokens/docswarm-billing.json`, chmod 600). Purged to zero at end.
- Test fixtures: Swarm Billing Clinic (platform, `11111111-…`) + Swarm Billing OWN Clinic
  (own, `22222222-…`), 7 priced services, Hollard Health policy POL-SWB-001 (85% terms).

## Ranked findings

### 1. FOUND + FIXED (P0, live-proven) — Lenco invoice settlement never settled
- A K10 sandbox invoice collection reported `successful` at Lenco and
  `lenco_payments.status='paid'`, but settlement returned
  `{ settled: false, reason: 'payment_row_failed' }`. Nothing was credited
  anywhere (patient wallet 0.00, invoice still `sent`, balance K10, zero
  wallet transactions) and the user-facing message still said
  "Payment confirmed. Your wallet has been credited."
- Root causes (all in `supabase/functions/_shared/settle.ts`):
  1. `payments.provider_id` FKs to `profiles(id)`, but institution payees
     stored the INSTITUTION id there → 23503 on insert.
  2. `process_payment_with_splits` unconditionally inserts a
     `health_personnel` split row with `p_provider_id` (`recipient_id` NOT
     NULL), so a null provider id would fail the split too.
  3. Nothing ever booked a settled payment against its `billing_invoices`
     row, so even a successful split left the invoice `sent`.
  4. `verifyAndSettleLenco` trusted a stored `metadata.settlement.settled`
     flag, so re-verifies never retried a booking that failed once.
  5. First booking attempt passed `payment_mode='lenco'`; the column is the
     `payment_mode` enum → 22P02, silently swallowed.
- Fix (commits above; edge functions `lenco-verify-payment` + `lenco-webhook`
  redeployed live from this branch with the Management API token):
  institution payees resolve to the institution admin profile for the
  payments row and the split RPC; settled invoice payments are booked into
  `billing_payments` (idempotent on gateway reference, gateway mapped to the
  enum: lenco→`mobile_money`); the existing `trg_update_invoice_on_payment`
  then closes the invoice; a stored settled flag no longer blocks a missing
  booking; failed settlements are reported honestly and invoice payers are
  told the invoice was marked paid.
- Live proof (post-fix): the stuck K10 (ref `D0C-1794821016385-50303b56`)
  healed on re-verify — invoice `paid`, paid K10.00, balance 0;
  `billing_payments` K10 `mobile_money`; institution wallet +K8.50,
  app-owner wallet +K1.50 (15% commission); one `payments` row, 3 splits,
  repeat verify `already:true` with no double credit. A FRESH K10 invoice
  (`INV-20261116-0005`, ref `D0C-1794822309730-2c5bff4b`) settled first-try:
  invoice `paid`, institution wallet 8.50→17.00, owner wallet 18.00→19.50.
- Note: wallet top-ups were never broken (K10 top-up settled exactly once:
  wallet 0→10.00, exactly 1 credit transaction, repeat verify no double
  credit). The 2026-11-13 "K10 settled exactly once" proof was a top-up.

### 2. FOUND + FIXED (live-proven) — duplicate invoice numbers across institutions
- `generate_invoice_number()` counted same-day invoices PER INSTITUTION:
  two facilities' first invoice of the day both got `INV-20261116-0001`
  (live rows, different institutions, identical number). Also racy within
  one institution (count-then-insert, no unique constraint).
- Fix: migration `20261116_fix_invoice_number_uniqueness.sql` (advisory lock
  + platform-wide daily count, format unchanged) — applied live via docsql.
  Proof: one multi-row insert across both clinics → `INV-20261116-0003`
  and `-0004`, distinct. No unique index added (existing duplicates would
  block it; separate data repair).

### 3. VERIFIED (live) — one patient, one open bill
- Bill `INV-006B6BF4D8`, patient `e3ee64b2-…`: K150 consult + K250 lab
  (insured, Hollard 85%) → K400, insurer K340.00 / patient K60.00, claim
  filed. Appends: +K250 X-ray → K650 (552.50/97.50); +K100 → K750;
  +K200 → K950; +K300 → K1,250 (1,062.50/187.50); +10×K40 prescription →
  K1,650; +K250 lab (in-call duplicate billed once) → K1,900;
  +6×K40 partial-till prescription → K2,140; +K250 X-ray → **K2,390
  (insurer K2,031.50 / patient K358.50)**, 10 items, every unit price
  matching the institution price list, claim synced to K2,031.50.
- Repeat of each sourced line refused with `already_billed` naming the
  invoice; totals unchanged. Lab rows flip `payment_status` pending→billed.
- Second patient got a separate bill (`INV-2F2AC9BCA6`, K150) — no
  cross-patient merge. Patient caller → 403/42501; no-auth → 401.
- Till guard: RX2 4/10 paid at till (receipt `SWB-RCT-001`) → billed 6×K40
  only, `already_paid_at_till` reports paid 4 / billed 6. RX3 10/10 paid
  (receipt `SWB-RCT-002`) → fully skipped, total unchanged.
- Unpriced (K0) service: reported in `unpriced`, never billed at 0;
  unpriced-only call → clean 400. Other-institution price → clean 400
  "not on this hospital's price list".
- Tax: live `create_hospital_bill` resolves tax server-side via
  `resolve_item_tax_rate` and emits per-line `tax`/`tax_rate` (0.000 with
  no template configured); no client price/tax channel (RPC signature has
  no money parameters). Live engine matches repo migration
  `20261106151937` (tax amendment) — no repo/live drift.

### 4. VERIFIED (live) — PLATFORM vs OWN, marketplace filter
- OWN invoice via Lenco → 400 "This facility handles its own payments.
  Please pay them directly." Platform invoice → 200, collection created.
- Marketplace query as patient (the exact `UserMarketplace` filters:
  `payment_mode='platform'` + `list_in_marketplace=true`) returns exactly
  1 row: Swarm Billing Clinic. The OWN clinic (listed + verified, mode
  `own`) is excluded by both the client filters and RLS
  `public_view_institutions`. Caveat: RLS also requires `is_verified=true`,
  so an unverified platform+listed clinic is invisible to patients — that
  is the verification gate, not a bug.
- OWN copy (code-verified, local build): `Billing.tsx` shows "This facility
  handles its own payments — please pay them directly." instead of the Pay
  Online button when `payment_mode==='own'`.

### 5. VERIFIED (live) — Lenco sandbox failure paths + webhook forgery
- Insufficient funds (MTN `0962222222`) and wrong PIN (Airtel `0972222222`):
  both resolve to `failed`, no settlement, wallet stays exactly K10.00
  (sandbox takes ~60s to finalize these).
- Forged webhook direct → 401 "Invalid signature". Via relay → 200 with
  `forwarded: { doc_oclock: 401, bmaglass: 401 }`.

### 6. VERIFIED (by inspection) — deferred items
- No ART or dental auto-billing path exists: `create_hospital_bill`
  source kinds contain neither; nothing bills them implicitly. Emergency
  cases bill only via explicit `emergency_case` records. No code changes.

### 7. BLOCKED BY ENVIRONMENT (not by stale deploy) — signed-in local render
- Local build compiles (`vite build`, 1m57s) and serves (HTTP 200); the
  /auth page renders at 390px. But scripted headless Chromium in this
  sandbox cannot reach ANY external host (`ERR_TUNNEL_CONNECTION_FAILED`
  even for example.com via the egress proxy), so a signed-in local render
  could not complete. Client behaviours above are instead verified by code
  read + live JWT replay of the exact queries the components run. Needs a
  browser environment with egress for a rendered pass.

## Minor observations (not fixed)
- `verifyAndSettleLenco` settlement payload carries `payeeType`/`payeeId`/
  `platformFee`/`payeeAmount` as null: the split RPC returns
  `app_amount`/`institution_amount`, not those keys. Informational only.
- `app_owner_wallet` gained +K3.00 in sandbox fees (2× K1.50 on K20 of
  sandbox collections). Left as-is — do not adjust blindly; it mirrors
  production fee flow on sandbox money.

## Tests
- Scoped suite: 65 passed (5 files): new
  `src/test/lenco-invoice-settlement.test.ts` (12) + billing-accumulation
  (10) + billing-completeness (30) + payment-splits (8) +
  lenco-payout-ledger (5). Full suite runs at merge time per workflow.

## Census / purge
- My prefix purged to zero: 0 rows across 20 tables checked
  (hospital_billing, billing_invoices, billing_payments, payments,
  payment_splits, lenco_payments, wallet_transactions,
  institution_wallets, insurance_claims, pos_sales, service_pricing,
  lab_tests, appointments, prescriptions, insurance_information,
  security_audit_log, audit_logs, user_wallets, user_roles, profiles,
  institutions, medication_inventory).
- Gate14 trio intact (3 users + Gate14 QA Clinic untouched).
- Global census is 89 auth users / 89 profiles (was 23 at start): the +66
  are the other five swarm groups' concurrent QA accounts
  (`swarm-provider-*`, `swarm-clinical-*`, `swarm-concurrent-*`, …). My
  group contributed 0 to that delta. The "final census 23" target
  predates the concurrent swarm; restoring 23 needs the other groups'
  purges, which are not mine to run.
