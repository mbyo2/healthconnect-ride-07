#!/usr/bin/env python3
"""Doc swarm group 2: per-profession provider workflow probe (JWT replays = live-verified).
For each of the 27 professions, with the QA patient:
  sign-in -> onboarding profile PATCH (fee min/max) -> availability insert
  -> wallet read/create -> patient books appointment -> provider accepts
  (confirm) -> video consultation create -> clinical note create
  -> vitals insert (expect OK only for 9 roles) -> prescription insert
  (expect OK only for 6 prescribers) -> lab order insert (expect OK only
  for 6 ordering roles) -> complete + follow_up_status -> earnings/wallet
  reads -> patient-side visibility checks.
Writes proofs/swarm_provider_results.json. Prints one line per role.
Never prints the QA password."""
import json, os, subprocess, sys, time

SUPABASE_URL = "https://tthzcijscedgxjfnfnky.supabase.co"
ANON = open(os.path.expanduser("~/.qa-work/doc-anonkey.txt")).read().strip()
TOKENS = json.load(open(os.path.expanduser("~/.qa-tokens/docswarm-provider.json")))
PW = TOKENS["password"]
PATIENT = TOKENS["patient"]
PROVIDERS = TOKENS["providers"]
GATE14_CLINIC = "a0e0a0e0-1111-4111-8111-111111111114"  # read-only FK reference for lab orders
DATE = "2026-11-17"  # Tue

PRESCRIBERS = {"doctor", "specialist", "medical_licentiate", "clinical_officer", "dentist", "optometrist"}
LAB_ORDERERS = {"doctor", "specialist", "medical_licentiate", "clinical_officer", "dentist", "radiologist"}
VITALS_ROLES = {"nurse", "registered_nurse", "enrolled_nurse", "midwife", "doctor",
                "specialist", "clinical_officer", "medical_licentiate", "pharmacist"}

def curl(method, path, token, body=None, params=""):
    cmd = ["curl", "-sS", "--max-time", "60", "-X", method,
           f"{SUPABASE_URL}{path}{params}",
           "-H", f"apikey: {ANON}",
           "-H", f"Authorization: Bearer {token}",
           "-H", "Content-Type: application/json"]
    if body is not None:
        cmd += ["-d", json.dumps(body)]
    if method in ("POST", "PATCH"):
        cmd += ["-H", "Prefer: return=representation"]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    try:
        data = json.loads(p.stdout) if p.stdout.strip() else None
    except Exception:
        data = {"_raw": p.stdout[:300], "_stderr": p.stderr[:200]}
    return data

def sign_in(email):
    for attempt in range(3):
        d = curl("POST", "/auth/v1/token?grant_type=password", ANON,
                 {"email": email, "password": PW})
        if isinstance(d, dict) and d.get("access_token"):
            return d["access_token"]
        time.sleep(2)
    raise RuntimeError(f"sign-in failed for {email}: {str(d)[:300]}")

def ok(data):
    """PostgREST success: list with >=1 row, or dict without error code."""
    if isinstance(data, list):
        return len(data) > 0
    if isinstance(data, dict):
        return "code" not in data and "message" not in data
    return False

def errcode(data):
    if isinstance(data, dict):
        return data.get("code") or data.get("message") or str(data)[:120]
    return f"list[{len(data)}]" if isinstance(data, list) else str(data)[:120]

results = {}
pat_jwt = sign_in(PATIENT["email"])
pat_id = PATIENT["uid"]
print(f"patient signed in {pat_id[:8]}...", flush=True)

