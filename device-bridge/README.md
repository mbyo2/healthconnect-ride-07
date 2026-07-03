# @doc-o-clock/device-bridge

On-site bridge that speaks the native protocols of hospital monitors and
forwards normalized readings to Doc'O Clock.

Supported today:

| Brand | Protocol | Default port |
|-------|----------|--------------|
| Generic HL7/MLLP | HL7 v2.4 ORU^R01 over MLLP | 2575 |
| Philips IntelliVue MX/MP | IntelliVue Data Export XML **and** HL7 | 24105 |
| GE CARESCAPE B450/B650/B850 | HL7 v2.4 (Unity Network) | 3001 |
| Dräger Infinity / Evita / Perseus | Medibus / Medibus.X over serial | `/dev/ttyUSB0` |
| Nihon Kohden Life Scope | HL7 v2.4 (OrgNet gateway) | 3002 |
| Mindray BeneVision N-series | HL7 v2.4 | 3003 |
| Welch Allyn Connex VSM / Spot LXi | HL7 v2.4 (Bluetooth via Connex CS) | 3004 |

## Quick start (Docker)

```bash
cp .env.example .env
cp devices.example.json devices.json
# fill in INSTITUTION_ID, BRIDGE_TOKEN, and your device inventory
docker compose up -d
```

## Pairing the bridge

1. In Doc'O Clock go to **Institution → Devices → Pair bridge**.
2. Copy the `INSTITUTION_ID` and the generated `BRIDGE_TOKEN` into `.env`.
3. Register each physical device in the same screen — the UUID it returns
   becomes the `id` for that device inside `devices.json`.
4. Point the monitor's HL7 export at the bridge host + adapter port
   (see table above). For Dräger, connect the serial cable and set
   `serial_path` in `devices.json`.

## How data lands in Doc'O Clock

Readings hit `POST /device-bridge-ingest` which:

- verifies the HMAC bridge token → institution match,
- confirms every `device_id` belongs to that institution,
- inserts into `device_data_feeds` (bedside dashboards subscribe via realtime),
- inserts into `device_alerts` when a value is flagged critical.

## Development

```bash
npm install
npm run dev          # runs src/index.ts with tsx
npm test             # vitest suite covering HL7 + Medibus parsing
```
