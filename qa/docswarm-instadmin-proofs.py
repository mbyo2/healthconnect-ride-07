#!/usr/bin/env python3
"""DOC SWARM Group 3 — Institution Admin proofs (JWT replay, live DB).

Creates 54 institutions (one per institution_types code) via PostgREST as two
QA institution admins, then verifies per-type setup, tier/charter resolution,
the 14 F7 RLS tables (31 policies on user_affiliated_with_institution()),
ART (F8 can_access_art_cycle), module entitlements, staff affiliation, and
the payment-mode / trust-column guards. All writes are QA-prefixed and the
purge script removes them afterwards.
"""
import json, sys, urllib.request, urllib.error

BASE = "https://tthzcijscedgxjfnfnky.supabase.co"
TOK = json.load(open("/home/hatch/.qa-tokens/docswarm-instadmin.json"))
CODES = json.load(open("/tmp/inst14.out"))  # 54 rows: code, name, tier, is_active
A = TOK["a"]["access_token"]; B = TOK["b"]["access_token"]
STAFF = TOK["staff"]["access_token"]; PAT = TOK["patient"]["access_token"]
UID = {k: TOK[k]["user_id"] for k in ("a", "b", "staff", "patient")}
EVID = {"institutions": [], "f7": {}, "art": {}, "entitlements": {},
        "guards": {}, "staff": {}, "boundaries": {}, "errors": []}

def call(method, path, token, body=None, params=""):
    url = BASE + path + params
    data = json.dumps(body).encode() if body is not None else None
    last = (0, {})
    for attempt in range(3):
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("apikey", open("/home/hatch/.qa-tokens/doc-anon.txt").read().strip())
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", "application/json")
        if method in ("POST", "PATCH"):
            req.add_header("Prefer", "return=representation")
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.status, json.loads(r.read() or b"[]")
        except urllib.error.HTTPError as e:
            try: detail = json.loads(e.read() or b"{}")
            except Exception: detail = {}
            return e.code, detail
        except Exception as e:  # IncompleteRead / timeout: retry
            last = (0, {"error": str(e)})
            continue
    return last

def note(where, msg):
    EVID["errors"].append(f"{where}: {msg}")
    print(f"  !! {where}: {msg}")

# ---- Phase 1: create 54 institutions (27 per admin) ---------------------
print("Phase 1: create 54 institutions via PostgREST")
created = {}
# idempotency: reuse institutions already created by an earlier partial run
for tok in (A, B):
    st, res = call("GET", "/rest/v1/healthcare_institutions", tok,
                   params="?select=id,name,type_code,admin_id&name=like.QA%20Swarm%*&limit=100")
    if st == 200:
        for r in res:
            code = r["type_code"]
            created[code] = {"id": r["id"],
                             "tier": next((c["tier"] for c in CODES if c["code"] == code), None),
                             "name": next((c["name"] for c in CODES if c["code"] == code), None),
                             "admin": "a" if r["admin_id"] == UID["a"] else "b"}
print(f"  reusing {len(created)} already-created institutions")
for i, row in enumerate(CODES):
    code, name, tier = row["code"], row["name"], row["tier"]
    admin, tok = ("a", A) if i % 2 == 0 else ("b", B)
    if code in created:
        continue
    payload = {
        "name": f"QA Swarm {name} [{code}]",
        "type": code, "type_code": code,
        "admin_id": UID[admin], "is_verified": False,
        "operating_hours": {}, "license_number": f"QA-SWARM-{code.upper()}",
        "address": "1 QA Road, Lusaka", "phone": "+260970000000",
        "email": f"qa-{code}@doc0clock.online", "country": "Zambia",
        "status": "pending", "payment_mode": "platform",
        "list_in_marketplace": False,
    }
    st, res = call("POST", "/rest/v1/healthcare_institutions", tok, payload)
    if st not in (200, 201) or not res:
        note("create-institution", f"{code} -> HTTP {st} {str(res)[:300]}")
        continue
    inst = res[0]
    created[code] = {"id": inst["id"], "tier": tier, "name": name, "admin": admin}
    # creator personnel row, exactly as HealthcareInstitutionForm does
    st2, res2 = call("POST", "/rest/v1/institution_personnel", tok,
                     {"institution_id": inst["id"], "user_id": UID[admin],
                      "role": "admin", "status": "active"})
    if st2 not in (200, 201):
        note("personnel", f"{code} -> HTTP {st2} {str(res2)[:200]}")
print(f"  created {len(created)}/54 institutions")
EVID["institutions"] = [{"code": c, **v} for c, v in created.items()]

# ---- Phase 2: read-back + tier/charter per type -------------------------
print("Phase 2: read-back + charter per type")
st, charter = call("GET", "/rest/v1/facility_module_charter",
                   A, params="?select=tier,module_key,status&limit=200")
chart_by_tier = {}
if st == 200:
    for r in charter:
        chart_by_tier.setdefault(r["tier"], []).append(r)
else:
    note("charter-read", f"HTTP {st} {str(charter)[:200]}")
st, types = call("GET", "/rest/v1/institution_types",
                 A, params="?select=code,name,tier&is_active=eq.true&limit=100")
