# Plan: Outclass Insta HMS, Zocdoc & MocDoc

## Competitive read

| Platform | Their moat | How we beat it |
|---|---|---|
| **Insta HMS (Practo)** | End-to-end hospital ERP across 22 countries: clinical+financial+operational, FATOORAH e-invoicing, multi-currency, ERP-grade reports | Match ERP breadth, then add AI-native workflows + open APIs they don't have |
| **Zocdoc** | Public marketplace: insurance-aware discovery, instant booking, reviews, telehealth, 8× ROI for providers | Build the same patient acquisition funnel but cheaper, with AI triage routing and family accounts |
| **MocDoc** | Affordable cloud HMS for SMB clinics/labs/pharmacies/chains, queue tokens, WhatsApp, mobile-first | Match the SMB-friendly UX, then dominate with offline-first + mobile money + USSD that they lack outside India |

**Our unique wedge:** the only platform that is simultaneously a hospital ERP, a patient marketplace, and an AI-native, Africa-ready, FHIR-open super-app.

## Current state (from audit)

- ✅ Solid: appointments, telemedicine, prescriptions, pharmacy POS, billing, triage, IoT, marketplace, wallet, FHIR export, AI diagnostics, subscriptions
- ⚠️ Half-built: lab results/pathology, ambulance dispatch, OT anaesthesia, HR, insurance OCR, gamification
- ❌ Orphaned backends with no UI: `send-push`, `send-sms`, `send-reminder`, `send-appointment-reminder`, `ocr-insurance-card`, `process-refund`, `generate-receipt`, `process-dpo-payment`, `process-mobile-money`, `track-analytics`; tables `ot_anaesthesia_records`, `medication_administration_records`, `feature_gates`, `pathologist_reviews`, `delivery_zones`, `commission_settings` admin, `no_show_fees`, `referral_links`
- 🐛 Bugs: `BlockchainRecords` hardcoded audit trail, `VideoDashboard` hardcoded zeros, `CostEstimator` queries non-existent `insurance_information` table, `useCXODashboard.avgWaitTime` always 0, analytics dispatch commented out

---

## Phase 0 — Wire the orphans (quick wins, ~1 week)

Goal: every deployed edge function and table has a real UI caller; remove all hardcoded/mock data.

1. **Notification pipeline activation**
   - Add `useNotifications` dispatcher that picks SMS → Push → Email by user preference + connectivity
   - Wire `send-appointment-reminder` to a cron edge function (24h + 2h pre-appointment) using `CRON_SECRET`
   - Wire `send-push` from new vitals-alert, prescription-ready, lab-result-ready, payment-received triggers
   - Notification preferences UI in `Settings.tsx` (channel × event matrix)

2. **Payments completion**
   - Wire `process-mobile-money` (MTN/Airtel/Zamtel) into `WalletTopUp` and checkout
   - Wire `process-dpo-payment` (DPO Pay — pan-African gateway) as alternative
   - Wire `process-refund` into provider/admin order/appointment cancellation flows
   - Wire `generate-receipt` to auto-fire on `billing_payments` insert; downloadable PDF in `Wallet.tsx`

3. **Insurance OCR**
   - `InsuranceCardUpload.tsx` calls `ocr-insurance-card` after upload, prefills card fields, stores `ocr_data` JSON

4. **Fix broken metrics & mocks**
   - Compute `avgWaitTime` from `queue_tokens` (called_at − created_at average)
   - `VideoDashboard` queries `video_consultations` + `appointments` for real counts
   - `CostEstimator` switches to real `service_pricing` table joined to `insurance_cards`
   - Replace `BlockchainRecords` hardcoded trail with `medical_record_audit` table + SHA-256 hash chain (see Phase 3)
   - Re-enable `track-analytics` invoke; build `feature_gates` admin toggle UI

5. **Analytics & feature flags**
   - Admin page to toggle `feature_gates` per role/region; client `useFeatureFlag` hook

---

## Phase 1 — Hospital ERP depth (beat Insta + MocDoc, ~3 weeks)

1. **Full clinical chain**
   - `MedicationAdministrationRecord` (MAR) page for nurses: e-MAR with barcode scan, double-check workflow, links to `medication_administration_records`
   - `PathologistReview` queue page (`pathologist_reviews`) with side-by-side image + report editor
   - `LabResults` viewer with reflex-test rules engine (`lab_reflex_tests`), normal-range flags, trend charts, PDF export
   - `OT Anaesthesia` chart page (`ot_anaesthesia_records`) embedded in `HospitalManagement` OT tab — pre-op/intra-op/post-op timeline
   - Drug-interaction checker hook (`drug_interactions` + `drug_risk_levels`) gating every prescription submit
   - `DischargeChecklist` surfaced in institution nav

