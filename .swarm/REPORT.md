# Doc Swarm Group 5/6 — Clinical Modules (Lab, Imaging, Dispensary, ART, Records)
## Report — 2026-11-16 · Branch `docswarm/clinical`

Worktree: `~/workspace/docswarm-clinical` (off `origin/main` @ `3ccf2f58`).
Supabase project `tthzcijscedgxjfnfnky`. Live site `www.doc0clock.online`
(stale pre-gate bundle — client fixes NOT live; DB fixes are).

**Labelling convention used throughout:** every finding is tagged
`live-verified` (production PostgREST/edge-function JWT replay),
`local-build-verified` (locally built `origin/main` + fixes, Playwright,
headless Chromium via a local CONNECT relay), or
`blocked-by-stale-deploy` (needs the Vercel deploy to confirm live).

## Ranked findings

### 1. [FIXED — live-verified] ART cycle creation broken in the app UI (403)
- **Defect:** `ARTModule.handleCreateCycle` calls
  `insert({...}).select().single()`. Live, that exact call failed
  `403 42501 "new row violates row-level security policy"` for the
  creator (doctor and institution_admin both reproduced), while the
  identical insert WITHOUT `.select()` succeeded (201) and a standalone
  GET of the row also succeeded. No cycle was ever created, so the
  auto-assign-creator-as-staff step never ran either.
- **Root cause:** PostgREST INSERT with `return=representation`
  re-checks the new row against the SELECT policy inside the same
  statement. The only SELECT policy routed through the SECURITY DEFINER
  function `can_access_art_cycle()`, whose self-table lookup runs under
  the statement snapshot and cannot see the row being inserted.
  (Staff/procedure inserts with representation work — their check looks
  up the already-committed parent cycle; PATCH with representation works
  — the row pre-exists. RPC `can_access_art_cycle` returns `true`.)
- **Fix:** additive permissive SELECT policy evaluated directly on the
  RETURNING row — no self-table lookup, snapshot-proof. Grants NOTHING
  new (the creator can already read via `can_access_art_cycle()`).
  Applied live 2026-11-16 + migration
  `supabase/migrations/20261116_art_cycle_creator_read_policy.sql`.
  **Live re-proof:** app-shape insert returned **201 with the row** after
  the policy (403 before). The 20261114 recursion fix is untouched
  (no policy body inlines a subquery against `art_cycles`).
- **Tests:** `src/test/docswarm-clinical-2026-11-16.test.ts` (6 tests).

### 2. [FIXED — local-build-verified] Patient dashboard "Active Prescriptions" always 0
- **Defect:** `PatientMetricsDashboard` counted `pharmacy_prescriptions`
  — a legacy table only `FHIRImportPanel` still writes. Every current
  writer (doctor `PrescriptionWriter`, FHIR inbound, `/prescriptions`
  page) targets `comprehensive_prescriptions`. Live data: patient had
  **0** rows in `pharmacy_prescriptions` vs **3** live prescriptions in
  `comprehensive_prescriptions`; local build rendered
  "Active Prescriptions 0".
- **Fix:** count `comprehensive_prescriptions` with
  `status IN ('pending','filled','partially_filled')`.
  **Local-build re-proof:** tile now renders "Active Prescriptions **3**".
- **Blocked-by-stale-deploy:** live confirmation needs the Vercel deploy.

### 3. [FIXED — local-build-verified] Patient dashboard "Health Records" tile mislabelled
- **Defect:** tile labelled "Health Records" but its value is the
  `vital_signs` row count (subtitle already said "Vital sign entries";
  live: 8 vitals rows rendered as "Health Records 8").
- **Fix:** label → "Vital Sign Entries". Local-build re-proof: tile
  renders "Vital Sign Entries 8". Blocked-by-stale-deploy for live.

### 4. [VERIFIED HOLDS — live-verified] Lab verify authorisation + re-verify block
- Staff pathologist (role + active `institution_personnel` link) verifies
  via JWT: 200, `verified_at` set; `lab_results.verified_at` mirror
  confirmed; patient view then shows `result_value` 13.2.
