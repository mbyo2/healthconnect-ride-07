# Doc Swarm Group 2 — Provider Flows (all 27 professions)

Date: 2026-11-16. Branch: `docswarm/provider`. Worktree: `~/workspace/docswarm-provider`.
Repo HEAD at start: `3ccf2f58` (origin/main). Live site: www.doc0clock.online.
Method: JWT replays against live Supabase project `tthzcijscedgxjfnfnky`
(= **live-verified**); unit tests + local production build in the worktree
(= **local-build-verified**); signed-in browser rendering is
**blocked-by-sandbox-network** (see §5) and the live bundle is stale
(**blocked-by-stale-deploy** for client visuals).

QA users: `swarm-provider-<role>@doc0clock.online` × 27 + shared QA patient
`swarm-provider-patient@doc0clock.online`. Creds in
`~/.qa-tokens/docswarm-provider.json` (chmod 600). All purged at end; see §6.
Gate14 accounts untouched.

## 1. Per-profession completion table (27/27 data-layer)

Shared steps pass for **all 27**: sign-in, onboarding profile PATCH
(consultation_fee_min 150 / max 300, accepting_patients, show_in_search),
availability insert, wallet (auto-created by trigger, balance 0),
patient books → provider accepts (confirm) → video consultation →
clinical note → complete + follow_up_status=scheduled → earnings read →
wallet read → patient sees appointment / availability / provider profile /
fee (K150). Role-gated steps behave exactly per the platform charter:

| Profession | Rx (6) | Lab order (6) | Vitals (9) | Notes | Full shared flow |
|---|---|---|---|---|---|
| doctor | ✅ | ✅ | ✅ | ✅ | ✅ |
| specialist | ✅ | ✅ | ✅ | ✅ | ✅ |
| medical_licentiate | ✅ | ✅ | ✅ | ✅ | ✅ |
| clinical_officer | ✅ | ✅ | ✅ | ✅ | ✅ |
| dentist | ✅ | ✅ | ❌ refused (correct) | ✅ | ✅ |
| nurse | ❌ refused | ❌ refused | ✅ | ✅ | ✅ |
| registered_nurse | ❌ refused | ❌ refused | ✅ | ✅ | ✅ |
| enrolled_nurse | ❌ refused | ❌ refused | ✅ | ✅ | ✅ |
| midwife | ❌ refused | ❌ refused | ✅ | ✅ | ✅ |
| radiologist | ❌ refused | ✅ | ❌ refused | ✅ | ✅ |
| psychologist | ❌ refused | ❌ refused | ❌ refused | ✅ | ✅ |
| nutritionist | ❌ refused | ❌ refused | ❌ refused | ✅ | ✅ |
| optometrist | ✅ | ❌ refused | ❌ refused | ✅ | ✅ |
| optician | ❌ refused | ❌ refused | ❌ refused | ✅ | ✅ |
| physiotherapist | ❌ refused | ❌ refused | ❌ refused | ✅ | ✅ |
| occupational_therapist | ❌ refused | ❌ refused | ❌ refused | ✅ | ✅ |
| dental_therapist | ❌ refused | ❌ refused | ❌ refused | ✅ | ✅ |
| traditional_practitioner | ❌ refused | ❌ refused | ❌ refused | ✅ | ✅ |
| health_personnel | ❌ refused | ❌ refused | ❌ refused | ✅ | ✅ |
| pharmacist | ❌ refused | ❌ refused | ✅ | ✅ | ✅ |
| pharmacy_technologist | ❌ refused | ❌ refused | ❌ refused | ✅ | ✅ |
| radiographer | ❌ refused | ❌ refused | ❌ refused | ✅ | ✅ |
| pathologist | ❌ refused | ❌ refused | ❌ refused | ✅ | ✅ |
| lab_technician | ❌ refused | ❌ refused | ❌ refused | ✅ | ✅ |
| phlebotomist | ❌ refused | ❌ refused | ❌ refused | ✅ | ✅ |
| environmental_health_officer | ❌ refused | ❌ refused | ❌ refused | ✅ | ✅ |
| community_health_worker | ❌ refused | ❌ refused | ❌ refused | ✅ | ✅ |