2. **Ambulance dispatch live**
   - Real-time map view of dispatches (Mapbox/Leaflet + Supabase realtime on `ambulance_dispatches`)
   - Driver mobile view with status transitions and ETA
   - Patient live-track link via SMS

3. **HR module**
   - `InstitutionHR` page tabs: Attendance (`staff_attendance` clock-in/out + geofence), Shifts (`staff_shifts` + `shift_schedules` drag-drop scheduler), Leave (`leave_requests` approval workflow), Payroll (`payroll_records` run + payslip PDF)

4. **Finance depth**
   - Multi-currency ledger view, double-entry export, `e-invoicing` (FATOORAH/ZRA Smart Invoice ready)
   - Fee config UI: `no_show_fees`, `booking_fees`, `specialty_booking_fees`, `commission_settings`
   - Insurance claims dashboard with TPA status sync stubs (Cigna/Liberty/NHIMA-ready)

5. **Multi-location & chain support**
   - `institution_branches` table + branch switcher in `useInstitutionContext`
   - Cross-branch inventory transfer in pharmacy
   - Consolidated chain dashboard for owners

6. **Reports / MIS**
   - Pre-built reports: OP/IP census, revenue by department, doctor productivity, drug movement, lab TAT, claim aging
   - Custom report builder over `cxo_dashboard_metrics` materialized view
   - Scheduled email/WhatsApp report delivery

---

## Phase 2 — Patient marketplace (beat Zocdoc, ~2 weeks)

1. **Public discovery surface (SEO)**
   - Public routes `/find/:specialty/:city`, `/doctor/:slug`, `/clinic/:slug` with SSR-ready meta, JSON-LD `Physician`/`MedicalClinic`, sitemap, `/llms.txt`
   - Insurance-aware filter: pick payer → only show in-network providers (joins `insurance_cards` ↔ `provider_insurance_networks`)
   - Reviews & ratings (`provider_reviews` table + moderation queue)

2. **Instant booking funnel**
   - 3-tap booking: specialty → next slot → confirm
   - Guest checkout that creates account post-booking via magic link / phone OTP
   - Calendar sync (.ics download + Google Cal optional connector)
   - No-show fee charging via saved card / wallet hold

3. **Telehealth product**
   - Public "See a doctor now" queue routing patient → next available doctor in specialty (uses `queue_tokens` U-prefix)
   - Pre-consult AI intake (already partially built in `IntakeForm`) feeding doctor view

4. **Family accounts**
   - `family_members` table, switcher in app header, separate medical records per member, parent-managed minors

5. **Provider growth tools**
   - Public profile editor, photo upload, education/credentials, languages, accepted insurances
   - Referral links (`referral_links`) with attribution + commission credit to wallet

---

## Phase 3 — Differentiators (AI / Africa / Super-app / FHIR, ~4 weeks)

### 3a. AI everywhere (Doc'O Clock expansion)
- **Ambient scribe**: in-consult recorder → Whisper transcript → MedGemma SOAP note → auto-fills `consultation_notes`
- **AI coding assist**: suggests ICD-10 / CPT codes on diagnosis entry; one-click accept
- **Imaging triage**: existing `medgemma-3d-imaging` extended with batch radiology queue
- **AI follow-up summaries**: post-discharge summary auto-generated, multilingual, sent via WhatsApp/SMS
- **Smart triage routing**: symptom collector → urgency score → routes to GP / specialist / ER / pharmacist
- **Drug interaction natural-language explainer** on prescription submit
- **AI dashboard "What needs attention now"** widget per role (uses `cxo_dashboard_metrics` + Lovable AI Gateway with `openai/gpt-5.2`)

### 3b. Africa-first infrastructure
- **Offline-first PWA**: IndexedDB write-queue with conflict resolution for appointments, prescriptions, vitals; "syncing N records" status pill (build on existing offline IndexedDB)
- **USSD gateway**: Africa's Talking integration — `*123*HEALTH#` to book/cancel/check queue; new `ussd-gateway` edge function
- **WhatsApp Business**: appointment confirmations, lab results, prescription pickup notifications via Twilio WhatsApp connector
- **Mobile money payouts**: provider earnings out via MTN/Airtel/Zamtel; uses already-deployed `process-mobile-money`
- **Low-bandwidth mode**: image lazy-strip, text-only fallback toggle in Settings
- **Local language packs**: en, fr, sw, bem, ny, nya, zu, ar — i18next bundles