- Outsider pathologist (role, NO staff link): verify refused
  (200 with 0 rows — RLS `lab_institution_access` denies the UPDATE).
- Re-verification refused: 400 P0001 "already verified; re-verification
  is not allowed" (`enforce_lab_test_verify_rules` trigger).
- Patient cannot read own `lab_tests` pre-verification (200 []), nor
  `lab_results` (200 []); patient view hides value (NULL) until verified.
- Phantom columns confirmed: `test_name` on `lab_tests` → 400;
  status `'resulted'` → 400 CHECK violation.

### 5. [VERIFIED HOLDS — live-verified] Imaging final-only visibility + immutability
- Draft → patient 200 []; preliminary → patient 200 []; final → patient
  sees findings/impression ("Swarm QA: clear lung fields",
  "no acute abnormality"). Editing a final report refused:
  403 42501 "Final imaging reports cannot be edited — file an addendum
  report instead." (`enforce_imaging_result_signoff`).

### 6. [VERIFIED HOLDS — live-verified] Dispensary stock deduction exactly once
- Batch qty 100 → movement −5 → `quantity_after` 95,
  `quantity_remaining` 95; second −5 → 90. Exactly once each; trigger
  `trg_apply_batch_movement` only, no explicit UPDATE anywhere
  (`dispense_medicine_batches` RPC inserts movements only — FEFO,
  verified: RPC dispense of 5 took from the oldest batch 90→85,
  movement `quantity_after` 85).
- Over-dispense (−200 / RPC 10000) refused; stock unchanged.
- Note: `medicine_batches` requires `inventory_table` +
  `inventory_item_id` (NOT NULL); `qa_status` must be `approved`.

### 7. [VERIFIED HOLDS — live-verified] ART access control (post-fix)
- Full flow via JWT on the fixed build path: cycle create (app shape),
  partner reads, outsider 200 [], staff assign, assigned staff reads,
  procedure recorded, outsider cannot read procedures.
  `can_access_art_cycle()` SECURITY DEFINER holds.

### 8. [VERIFIED HOLDS — live-verified] Vitals + records + prescriptions
- Vitals: patient self-records diastolic 90 and 91; doctor reads via
  care relationship; other patient 200 []. Diastolic band in repo:
  `ai-health-insights.ts` — `diastolic > 90` raises risk (90 safe /
  91 critical). Local build renders "BLOOD PRESSURE 132/91 mmHg".
- Records: doctor creates, patient reads own, other patient 200 [],
  patient self-reports own, other patient cannot update (200 []).
- Prescriptions: doctor creates with `instructions`
  ("Take one capsule three times daily after meals"); patient reads;
  pharmacist views unassigned + fills; phantom `frequency` → 400.
  (`PrescriptionFulfillment` maps `instructions` into a local
  `frequency` display field — no phantom DB select.)

### 9. [VERIFIED HOLDS — live-verified] FHIR inbound stored-error hygiene
- Bad-date `MedicationRequest` bundle via `fhir-inbound` (doctor JWT):
  422 generic client error; stored `error_message` is the generic
  "Prescription safety check failed: the prescription could not be
  validated." — no raw Postgres text readable by the patient.
  The 2026-11-15 audit fix holds live.

### 10. [OBSERVATION — not fixed] Two parallel stock systems
- `/drug-stock` UI reads `drug_stock_items`/`drug_stock_movements`,
  NOT `medicine_batches`/`batch_stock_movements`. A batch-only fixture
  correctly shows "Inventory (0)" there. Verified the UI layer works:
  pharmacist JWT insert into `drug_stock_items` renders as "Amoxicillin"
  in the local build. No action taken — the two tracks serve different
  flows (batch/lot dispensing vs drug-stock UI); merging them is a
  product decision, not a bug fix.

### 11. [OBSERVATION — local-build harness] Browser ↔ egress proxy
- Headless Chromium in this VM cannot CONNECT through the egress proxy
  directly (`ERR_TUNNEL_CONNECTION_FAILED`); curl/Node work. Local
  Playwright runs used a localhost CONNECT relay (`/tmp/pw/relay.mjs`)
  that reproduces curl's CONNECT. Not a product issue; harness note for
  future local rendered passes.