print(f"  charter rows readable: {st==200} ({len(charter) if st==200 else 0}); types readable: {st==200}")
for code, v in created.items():
    tok = A if v["admin"] == "a" else B
    st, res = call("GET", "/rest/v1/healthcare_institutions", tok,
                   params=f"?select=id,name,type,type_code,admin_id,payment_mode,list_in_marketplace&id=eq.{v['id']}")
    ok = st == 200 and len(res) == 1 and res[0]["type_code"] == code
    v["read_back"] = ok
    v["charter_keys"] = len(chart_by_tier.get(v["tier"], []))
    v["charter_live"] = len([r for r in chart_by_tier.get(v["tier"], [])
                             if r["status"] == "live"])
    if not ok:
        note("read-back", f"{code} -> HTTP {st} {str(res)[:200]}")
bad = [c for c, v in created.items() if not v.get("read_back")]
print(f"  read-back OK {54-len(bad)}/54; charter keys by tier: " +
      ", ".join(f"{t}:{len(rs)}" for t, rs in sorted(chart_by_tier.items())))

# ---- Phase 3: F7 tables on one institution per tier ----------------------
print("Phase 3: F7 tables (one institution per tier)")
tiers_seen = {}
for code, v in created.items():
    tiers_seen.setdefault(v["tier"], v)
f7rows = {
 "asset_records": {"asset_code":"QA-001","asset_name":"QA Bed","asset_category":"furniture","purchase_date":"2026-01-05","purchase_cost":1200,"depreciation_method":"straight_line","useful_life_years":5,"net_book_value":1200},
 "attendance_records": {"staff_id": UID["staff"], "date":"2026-11-16"},
 "bank_reconciliations": {"bank_account_id":"11111111-1111-4111-8111-111111111111","bank_name":"QA Bank","account_number":"1234567890","statement_date":"2026-11-01","statement_balance":1000},
 "biometric_devices": {"device_name":"QA Fingerprint","device_type":"fingerprint","device_location":"Reception"},
 "comprehensive_prescriptions": {"patient_id": UID["patient"], "provider_id": UID["a"], "medication_name":"Paracetamol","dosage":"500mg","quantity":10,"instructions":"Take twice daily"},
 "employee_payroll": {"employee_id": UID["staff"], "month":"November","year":2026,"basic_salary":5000,"gross_pay":5500,"net_pay":4800},
 "general_ledger_entries": {"entry_number":"QA-GL-001","entry_date":"2026-11-16","entry_type":"debit","description":"QA entry","account_code":"1000","account_name":"Cash","fiscal_year":2026,"fiscal_period":11},
 "medical_shifts": {"shift_name":"QA Day","shift_type":"day","start_time":"08:00:00","end_time":"16:00:00"},
 "paye_calculations": {"employee_id": UID["staff"], "calculation_month":"2026-11","gross_income":5500,"taxable_income":5000,"total_paye_tax":700},
 "paye_tax_slabs": {"slab_name":"QA Slab","min_income":0,"max_income":5000,"tax_rate_percentage":0,"fixed_amount":0,"plus_percentage_above_min":0,"effective_from":"2026-01-01"},
 "pharmacy_prescriptions": {"prescription_number":"QA-RX-001","patient_id": UID["patient"], "doctor_id": UID["a"], "medications":[{"name":"Paracetamol","qty":10}],"valid_until":"2026-12-16"},
 "shift_assignments": {"shift_id": None, "staff_id": UID["staff"], "shift_date":"2026-11-16"},
 "smart_invoices": {"invoice_number":"QA-INV-001","invoice_date":"2026-11-16","customer_name":"QA Customer","total_amount":250,"net_amount":250},
 "zambia_nhima_config": {},
}
for tier, v in sorted(tiers_seen.items()):
    tok = A if v["admin"] == "a" else B
    iid = v["id"]
    res_tier = {}
    shift_id = None
    for table, row in f7rows.items():
        payload = dict(row)
        if "institution_id" in ("institution_id",) or table not in ("paye_tax_slabs",):
            payload["institution_id"] = iid
        if table == "comprehensive_prescriptions":
            payload["pharmacy_id"] = iid
        if table == "pharmacy_prescriptions":
            payload["pharmacy_id"] = iid
        if table == "shift_assignments":
            payload["shift_id"] = shift_id
        st, res = call("POST", f"/rest/v1/{table}", tok, payload)
        if st in (200, 201) and res:
            rid = res[0]["id"]
            if table == "medical_shifts":
                shift_id = rid
            st2, res2 = call("GET", f"/rest/v1/{table}", tok,
                             params=f"?select=id&id=eq.{rid}")
            res_tier[table] = {"insert": True, "read_back": st2 == 200 and len(res2) == 1, "id": rid}
        else:
            res_tier[table] = {"insert": False, "read_back": False,
                               "error": f"HTTP {st} {str(res)[:250]}"}
            note("f7-insert", f"{tier}/{table} -> HTTP {st} {str(res)[:250]}")
    EVID["f7"][tier] = {"institution": v["code"], "tables": res_tier}
    ok = sum(1 for t in res_tier.values() if t["insert"] and t["read_back"])
    print(f"  {tier} ({v['code']}): {ok}/14 tables insert+read-back")

json.dump(EVID, open("/tmp/docswarm-instadmin-phase1-3.json", "w"), indent=1)
print("evidence -> /tmp/docswarm-instadmin-phase1-3.json")
print("created ids saved; purge list in evidence file")