### 3c. Patient super-app
- **Family wallet** with sub-balances + per-member spending caps
- **Vaccination passport** with QR + WHO-style record export (`vaccinations` table)
- **Health gamification**: dedicated `Achievements.tsx` page surfacing `badges`, streaks, leaderboards for steps/medication adherence
- **IoT vitals** hub: BLE pairing for BP cuff, glucometer, oximeter; sync to `vital_signs`
- **Insurance card OCR + auto-verify** (Phase 0) + claim self-submission

### 3d. Open standards & interoperability
- **FHIR R4 server endpoints** (already have export — add read/write): `Patient`, `Encounter`, `Observation`, `MedicationRequest`, `DiagnosticReport` via edge functions
- **HL7 v2 ingest** for legacy lab analyzers
- **Health-ID**: portable patient ID with QR (ABDM/NHIMA-style)
- **Cryptographic audit trail**: replace fake "blockchain" — append-only `medical_record_audit` with SHA-256 hash of (prev_hash + payload); verify endpoint
- **Public Developer Portal**: `/developers` page with API keys, OpenAPI spec, webhooks (`webhook_subscriptions` table), rate limits via `feature_gates`

---

## Phase 4 — Open platform & moat (~2 weeks)

- **Marketplace of integrations**: directory of third-party apps using our APIs (revenue share via `commission_settings`)
- **White-label mode**: hospital chains can theme via `institution_branding` (logo, primary color, domain)
- **Native mobile shells**: Capacitor wrap for iOS/Android stores
- **Compliance pack**: HIPAA-ready audit logs (`security_audit_log`), GDPR data export & delete, Zambia DPA + Kenya DPA notices, SOC2-friendly RLS reviews
- **Provider verification**: government-ID + medical-board number check workflow (already partially via `HealthcareApplication`)

---

## Technical details

### New tables (migration outline)
- `medical_record_audit` (prev_hash, payload_hash, actor_id, action, ts)
- `provider_insurance_networks` (provider_id, insurer_id, plan_codes[])
- `provider_reviews` (provider_id, patient_id, rating, body, status)
- `family_members` (primary_user_id, member_user_id, relation, can_manage)
- `institution_branches` (institution_id, name, address, geo)
- `institution_branding` (institution_id, logo_url, primary_hsl, custom_domain)
- `webhook_subscriptions` (owner_id, event, url, secret, active)
- `developer_api_keys` (owner_id, hashed_key, scopes[], rate_limit)
- `service_pricing` (institution_id, service_code, base_price, currency)
- Each table includes `GRANT` + RLS as per project rules

### Edge functions to add
- `cron-appointment-reminders` (calls existing `send-appointment-reminder`)
- `ussd-gateway` (Africa's Talking webhook)
- `whatsapp-dispatch` (Twilio template messages)
- `fhir-r4-resource` (REST GET/POST/PUT per resource)
- `hl7-v2-ingest`
- `ambient-scribe` (audio → transcript → SOAP via Lovable AI Gateway)
- `code-suggest` (diagnosis text → ICD-10/CPT)
- `audit-verify` (recompute hash chain integrity)
- `webhook-dispatch` (signed POSTs to registered URLs)

### Connectors to enable
- Twilio (SMS + WhatsApp) — `standard_connectors--connect`
- Resend (transactional email upgrade)
- Mapbox/Google Maps (provider discovery + ambulance map)
- Africa's Talking (USSD/SMS in Africa) — manual secret if no connector
- DPO Pay / Flutterwave — manual secrets

### Architecture rules to keep
- Semantic dark-mode tokens only; `patient_id` for clinical records; explicit `any` casts for missing Supabase types; offline IndexedDB queue; `ListSkeleton`/`EmptyState`/`ErrorDisplay` everywhere; `STANDALONE_ROUTES` for public pages; server-side role re-validation; `CRON_SECRET` on scheduled functions; HSL semantic colors only.

### Sequencing
Phase 0 ships in parallel with planning Phase 1. Phases 1 & 2 can run in parallel (different surfaces). Phase 3 starts once Phase 0 lands. Phase 4 closes the loop.

### Success metrics
- Zero orphaned edge functions or tables
- ≥3 active payment rails (PayPal, mobile money, DPO)
- p50 booking time < 30s on public funnel
- Offline write queue empty within 60s of reconnect
- FHIR conformance test suite passing for 5 resource types
- 90-day clinical data access policy preserved (already in security memory)

---

## What I won't touch unless asked
- Replacing existing AI provider (MedGemma stays for medical chat per memory)
- Reworking onboarding gender field (binary Select stays per memory)
- Removing dashboard scaling patterns (mobile flex-scrolling stays)
- Adding lists of open security findings to security memory

Approve to start with **Phase 0** (orphan wiring + mock removal), or tell me to reorder/cut phases.
