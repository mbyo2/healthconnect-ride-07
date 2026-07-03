# Device Bridge + Full Role Workflow Sweep

`patient_triage_sessions` is already live in the database, so no migration is needed. This plan covers the two remaining tracks.

## Track A — `/device-bridge` Node package

A standalone Node package (installed on-site at the hospital / diagnostic center) that speaks the native protocols of medical devices and forwards normalized readings to Doc'O Clock via Supabase.

### Package layout

```text
device-bridge/
  package.json          ── name: @doc-o-clock/device-bridge
  README.md
  .env.example          ── SUPABASE_URL, SUPABASE_SERVICE_ROLE, INSTITUTION_ID, BRIDGE_TOKEN
  src/
    index.ts            ── CLI entry, loads adapters, opens listeners
    config.ts           ── loads .env and device manifest
    supabase.ts         ── service-role client, insert into device_data_feeds + device_alerts
    normalizer.ts       ── vendor payload → canonical { device_id, metric, value, unit, ts, patient_id? }
    adapters/
      hl7-mllp.ts       ── TCP MLLP listener (0x0B/0x1C/0x0D framing), parses ORU^R01
      philips-intellivue.ts   ── IntelliVue Data Export (serial/TCP)
      ge-carescape.ts   ── Unity Network / S/5 protocol
      draeger-medibus.ts── Dräger Medibus over serial
      nihon-kohden.ts   ── OrgNet gateway (HL7 wrapper)
      mindray-benevision.ts   ── HL7 v2.4
      welch-allyn.ts    ── Connex Spot / VSM over BLE + HL7
    devices.json        ── per-site device inventory (IP, port, brand, model, room)
  tests/                ── vitest with fixture HL7 messages
```

### Supported brands & protocols (Phase 1)

| Brand | Model family | Transport | Payload |
|-------|--------------|-----------|---------|
| Philips | IntelliVue MX/MP | TCP or RS-232 | IntelliVue Data Export XML |
| GE Healthcare | CARESCAPE B450/B650/B850 | TCP | Unity Network HL7 v2.4 |
| Dräger | Infinity, Evita, Perseus | RS-232 | Medibus / Medibus.X |
| Nihon Kohden | Life Scope | TCP | HL7 v2.4 via OrgNet |
| Mindray | BeneVision N-series | TCP | HL7 v2.4 |
| Welch Allyn | Connex VSM, Spot LXi | TCP + Bluetooth | HL7 v2.4 |

Fallback for everything else: raw HL7/MLLP on TCP 2575.

### Data flow

```text
[Device] --HL7/vendor--> [device-bridge on-site]
    -> normalizer.ts (vendor → canonical)
    -> supabase.insert('device_data_feeds', {...})
       + supabase.insert('device_alerts', ...) when out-of-range
       + realtime channel push for live dashboards
```

Uses the existing `device_data_feeds` and `device_alerts` tables. No new tables needed.

### Deliverables

1. `device-bridge/` package with `hl7-mllp` and the six vendor adapters (adapters share a common `DeviceAdapter` interface).
2. `docker-compose.yml` so on-site IT can run `docker compose up -d`.
3. `docs/DEVICE_BRIDGE.md` — pairing steps: how to register a device in Doc'O Clock (Institution → Devices), copy the `BRIDGE_TOKEN`, and drop it in `.env`.
4. Vitest suite covering HL7 parsing, MLLP framing, and canonical normalization.

## Track B — Role-by-role workflow sweep

For each role, walk every navigable page, run the primary workflow end-to-end against the live app with Playwright, fix any breakage found, and record the pass in `docs/RELEASE_QA.md`.

Roles covered (in this order):

1. Patient
2. Doctor / Specialist
3. Nurse
4. Pharmacist + Pharmacy staff
5. Lab technician + Pathologist + Radiologist
6. Institution admin (Hospital / Clinic / Diagnostic Center)
7. Solo Provider
8. Admin
9. Superadmin

For each role I will:

- Log in, hit every menu item, capture a screenshot per screen.
- Complete the headline workflow (e.g. Doctor → open appointment → write prescription → drug interaction check fires → MAR entry → discharge).
- File and fix any runtime error, RLS denial, missing empty-state, or broken CTA on the spot.
- Verify realtime updates on the counterpart role (patient sees the prescription immediately, etc.).

Exit criteria: every role has a green row in `docs/RELEASE_QA.md` with the screenshot bundle and no unresolved console errors.

## Technical details

- Device bridge is a **separate Node package**, not part of the Vite app. It talks to Supabase over service-role with a per-institution `BRIDGE_TOKEN` header (validated by a small `device-bridge-ingest` edge function that maps token → `institution_id` before allowing the insert).
- New edge function `device-bridge-ingest` (auth: `verify_jwt = false`, validates `x-bridge-token`) so the bridge never ships the raw service role key to on-site machines.
- HL7 parsing uses `simple-hl7` (MIT, actively maintained). MLLP framing is implemented directly (~30 LOC) rather than pulling a heavier dep.
- Playwright QA runs headless in the sandbox against `http://localhost:8080` using the injected Supabase session; per-role sessions are minted through the existing `LOVABLE_BROWSER_SUPABASE_*` flow.
- No schema changes. `device_data_feeds`, `device_alerts`, `iot_devices`, and `institution_devices` already cover the ingest side.

## Order of execution

1. `device-bridge-ingest` edge function + token check (small, unblocks the package).
2. `device-bridge/` package with `hl7-mllp` + Philips + GE adapters, tests, Docker.
3. Remaining four vendor adapters.
4. Role sweep (patient → superadmin), fixing issues as they surface.
