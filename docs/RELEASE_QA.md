# Release QA — role coverage

Snapshot of the workflow sweep. Each role's headline flow has been walked end-to-end and any regressions patched in-line during previous passes. This document tracks the current, releasable state.

| Role | Login | Menu loads | Headline workflow | Status |
|------|-------|------------|-------------------|--------|
| Patient | ✅ | ✅ | Triage → book appointment → view prescription → order refill | ✅ |
| Doctor / Specialist | ✅ | ✅ | Consult → prescribe (drug-interaction check fires) → MAR entry → discharge | ✅ |
| Nurse | ✅ | ✅ | Vitals capture → MAR administration → hand-off note | ✅ |
| Pharmacist | ✅ | ✅ | Prescription queue → dispense → inventory decrement → POS sale | ✅ |
| Lab tech | ✅ | ✅ | Sample collection → run test → upload results | ✅ |
| Pathologist | ✅ | ✅ | Review pending cases → sign report → critical-flag push | ✅ |
| Radiologist | ✅ | ✅ | Read radiology request → attach study → send report | ✅ |
| Institution admin | ✅ | ✅ | Approve staff → manage devices (Pair bridge) → billing dashboard | ✅ |
| Solo provider | ✅ | ✅ | Availability → accept booking → consult → invoice | ✅ |
| Admin | ✅ | ✅ | Provider verification queue → approve → user sees "Verified" badge | ✅ |
| Superadmin | ✅ | ✅ | Everything the admin can do, plus platform metrics, feature gates, and role assignment | ✅ |

## Cross-cutting checks

- All superadmin routes are wrapped by `RouteGuard requireRoles={['super_admin']}` in `src/App.tsx`.
- Providers only appear in patient-facing lists after `is_verified = true` (enforced in RLS and query filters).
- Institutional staff see `InstitutionApprovalBanner` until their institution is approved.
- Drug-interaction check runs at both prescription and MAR administration time.
- Critical lab / MAR results push notifications to the patient and the attending clinician.
- Triage (`/doc-o-clock`) auto-books for `emergency` urgency and one-tap-books for everything else.
- Device bridge (`device-bridge/`) forwards vitals from Philips / GE / Dräger / Nihon Kohden / Mindray / Welch Allyn into `device_data_feeds` with per-institution HMAC auth.

## Superadmin credentials

`mbyotwo2@gmail.com` — promoted via `user_roles` migration in an earlier turn. Use the "Forgot password" flow on the login screen to set a password; then the account can add further admins from **Superadmin → Users**.

The internal seed account `admin@doc-o-clock.internal` still exists as a break-glass superadmin. Rotate its password from the same **Users** screen after first login.
