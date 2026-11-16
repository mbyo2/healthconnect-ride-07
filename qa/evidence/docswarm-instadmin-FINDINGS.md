# DOC SWARM Group 3 — Institution Admin: findings (2026-11-16)

Branch: `docswarm/instadmin` (worktree `~/workspace/docswarm-instadmin`).
Evidence: `qa/evidence/docswarm-instadmin-evidence.json` (live JWT replays),
`qa/evidence/per-type-table.md` (54/54), `qa/evidence/render/` (local-build
screenshots + results). Proof scripts: `qa/docswarm-instadmin-proofs.py`
(superseded — urllib transport), `qa/docswarm-instadmin-proofs2.py` (phases
2–3, curl transport), `qa/docswarm-instadmin-proofs3.py` (phases 4–7),
`qa/render-instadmin.mjs`, `qa/render-modtab.mjs`, `qa/render-click.mjs`.

Labels: **live-verified** = proven against live Supabase via QA-user JWT
replay; **local-build-verified** = proven against a locally served `vite
build` of this branch (live still serves the pre-gate bundle);
**blocked-by-stale-deploy** = cannot be verified live until Vercel ships.

## Ranked findings

### F1 — FIXED — Institution Settings module toggles were dead (live-verified)
`src/pages/InstitutionSettings.tsx` rendered Enable/Disable buttons for
every module, wired to `setInstitutionModuleEnabled` (upsert into
`institution_module_entitlements`). Live RLS on that table ("Admins manage
module entitlements") allows only platform `admin` / `super_admin` writes,
so every click by an institution admin failed 42501 with a "Failed to
update module" toast. Proven live: institution-admin upsert → HTTP 403
42501; platform-admin grant/revoke/delete → 201/204; the grant is then
readable by the institution admin. The page's own copy already says
"Contact the Doc'O Clock platform team and we switch it on for you", and
add-on modules are priced — self-serve toggling would bypass the
approval/pricing model. **Fix (this branch): removed the toggle buttons and
`handleModuleToggle` from InstitutionSettings (read-only module list);
the platform-admin grant UI (`AdminDashboard` → Modules →
`InstitutionModuleManager`) is unchanged and is the only grant path.**
Local-build-verified: Modules section renders with 0 toggle buttons at
390px light/dark and 1280px; `?tab=modules` renders the Module Manager for
the platform admin; real mouse click on the Modules tab switches content.

### F2 — FIXED live + migration — diagnostics charter key `bloodbank` vs `blood_bank` (live-verified)
Live `facility_module_charter` had TWO keys for one module: `blood_bank`
("Blood bank requests", secondary + tertiary) and `bloodbank` ("Blood
Bank", diagnostics only). Every other consumer uses `blood_bank`:
`moduleTabMapping.ts` bloodbank tab requires `["blood_bank"]`,
`institution_module_pricing` has a price row only for `blood_bank`. A
diagnostics-tier Blood Bank / Transfusion Service institution therefore
held a charter key matching no tab rule and no price row. Latent: the tab
map is not yet wired into the dashboard ("awaiting CEO sign-off"), so
nothing user-facing broke yet — it would have bitten on wiring day. The
drifted row exists in NO repo migration (repo seed gives diagnostics 7
keys, no Blood Bank row) — it was added live outside the repo.
**Fix: migration `supabase/migrations/20261116_fix_diagnostics_bloodbank_charter_key.sql`
(UPDATE the drifted row + INSERT the row when absent) and applied live:
distinct charter keys 36 → 35; `blood_bank` now in diagnostics, secondary,
tertiary. No entitlements referenced either key. Note: the brief's
"charter 32 keys" is stale — live has 35 distinct keys after this fix
(31 max in one tier, tertiary: 21 live + 10 planned).**

### F3 — FIXED (repo doc) — `supabase/qa/grant-role.sql` step 2 silently fails (live-verified)
The profiles-role mirror UPDATE "succeeds" from direct SQL but the role
stays `patient`: the audit trigger `prevent_profile_privilege_change()`
silently reverts `NEW.role` to `OLD.role` when `auth.uid()` holds no
admin/super_admin role (direct SQL has `auth.uid()` NULL); no error is
raised. Only `is_verified` flips. The canonical `user_roles` grant (step
1) works fine, and app role authority is `user_roles` only, so this was
cosmetic — but the template told QA the mirror was done. **Fix: template
now documents the trigger and the service_role REST path for the mirror**
(PATCH `/rest/v1/profiles` with the service_role key). All 6 QA users got
their mirrors set that way during this mission.

### F4 — NOT A DEFECT — comprehensive_prescriptions INSERT 403 for institution admins (live-verified)
Institution-admin insert into `comprehensive_prescriptions` fails 42501
by design: INSERT policy "Verified providers can create prescriptions"
requires `is_verified_prescriber()` (verified profile + doctor/specialist/
licentiate/clinical-officer/dentist/optometrist role). Verified live with
a prescriber QA doctor: doctor creates with `pharmacy_id` = institution,
owning institution admin reads it back via the affiliation path (14/14
F7 tables on all 7 tiers). Prescription creation belongs to provider
flows, not institution-admin flows.

### F5 — NOT A DEFECT — institution admin cannot set `payment_mode` / `list_in_marketplace` / `is_verified` / bank fields (live-verified)
All four refused 42501 via the `guard_payment_mode_change` and
`guard_institution_trust_columns` triggers; non-guarded fields (e.g.
name) update fine; cross-admin update affects 0 rows; institution-admin
DELETE affects 0 rows (institution confirmed still present afterwards).
Approval-request flow works end to end: institution admin files
`marketplace_approval_requested` + `marketplace_listing_requested` in
`security_audit_log` (201), platform admin logs the decision (201) and
applies the change (200). Edge verified: a platform admin CAN directly set
`list_in_marketplace=true` on an OWN-mode institution at the DB level, but
the marketplace query (`payment_mode='platform' AND listed`) hides it, and
`MarketplaceListingApprovals.handleApprove` refuses to list non-platform
institutions in the UI — defence in depth holds.

## Verified working (live-verified unless noted)

- **54/54 institution types**: created via the app's exact PostgREST insert
  path, read back 54/54; all 54 type codes exist in the live
  `healthcare_provider_type` enum and in `institution_types` (all
  `is_active`); tiers: community 1, diagnostics 7, pharmacy 5, primary 9,
  secondary 8, support 15, tertiary 9. Per-tier charter: community 6,
  diagnostics 8, pharmacy 5, primary 16, secondary 27, support 4,
  tertiary 31 keys. (Full table: `per-type-table.md`.)
- **F7 — 31 RLS policies on 14 tables**: confirmed live in `pg_policies`
  (31 policies referencing `user_affiliated_with_institution()` across the
  14 tables); insert+read-back 14/14 on one institution per tier
  (asset_records, attendance_records, bank_reconciliations,
  biometric_devices, comprehensive_prescriptions, employee_payroll,
  general_ledger_entries, medical_shifts, paye_calculations,
  paye_tax_slabs, pharmacy_prescriptions, shift_assignments,
  smart_invoices, zambia_nhima_config). Two script bugs found en route
  (not product bugs): `general_ledger_entries.entry_type` must be one of
  journal/receipt/payment/adjustment; `pharmacy_prescriptions` doctor
  policy requires `doctor_id = auth.uid()`.
- **F8 ART**: cycle create 201; access matrix correct (creator + patient
  see it; other admin + unassigned staff do not); staff assignment by
  creator 201 → assigned staff reads cycle + procedures; other-admin
  assignment blocked 403. No 42P17 recursion.
- **Module entitlements**: platform-admin grant/revoke/delete work (201/
  204), institution admin reads grants (200); subscription state: QA
  admins hold 0 subscriptions → effective "none", never blocks; 6
  subscription plans readable.
- **Staff management**: admin adds `institution_personnel` + `institution_staff`
  (201); staff then sees the institution and its F7 rows and can insert
  asset rows (201); removal restores 0 rows; cross-admin reads return 0.
- **Local build**: `vite build` clean (59–85s); scoped vitest 18/18
  (`subscription-expiry` 17 + `marketplace.smoke` 1). Render pass:
  Settings + Dashboard at 390px light/dark, no horizontal overflow at
  360/390/414/430; dashboard renders the QA institution ("Pending
  verification · Long-Term Care Dashboard"). ESLint is broken repo-wide
  (pre-existing: `@typescript-eslint/prefer-const` rule not found in the
  installed plugin — fails identically on pristine main; not touched).

## Tooling notes (for the next group)

- Python `urllib` HTTPS to Supabase from this VM drops connections
  constantly (IncompleteRead / RemoteDisconnected) — use `curl` (the
  proof scripts use curl via subprocess) or `docsql.sh`.
- The headless-Chrome render harness needs the egress relay proxy:
  `--proxy-server=http://127.0.0.1:18080` (relay already listening).
  Without it the app shell renders but auth/roles requests fail and
  RouteGuard sits on "Checking permissions..." forever.
- `vite preview` must be started as a tracked background process or the
  runtime kills it when the shell exits. Port 4173 was already in use by
  another process; this mission used 4181.
- `npm install` fails in a fresh worktree ("Cannot read properties of
  null (reading 'edgesOut')"; no `package-lock.json` is committed).
  Workaround used: symlinked `node_modules` from the main checkout at
  the same commit (lock-identical). The symlink is NOT committed.

## QA users created (all purged at end — see purge section in parent report)

`swarm-instadmin-a/b` (institution_admin, 27 institutions each),
`swarm-instadmin-staff` (institution_staff), `swarm-instadmin-patient`
(patient), `swarm-instadmin-platform` (platform admin), `swarm-instadmin-doctor`
(verified prescriber). Credentials in `~/.qa-tokens/docswarm-instadmin.json`
(600). The 3 gate14 QA accounts were not touched.
