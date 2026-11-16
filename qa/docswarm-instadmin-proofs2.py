#!/usr/bin/env python3
"""DOC SWARM Group 3 — phases 2-7 (JWT replay, live DB). Transport is curl:
python urllib HTTPS to Supabase from this VM drops connections constantly
(IncompleteRead / RemoteDisconnected); curl is reliable.

Phase 2: read-back all 54 QA institutions + charter per tier.
Phase 3: F7 14 tables insert+read-back, one institution per tier.
  comprehensive_prescriptions: created by a verified-prescriber QA doctor
  (INSERT requires is_verified_prescriber), then read back as the owning
  institution admin via the pharmacy-affiliation path.
Phase 4: ART (F8) — create cycle, access matrix, staff assignment.
Phase 5: module entitlements — institution-admin upsert must 403 (dead
  Settings toggle); platform-admin grant/revoke/delete works.
Phase 6: payment-mode / trust-column guards + approval-request flows.
Phase 7: staff affiliation + cross-institution boundaries.
Evidence -> qa/evidence/docswarm-instadmin-evidence.json
"""
import json, subprocess

BASE = "https://tthzcijscedgxjfnfnky.supabase.co"
ANON = open("/home/hatch/.qa-tokens/doc-anon.txt").read().strip()
TOK = json.load(open("/home/hatch/.qa-tokens/docswarm-instadmin.json"))
CODES = json.load(open("/tmp/inst14.out"))
A = TOK["a"]["access_token"]; B = TOK["b"]["access_token"]
STAFF = TOK["staff"]["access_token"]; PAT = TOK["patient"]["access_token"]
PLAT = TOK["platform"]["access_token"]; DOC = TOK["doctor"]["access_token"]
UID = {k: TOK[k]["user_id"] for k in ("a", "b", "staff", "patient", "platform", "doctor")}
EVID = {"phase2": {}, "f7": {}, "art": {}, "entitlements": {},
        "guards": {}, "staff": {}, "boundaries": {}, "errors": []}

def call(method, path, token, body=None, params=""):
    url = BASE + path + params
    cmd = ["curl", "-sS", "--max-time", "30", "-w", "\n%{http_code}",
           "-X", method, url,
           "-H", f"apikey: {ANON}", "-H", f"Authorization: Bearer {token}",
           "-H", "Content-Type: application/json"]
    if method in ("POST", "PATCH"):
        cmd += ["-H", "Prefer: return=representation"]
    if body is not None:
        cmd += ["-d", json.dumps(body)]
    for _ in range(3 if method == "GET" else 1):
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        out = p.stdout.strip()
        if not out:
            continue
        *body_lines, code = out.rsplit("\n", 1)
        try:
            status = int(code)
        except ValueError:
            continue
        raw = "\n".join(body_lines)
        try:
            data = json.loads(raw or "[]")
        except Exception:
            data = {"raw": raw[:300]}
        if method == "GET" and status == 0:
            continue
        return status, data
    return 0, {"error": "curl transport failed after retries"}

def note(where, msg):
    EVID["errors"].append(f"{where}: {msg}")
    print(f"  !! {where}: {msg}")

insts = {}
for tok in (A, B):
    st, res = call("GET", "/rest/v1/healthcare_institutions", tok,
                   params="?select=id,name,type,type_code,admin_id,payment_mode,list_in_marketplace&name=ilike.*QA%20Swarm*&limit=100")
    if st != 200:
        note("load-institutions", f"HTTP {st} {str(res)[:200]}"); continue
    for r in res:
        insts[r["type_code"]] = r
print(f"loaded {len(insts)}/54 QA institutions")
assert len(insts) == 54, "not all 54 institutions present"

def owner_of(code):
    return ("a", A) if insts[code]["admin_id"] == UID["a"] else ("b", B)

# ---- Phase 2 -------------------------------------------------------------
print("Phase 2: read-back + charter")
st, charter = call("GET", "/rest/v1/facility_module_charter", A,
                   params="?select=tier,module_key,status&limit=200")
chart_by_tier = {}
if st == 200:
    for r in charter:
        chart_by_tier.setdefault(r["tier"], []).append(r)
else:
    note("charter-read", f"HTTP {st}")