"Refused" = PostgREST 42501 (RLS), the designed denial. Every
`*_expected` assertion passed 27/27: prescribing = PRESCRIBING_ROLES (6),
lab ordering = LAB_ORDERING_ROLES (6), vitals = `can_record_vitals_for`
roles (9). Prescriptions use `instructions` for directions (no `frequency`
column — phantom-column class respected by PrescriptionWriter).
Raw results: `proofs/swarm_provider_results.json`.

Extra live checks (all pass): patient reads own 6 prescriptions and 9
vitals rows; patient lab view returns 0 rows for the 6 unverified orders
(no values leak); doctor listing another provider's appointments returns 0;
provider `payment_splits` read returns cleanly (0 rows); doctor reads own
lab order (1 row). Booking created 27 × K30.00 `booking_fees` rows
(status pending, no wallet movement — fee record only).

## 2. Ranked findings

### F1 — FOUND + FIXED (live-verified): EMR case-sheet creation always failed
`EMRCaseSheets.createCaseSheet` inserts
`comprehensive_medical_records.record_type = 'consultation'`, but the live
CHECK allowed only 18 values without `'consultation'` → every creation
failed with 23514, user-facing "Could not create case sheet".
Fix: migration `supabase/migrations/20261116_add_consultation_record_type.sql`
(re-issues the CHECK with the live 18 values + `'consultation'`, idempotent)
— **applied live** and verified: clinical-note inserts with
`record_type='consultation'` now succeed **27/27** with patient readback
27/27 (was 0/27 before). My probe initially used `'consultation_note'`
(also invalid); the real client value is `'consultation'`.

### F2 — FOUND + FIXED (comment only): "five legal prescribing professions"
`src/pages/Prescriptions.tsx` comment said five; `PRESCRIBING_ROLES` has six
(optometrist included) and `is_verified_prescriber` enforces six. Comment
corrected; no behaviour change. The page correctly gates writing to
`isPrescriber`; LabOrders correctly gates on `LAB_ORDERING_ROLES`.

### F3 — FOUND, by design (no fix): 5 roles have no consultation routes
`ROLE_PERMISSIONS`: pharmacist, pharmacy_technologist, pathologist,
lab_technician, phlebotomist lack `...PROVIDER_CORE_ROUTES`, so they have no
`/provider-dashboard`, `/appointments`, or `/video-consultations` route in
the client (landings: `/pharmacy-portal`, `/lab-management`). The DATA layer
still lets them accept appointments / create video consultations (RLS is
role-blind here), so this is a client-route restriction, not an RLS gap.
Flagging as scope note: if the CEO wants every profession to run
appointments-based consultations, these 5 need route grants; as designed,
their workflows live in the Pharmacy Portal / Lab Management. EHO + CHW get
core routes minus `/video*` (deliberate, field cadres). All 27 resolve to a
non-patient workflow in `RoleBasedWorkflow` (explicit / DOCTOR_LIKE /
NURSING / ALLIED_LIKE fallbacks — no PatientWorkflow fall-through).

### F4 — OBSERVED, not changed: dead `'in_progress'` in `can_record_vitals_for`
The function accepts appointment status `'in_progress'`, but the
`appointments_status_check` only allows
pending/scheduled/confirmed/cancelled/completed/no_show — `'in_progress'`
can never match. Harmless dead branch; left untouched.

### F5 — SETUP GOTCHA (documented, no product fix): profiles.role mirror
The repo `grant-role.sql` profiles UPDATE is silently reverted when run via
the Management API (`docsql.sh`): `prevent_profile_privilege_change`
reverts role changes when `is_service_role()` is false and `auth.uid()` is
NULL. Fix used here: set the mirror via the service key over REST
(`PATCH /rest/v1/profiles`, service_role JWT → trigger passes). Also, the
shared `/tmp/_q.json` in `docsql.sh` races when swarm groups run
concurrently (one run re-executed a stale statement → duplicate-key error);
this group's runner `proofs/docsql-provider.sh` uses a per-call temp file.

### F6 — FOUND + FIXED (type-only): pre-existing tsc errors in `useConnections.ts`
Full-program `tsc` failed with 4× TS2339 on `data.provider`
(`primary_provider_assignments` row type has no `provider` field; the hook
attaches it via `(data as any).provider = ...` but read it uncast). Fixed by
reading through the same cast. `tsc` now exits 0 with 0 errors. Runtime was
unaffected (vite build strips types), but the repo had no clean typecheck.
This hook reads the provider-connection surface the appointment trigger
feeds (`user_connections` / primary-provider assignment).

