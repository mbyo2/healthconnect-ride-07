# Device Bridge — operator guide

The device bridge is a small Node service the hospital's IT team runs on an
on-site machine (a Raspberry Pi / mini-PC is plenty). It translates the native
protocol of each medical device into Doc'O Clock's canonical vitals stream.

Full package + code: [`device-bridge/`](../device-bridge/README.md)

## What it talks to

Philips IntelliVue, GE CARESCAPE, Dräger (Medibus over serial), Nihon Kohden,
Mindray BeneVision, Welch Allyn Connex, plus any device that speaks generic
HL7 v2.4 ORU^R01 over MLLP.

## Server-side plumbing

- Edge function `device-bridge-ingest` receives batched readings.
- Auth is a per-institution HMAC: `x-bridge-token = HMAC_SHA256(DEVICE_BRIDGE_SECRET, institution_id)`.
- Data lands in `device_data_feeds` (+ `device_alerts` when critical) and
  updates `institution_devices.last_heartbeat`.
- Nothing on the bridge holds the Supabase service-role key.

## Pairing steps

1. Superadmin sets the `DEVICE_BRIDGE_SECRET` env var on the project.
2. Institution admin opens **Institution → Devices → Pair bridge**.
   The screen computes the HMAC for the current institution and shows the
   token to copy.
3. Register each device (brand, model, room). Copy the returned UUID.
4. On the on-site machine, fill in `.env` + `devices.json` and run
   `docker compose up -d`.