ok_rb = 0
per_type = {}
for row in CODES:
    code = row["code"]
    admin, tok = owner_of(code)
    st, res = call("GET", "/rest/v1/healthcare_institutions", tok,
                   params=f"?select=id&type_code&id=eq.{insts[code]['id']}")
    good = st == 200 and len(res) == 1
    ok_rb += good
    per_type[code] = {"name": row["name"], "tier": row["tier"], "admin": admin,
                      "read_back": good,
                      "charter_keys": len(chart_by_tier.get(row["tier"], [])),
                      "charter_live": len([r for r in chart_by_tier.get(row["tier"], [])
                                          if r["status"] == "live"])}
    if not good:
        note("read-back", f"{code} HTTP {st} {str(res)[:200]}")
EVID["phase2"] = {"read_back_ok": ok_rb, "per_type": per_type,
                  "charter_by_tier": {t: len(v) for t, v in chart_by_tier.items()}}
print(f"  read-back {ok_rb}/54; charter: " +
      ", ".join(f"{t}:{len(v)}" for t, v in sorted(chart_by_tier.items())))

# ---- Phase 3: F7 ----------------------------------------------------------
print("Phase 3: F7 tables (one institution per tier)")
tiers_seen = {}
for row in CODES:
    tiers_seen.setdefault(row["tier"], row["code"])

def get_first(table, tok, params):
    st, res = call("GET", f"/rest/v1/{table}", tok, params=params)
    if st == 200 and res:
        return res[0]
    return None