for prov in PROVIDERS:
    role = prov["role"]; uid = prov["uid"]; email = prov["email"]
    r = {"role": role, "uid": uid, "steps": {}}
    try:
        jwt = sign_in(email)
        r["steps"]["signin"] = "PASS"
        # 1 onboarding: profile PATCH as the provider (own-profile path)
        d = curl("PATCH", "/rest/v1/profiles", jwt,
                 {"first_name": "Swarm", "last_name": role.replace("_", " ").title(),
                  "specialty": role, "consultation_fee_min": 150, "consultation_fee_max": 300,
                  "accepting_patients": True, "show_in_search": True,
                  "is_profile_complete": True, "years_experience": 5,
                  "location": "Lusaka", "bio": "Swarm QA provider"},
                 params=f"?id=eq.{uid}")
        r["steps"]["onboarding_profile_fee"] = "PASS" if ok(d) else f"FAIL:{errcode(d)}"
        # 2 availability (Mon-first 0=Mon..6=Sun, matching the trigger's
        # (DOW+6)%7 and the client's DAY_KEYS; Tue 2026-11-17 = 1).
        # Clear any rows from the earlier probe run first (own rows: DELETE allowed).
        curl("DELETE", "/rest/v1/provider_availability", jwt,
             params=f"?provider_id=eq.{uid}")
        d = curl("POST", "/rest/v1/provider_availability", jwt,
                 {"provider_id": uid, "day_of_week": 1, "start_time": "09:00:00", "end_time": "17:00:00"})
        r["steps"]["availability"] = "PASS" if ok(d) else f"FAIL:{errcode(d)}"
        # 3 wallet: read (trigger may have created it), else create zero-balance
        d = curl("GET", "/rest/v1/user_wallets", jwt, params=f"?user_id=eq.{uid}&select=id,balance")
        if isinstance(d, list) and d:
            r["steps"]["wallet"] = f"PASS:exists balance={d[0].get('balance')}"
        else:
            d2 = curl("POST", "/rest/v1/user_wallets", jwt,
                      {"user_id": uid, "balance": 0, "currency": "ZMW"})
            r["steps"]["wallet"] = "PASS:created" if ok(d2) else f"FAIL:{errcode(d2)}"
        # 4 patient books appointment
        appt_body = {"patient_id": pat_id, "provider_id": uid, "date": DATE, "time": "10:00",
                     "status": "pending", "type": "consultation",
                     "appointment_date": DATE, "appointment_time": "10:00",
                     "appointment_type": "consultation", "duration": 30,
                     "consultation_fee": 150, "notes": "Swarm QA consultation"}
        d = curl("POST", "/rest/v1/appointments", pat_jwt, appt_body)
        if ok(d):
            appt_id = d[0]["id"]
            r["steps"]["patient_books"] = "PASS"
            r["appt_id"] = appt_id
        else:
            r["steps"]["patient_books"] = f"FAIL:{errcode(d)}"
            results[role] = r
            print(f"{role}: BOOK-FAIL {r['steps']['patient_books']}", flush=True)
            continue
        # 5 provider accepts (confirm)
        d = curl("PATCH", "/rest/v1/appointments", jwt, {"status": "confirmed"},
                 params=f"?id=eq.{appt_id}")
        r["steps"]["provider_accepts"] = "PASS" if ok(d) else f"FAIL:{errcode(d)}"
        # 6 video consultation
        d = curl("POST", "/rest/v1/video_consultations", jwt,
                 {"patient_id": pat_id, "provider_id": uid, "appointment_id": appt_id,
                  "scheduled_start": f"{DATE}T10:00:00+02:00", "scheduled_end": f"{DATE}T10:30:00+02:00",
                  "status": "scheduled"})
        r["steps"]["video_consultation"] = "PASS" if ok(d) else f"FAIL:{errcode(d)}"
        if ok(d):
            r["video_id"] = d[0]["id"]
        # 7 clinical note
        d = curl("POST", "/rest/v1/comprehensive_medical_records", jwt,
                 {"patient_id": pat_id, "provider_id": uid, "record_type": "consultation_note",
                  "title": f"Swarm consultation note ({role})",
                  "description": "QA consultation: history, examination, assessment and plan.",
                  "clinical_data": {"soap": {"subjective": "QA", "objective": "QA",
                                              "assessment": "QA", "plan": "QA"}},
                  "visit_date": DATE, "status": "active"})
        r["steps"]["clinical_note"] = "PASS" if ok(d) else f"FAIL:{errcode(d)}"
        if ok(d):
            r["note_id"] = d[0]["id"]
        # 8 vitals (expect OK only for VITALS_ROLES)
        d = curl("POST", "/rest/v1/vital_signs", jwt,
                 {"user_id": pat_id, "heart_rate": 72, "blood_pressure_systolic": 120,
                  "blood_pressure_diastolic": 80, "temperature": 36.6, "oxygen_saturation": 98,
                  "respiratory_rate": 16, "weight": 70,
                  "metadata": {"recorded_by": uid, "notes": f"Swarm QA vitals ({role})"}})
        expect = role in VITALS_ROLES
        got = ok(d)
        r["steps"]["vitals"] = ("PASS" if got else f"REFUSED:{errcode(d)}")
        r["steps"]["vitals_expected"] = "PASS" if got == expect else f"UNEXPECTED got={got} expect={expect}"
        if got:
            r["vitals_id"] = d[0]["id"]
        # 9 prescription (expect OK only for PRESCRIBERS)
        d = curl("POST", "/rest/v1/comprehensive_prescriptions", jwt,
                 {"patient_id": pat_id, "provider_id": uid, "medication_name": "Amoxicillin",
                  "dosage": "500mg - Twice daily", "instructions": "Twice daily. Take with food",
                  "quantity": 14, "duration_days": 7, "prescribed_date": DATE, "status": "pending"})
        expect = role in PRESCRIBERS
        got = ok(d)
        r["steps"]["prescription"] = ("PASS" if got else f"REFUSED:{errcode(d)}")
        r["steps"]["prescription_expected"] = "PASS" if got == expect else f"UNEXPECTED got={got} expect={expect}"
        if got:
            r["rx_id"] = d[0]["id"]
        # 10 lab order (expect OK only for LAB_ORDERERS)
        d = curl("POST", "/rest/v1/lab_tests", jwt,
                 {"patient_id": pat_id, "ordered_by": uid, "entered_by": uid,
                  "order_source": "electronic", "lab_id": GATE14_CLINIC,
                  "test_type": "Full Blood Count", "test_category": "Haematology",
                  "test_number": f"LAB-SW-{role[:4].upper()}-01", "priority": "routine",
                  "status": "pending", "price": 0, "total_amount": 0, "balance": 0,
                  "payment_status": "paid"})
        expect = role in LAB_ORDERERS
        got = ok(d)
        r["steps"]["lab_order"] = ("PASS" if got else f"REFUSED:{errcode(d)}")
        r["steps"]["lab_expected"] = "PASS" if got == expect else f"UNEXPECTED got={got} expect={expect}"
        if got:
            r["lab_id"] = d[0]["id"]
        # 11 complete + follow-up
        d = curl("PATCH", "/rest/v1/appointments", jwt,
                 {"status": "completed", "notes": "Swarm QA consultation completed.",
                  "follow_up_status": "scheduled"},
                 params=f"?id=eq.{appt_id}")
        r["steps"]["complete_followup"] = "PASS" if ok(d) else f"FAIL:{errcode(d)}"
        # 12 earnings + wallet reads
        d = curl("GET", "/rest/v1/doctor_fraction_earnings", jwt,
                 params=f"?doctor_id=eq.{uid}&select=id")
        r["steps"]["earnings_read"] = "PASS" if isinstance(d, list) else f"FAIL:{errcode(d)}"
        d = curl("GET", "/rest/v1/user_wallets", jwt, params=f"?user_id=eq.{uid}&select=id,balance,currency")
        r["steps"]["wallet_read"] = ("PASS" if isinstance(d, list) and d else f"FAIL:{errcode(d)}")
        # 13 patient-side visibility
        d = curl("GET", "/rest/v1/appointments", pat_jwt,
                 params=f"?id=eq.{appt_id}&select=id,status,follow_up_status")
        r["steps"]["patient_sees_appt"] = "PASS" if isinstance(d, list) and d and d[0].get("status") == "completed" else f"FAIL:{errcode(d)}"
        d = curl("GET", "/rest/v1/provider_availability", pat_jwt,
                 params=f"?provider_id=eq.{uid}&select=id")
        r["steps"]["patient_sees_availability"] = "PASS" if isinstance(d, list) and d else f"FAIL:{errcode(d)}"
        d = curl("GET", "/rest/v1/profiles", pat_jwt,
                 params=f"?id=eq.{uid}&select=id,role,consultation_fee_min,consultation_fee_max,show_in_search")
        r["steps"]["patient_sees_provider_profile"] = ("PASS" if isinstance(d, list) and d and d[0].get("role") == role else f"FAIL:{errcode(d)}")
        if isinstance(d, list) and d:
            r["steps"]["fee_visible"] = ("PASS" if d[0].get("consultation_fee_min") == 150 else f"FAIL:fee={d[0].get('consultation_fee_min')}")
    except Exception as e:
        r["steps"]["exception"] = f"EXC:{str(e)[:300]}"
    results[role] = r
    summary = " ".join(f"{k}={v}" for k, v in r["steps"].items())
    print(f"{role}: {summary}", flush=True)

out = os.path.expanduser("~/workspace/docswarm-provider/proofs/swarm_provider_results.json")
with open(out, "w") as f:
    json.dump({"patient": PATIENT["email"], "patient_uid": pat_id, "results": results}, f, indent=2)
print(f"WROTE {out}")
npass = sum(1 for r in results.values()
            if all(v == "PASS" or (isinstance(v, str) and v.startswith("PASS"))
                   for k, v in r["steps"].items()
                   if not k.endswith("_expected")))
print(f"roles attempted: {len(results)}")