- First local build was unconfigured (no `.env` → fallback
  `placeholder.supabase.co`); rebuilt with `.env` from `.env.example`
  + the anon key. `.env` is gitignored and left in the worktree.

## Live JWT replay results
- Full suite `​.swarm/proofs.py` (v4): **50/50 PASS**
  (`.swarm/proofs-v4.json`).
- RPC dispense + UI-layer stock: 5/8 raw checks pass; the 3 "fails" were
  a harness error (checked the fresh FEFO batch instead of the oldest
  batch the RPC correctly allocated from) — corrected by direct SQL
  verification: oldest batch 90→85, movement `quantity_after` 85
  (`.swarm/proofs-rpc.json` + §6 above).
- FHIR bad-date probe: 422 + generic stored message (see §9).

## Local-build rendered checks (Playwright, local `vite preview`)
- Patient `/medical-records` @390/@1280: lab "Full Blood Count 13.2",
  imaging "clear lung fields / no acute abnormality", prescriptions,
  records — all render; no horizontal overflow; dark mode body
  `rgb(17, 15, 14)` (not white).
- Patient `/prescriptions` @390: Amoxicillin + instructions render.
- Patient `/health-dashboard` @390: "BLOOD PRESSURE 132/91 mmHg";
  after fix "Active Prescriptions 3", "Vital Sign Entries 8".
- Doctor `/lab-orders`, `/imaging`, `/art` @390: render with data.
- Pharmacist `/drug-stock` @390: renders "Amoxicillin" (after
  `drug_stock_items` row exists). No overflow on any page.
- Screenshots: `.swarm/shots/`.

## Tests (scoped, in worktree)
- `src/test/docswarm-clinical-2026-11-16.test.ts`: **6/6 pass**
- `src/test/bugfree-gate-2026-11-14.test.ts` + `rendered-pass-2026-11-11.test.ts`: **44/44 pass**
- `provider-dashboard-crash` + `sweep-client-correctness-2026-11-13`: **21/21 pass**
- Full suite runs at merge time per instructions.
- Local production build (`vite build`): clean (with
  `SWC_NATIVE_BINDING_CACHE=/tmp/swc-native`).

## QA users & purge (verified 2026-11-16)
- Created 9 QA users `swarm-clinical-*@doc0clock.online`
  (patient, patient2, doctor, pathologist, lab_technician, radiologist,
  pharmacist, institution_admin, outsider) + institution
  "Swarm Clinical QA Hospital" (`7645c73d-7edd-4282-997c-3dd0e0450ea5`),
  personnel/staff links, care connections, appointment.
  Creds: `~/.qa-tokens/docswarm-clinical.json` (chmod 600).
- **Purged, child-first** (`.swarm/purge.py`): pre-purge rows included
  4 lab tests, 4 lab results, 4 imaging orders, 3 imaging results,
  5 ART cycles, 8 vitals, 3 batches, 5 movements, 6 records,
  3 prescriptions, 71 `security_audit_log` rows.
- **Post-purge verification: RESIDUE TOTAL 0**; `swarm-clinical-*` users 0.
  Gate14 trio intact (`gate14-patient/doctor/instadmin`).
- Global `auth.users` count at purge time: **73** (other swarm groups'
  users still present — the "census 23" target is coordinator-level
  once all groups purge; my prefix is zero).

## Changes in this branch
- `supabase/migrations/20261116_art_cycle_creator_read_policy.sql` (new)
- `src/test/docswarm-clinical-2026-11-16.test.ts` (new, 6 tests)
- `src/components/metrics/RoleMetricsDashboard.tsx` (prescription-count
  source table + vitals-tile label)
- `.swarm/` (proof scripts, report, screenshots, proof JSONs)
- Live DB change (with matching migration above): policy
  `"ART cycle creator read"` on `public.art_cycles`.