for tier, code in sorted(tiers_seen.items()):
    admin, tok = owner_of(code)
    iid, owner = insts[code]["id"], UID[admin]
    res_tier = {}
    sfx = tier  # per-tier unique suffix (several keys are globally unique)
    ex = get_first("medical_shifts", tok, f"?select=id&institution_id=eq.{iid}&shift_name=eq.QA%20Day&limit=1")
    if ex:
        shift_id = ex["id"]
        res_tier["medical_shifts"] = {"insert": True, "read_back": True, "id": shift_id, "pre_existing": True}
    else:
        st, res = call("POST", "/rest/v1/medical_shifts", tok,
                       {"institution_id": iid, "shift_name": "QA Day", "shift_type": "day",
                        "start_time": "08:00:00", "end_time": "16:00:00"})
        if st in (200, 201) and res:
            shift_id = res[0]["id"]
            st2, r2 = call("GET", "/rest/v1/medical_shifts", tok, params=f"?select=id&id=eq.{shift_id}")
            res_tier["medical_shifts"] = {"insert": True, "read_back": st2 == 200 and len(r2) == 1, "id": shift_id}
        else:
            shift_id = None
            res_tier["medical_shifts"] = {"insert": False, "error": f"HTTP {st} {str(res)[:250]}"}
            note("f7", f"{tier}/medical_shifts HTTP {st} {str(res)[:250]}")
    # (table, unique-col, unique-val, payload) — payload gets institution_id
    # added except comprehensive_prescriptions (pharmacy_id instead).
    rows = [
     ("asset_records", "asset_code", f"QA-001-{sfx}", {"asset_code": f"QA-001-{sfx}", "asset_name": "QA Bed", "asset_category": "furniture", "purchase_date": "2026-01-05", "purchase_cost": 1200, "depreciation_method": "straight_line", "useful_life_years": 5, "net_book_value": 1200}),
     ("attendance_records", None, None, {"staff_id": UID["staff"], "date": "2026-11-16"}),
     ("bank_reconciliations", None, None, {"bank_account_id": "11111111-1111-4111-8111-111111111111", "bank_name": "QA Bank", "account_number": "1234567890", "statement_date": "2026-11-01", "statement_balance": 1000}),
     ("biometric_devices", None, None, {"device_name": "QA Fingerprint", "device_type": "fingerprint", "device_location": "Reception"}),
     ("employee_payroll", None, None, {"employee_id": UID["staff"], "month": "November", "year": 2026, "basic_salary": 5000, "gross_pay": 5500, "net_pay": 4800}),
     ("general_ledger_entries", "entry_number", f"QA-GL-001-{sfx}", {"entry_number": f"QA-GL-001-{sfx}", "entry_date": "2026-11-16", "entry_type": "journal", "description": "QA entry", "account_code": "1000", "account_name": "Cash", "fiscal_year": 2026, "fiscal_period": 11}),
     ("paye_calculations", None, None, {"employee_id": UID["staff"], "calculation_month": "2026-11", "gross_income": 5500, "taxable_income": 5000, "total_paye_tax": 700}),
     ("paye_tax_slabs", "slab_name", f"QA Slab {sfx}", {"slab_name": f"QA Slab {sfx}", "min_income": 0, "max_income": 5000, "tax_rate_percentage": 0, "fixed_amount": 0, "plus_percentage_above_min": 0, "effective_from": "2026-01-01"}),
     ("pharmacy_prescriptions", "prescription_number", f"QA-RX-001-{sfx}", {"prescription_number": f"QA-RX-001-{sfx}", "patient_id": UID["patient"], "doctor_id": owner, "pharmacy_id": iid, "medications": [{"name": "Paracetamol", "qty": 10}], "valid_until": "2026-12-16"}),
     ("shift_assignments", None, None, {"shift_id": shift_id, "staff_id": UID["staff"], "shift_date": "2026-11-16"}),
     ("smart_invoices", "invoice_number", f"QA-INV-001-{sfx}", {"invoice_number": f"QA-INV-001-{sfx}", "invoice_date": "2026-11-16", "customer_name": "QA Customer", "total_amount": 250, "net_amount": 250}),
     ("zambia_nhima_config", None, None, {}),
    ]
    for table, keycol, keyval, payload in rows:
        payload = dict(payload)
        payload["institution_id"] = iid
        if keycol:
            ex = get_first(table, tok, f"?select=id&{keycol}=eq.{keyval}&limit=1")
            if ex:
                res_tier[table] = {"insert": True, "read_back": True, "id": ex["id"], "pre_existing": True}
                continue
        else:
            ex = get_first(table, tok, f"?select=id&institution_id=eq.{iid}&limit=1")
            if ex:
                res_tier[table] = {"insert": True, "read_back": True, "id": ex["id"], "pre_existing": True}
                continue
        if table == "shift_assignments" and not shift_id:
            res_tier[table] = {"insert": False, "error": "no shift id (medical_shifts failed)"}
            continue
        st, res = call("POST", f"/rest/v1/{table}", tok, payload)
        if st in (200, 201) and res:
            rid = res[0]["id"]
            st2, r2 = call("GET", f"/rest/v1/{table}", tok, params=f"?select=id&id=eq.{rid}")
            res_tier[table] = {"insert": True, "read_back": st2 == 200 and len(r2) == 1, "id": rid}
        else:
            res_tier[table] = {"insert": False, "error": f"HTTP {st} {str(res)[:250]}"}
            note("f7", f"{tier}/{table} HTTP {st} {str(res)[:250]}")
    # comprehensive_prescriptions: doctor creates, admin reads via affiliation
    ex = get_first("comprehensive_prescriptions", DOC,
                   f"?select=id&pharmacy_id=eq.{iid}&medication_name=eq.Paracetamol&limit=1")
    if ex:
        rid = ex["id"]
        st2, r2 = call("GET", "/rest/v1/comprehensive_prescriptions", tok, params=f"?select=id&id=eq.{rid}")
        res_tier["comprehensive_prescriptions"] = {"insert": True, "read_back": st2 == 200 and len(r2) == 1,
                                                    "id": rid, "pre_existing": True,
                                                    "created_by": "verified-prescriber doctor"}
    else:
        st, res = call("POST", "/rest/v1/comprehensive_prescriptions", DOC,
                       {"patient_id": UID["patient"], "provider_id": UID["doctor"],
                        "pharmacy_id": iid, "medication_name": "Paracetamol",
                        "dosage": "500mg", "quantity": 10, "instructions": "Take twice daily"})
        if st in (200, 201) and res:
            rid = res[0]["id"]
            st2, r2 = call("GET", "/rest/v1/comprehensive_prescriptions", tok, params=f"?select=id&id=eq.{rid}")
            res_tier["comprehensive_prescriptions"] = {"insert": True,
                "read_back": st2 == 200 and len(r2) == 1, "id": rid,
                "created_by": "verified-prescriber doctor"}
        else:
            res_tier["comprehensive_prescriptions"] = {"insert": False, "error": f"HTTP {st} {str(res)[:250]}"}
            note("f7", f"{tier}/comprehensive_prescriptions HTTP {st} {str(res)[:250]}")
    EVID["f7"][tier] = {"institution": code, "institution_id": iid, "tables": res_tier}
    ok = sum(1 for t in res_tier.values() if t.get("insert") and t.get("read_back"))
    print(f"  {tier} ({code}): {ok}/{len(res_tier)} tables insert+read-back")

json.dump(EVID, open("qa/evidence/docswarm-instadmin-evidence.json", "w"), indent=1)
print("evidence checkpoint -> qa/evidence/docswarm-instadmin-evidence.json")