### AI boundary — VERIFIED (local-build unit tests, 28/28)
`src/test/triage-roles.test.ts` + `src/test/triage-privacy.test.ts` pass:
all 27 professions map to `clinical` mode; clinical next-steps never link to
`/search` (no booking), link only to `/opd` / `/emergency` when the role
already has them; lab roles get zero links; `super_admin` → `self`, guidance
only; the triage page performs no DB writes and stores nothing. The mode and
acting role are never sent upstream (payload key set pinned by tests).

## 3. Suite counts (local build, worktree)
- Triage roles + privacy: **28/28 pass**.
- `stage-completeness-roles` + `NavigationFlow` + `mobile-overflow`: **24/24 pass**.
- `tsc -p tsconfig.app.json --noEmit`: **exit 0, 0 errors** after fixing a
  pre-existing type error in `src/hooks/useConnections.ts` (4× TS2339:
  `data.provider` read without a cast after being attached via `as any`;
  fixed by reading through the same cast). Pre-fix run: exit 2, 4 errors,
  all in that file, none in files touched by this group.
- Full suite runs at merge time per instructions.

## 4. Local production build
`vite build` (with `VITE_SUPABASE_URL` + anon key, `SWC_NATIVE_BINDING_CACHE=/tmp/swc-native`)
succeeded in 1m54s; `vite preview` serves 200. Screenshots in
`proofs/shots/` (10 captures: /provider-dashboard, /prescriptions,
/appointments at 360/390/430/1280, light + dark).

## 5. Blocked items
- **Blocked-by-sandbox-network**: the headless browser in this VM cannot
  reach the internet at all (`ERR_TUNNEL_CONNECTION_FAILED` for every
  external host including example.com, while shell curl works). Signed-in
  pages therefore stall at "Checking permissions..." (RouteGuard waits on
  Supabase). Signed-in client rendering + dark-mode content checks must be
  done by the parent's live-browser tour. Shell-only evidence: no horizontal
  overflow (scrollWidth == innerWidth) at 360/390/430/1280 in the rendered
  app shell.
- **Blocked-by-stale-deploy**: live www.doc0clock.online still serves the
  pre-gate bundle, so client visuals (incl. F1's fix path in the UI) cannot
  be confirmed live until the Vercel deploy lands.

## 6. Purge + census
Purge script: `proofs/swarm_provider_purge.py` (child-first:
prescription_history → booking_fees → medical_record_audit →
prescriptions → lab_tests → vitals → video_consultations →
user_connections → appointments → medical records → availability →
wallets → user_roles → audit rows → profiles → identities → users).
Pre-purge residue census (exact expected counts): 28 users, 28 identities,
28 profiles, 55 user_roles, 27 appointments, 27 video_consultations,
27 medical records, 6 prescriptions, 6 lab tests, 9 vitals,
27 availability, 28 wallets, 27 user_connections, 27 booking_fees
(K30.00 pending each), 6 prescription_history, 27 medical_record_audit,
204 security_audit_log rows. Post-purge verification (2026-11-16 ~10:05 CAT):
**swarm-provider-% = 0 in every table** (full census re-run, TOTAL 0;
audit delete removed 314 rows incl. trigger-inserted rows from the
user_roles delete). Gate14 trio intact with seeded data untouched.
Total `auth.users` at purge time: **39** (= 23 baseline + 16 other swarm
groups' QA users still active mid-swarm; they purge their own prefixes —
this group's census target of 23 applies once all groups have purged).

## 7. Status at handoff — COMPLETE
- [x] 27 providers + 1 patient created, roles granted, mirrors fixed
- [x] Full workflow probed live per profession (results JSON)
- [x] F1 fixed live + migration committed; F2 comment fixed; F6 tsc fixed
- [x] AI boundary verified (28/28 unit tests)
- [x] Local build succeeds; scoped tests green (52/52); tsc exit 0
- [x] Purge + final census: swarm prefix 0 everywhere; gate14 intact
- [x] Commit + push `docswarm/provider` (see final report for commit id)
