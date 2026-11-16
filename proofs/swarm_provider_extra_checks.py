#!/usr/bin/env python3
"""Extra live checks: patient lab privacy (unverified orders invisible in the
patient view), patient reads own prescriptions, provider cannot see another
provider's appointments, provider payment_splits read returns cleanly."""
import json, os, subprocess, time

SUPABASE_URL = "https://tthzcijscedgxjfnfnky.supabase.co"
ANON = open(os.path.expanduser("~/.qa-work/doc-anonkey.txt")).read().strip()
TOKENS = json.load(open(os.path.expanduser("~/.qa-tokens/docswarm-provider.json")))
PW = TOKENS["password"]
RES = json.load(open(os.path.expanduser("~/workspace/docswarm-provider/proofs/swarm_provider_results.json")))

def curl(method, path, token, params=""):
    cmd = ["curl", "-sS", "--max-time", "60", "-X", method,
           f"{SUPABASE_URL}{path}{params}",
           "-H", f"apikey: {ANON}", "-H", f"Authorization: Bearer {token}"]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    try:
        return json.loads(p.stdout) if p.stdout.strip() else None
    except Exception:
        return {"_raw": p.stdout[:300]}

def sign_in(email):
    for _ in range(3):
        cmd = ["curl", "-sS", "--max-time", "60", "-X", "POST",
               f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
               "-H", f"apikey: {ANON}", "-H", "Content-Type: application/json",
               "-d", json.dumps({"email": email, "password": PW})]
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
        d = json.loads(p.stdout)
        if d.get("access_token"):
            return d["access_token"]
        time.sleep(2)
    raise RuntimeError(f"sign-in failed {email}")

pat_jwt = sign_in(TOKENS["patient"]["email"])
pat_id = TOKENS["patient"]["uid"]
out = {}

# 1. Patient lab view: unverified orders must NOT expose values.
d = curl("GET", "/rest/v1/lab_results_patient_view", pat_jwt, params=f"?patient_id=eq.{pat_id}&select=id,test_type,verified_at")
out["patient_lab_view_unverified"] = f"rows={len(d) if isinstance(d, list) else d}"
print("patient lab_results_patient_view:", out["patient_lab_view_unverified"])

# 2. Patient reads own prescriptions (6 prescribers wrote one each).
d = curl("GET", "/rest/v1/comprehensive_prescriptions", pat_jwt, params=f"?patient_id=eq.{pat_id}&select=id,provider_id,status")
n = len(d) if isinstance(d, list) else -1
out["patient_sees_prescriptions"] = f"rows={n} (expect 6)"
print("patient prescriptions:", out["patient_sees_prescriptions"])

# 3. Patient reads own vitals (9 roles wrote one each).
d = curl("GET", "/rest/v1/vital_signs", pat_jwt, params=f"?user_id=eq.{pat_id}&select=id")
n = len(d) if isinstance(d, list) else -1
out["patient_sees_vitals"] = f"rows={n} (expect 9)"
print("patient vitals:", out["patient_sees_vitals"])

# 4. Provider A cannot list provider B's appointments.
doc = TOKENS["providers"][0]; nurse = TOKENS["providers"][5]
doc_jwt = sign_in(doc["email"])
d = curl("GET", "/rest/v1/appointments", doc_jwt, params=f"?provider_id=eq.{nurse['uid']}&select=id")
out["cross_provider_appt_leak"] = f"rows={len(d) if isinstance(d, list) else d} (expect 0)"
print("doctor listing nurse appointments:", out["cross_provider_appt_leak"])

# 5. Provider payment_splits read (EarningsPanel source) returns cleanly.
d = curl("GET", "/rest/v1/payment_splits", doc_jwt, params=f"?recipient_id=eq.{doc['uid']}&select=id,amount,status")
out["provider_payment_splits_read"] = f"rows={len(d) if isinstance(d, list) else d} (expect 0, no error)"
print("doctor payment_splits:", out["provider_payment_splits_read"])

# 6. Non-prescriber cannot read another patient's prescriptions (none exist, but RLS shape).
# 7. Provider sees own lab orders they placed.
d = curl("GET", "/rest/v1/lab_tests", doc_jwt, params=f"?ordered_by=eq.{doc['uid']}&select=id,test_type,status")
out["doctor_sees_own_lab_orders"] = f"rows={len(d) if isinstance(d, list) else d} (expect 1)"
print("doctor own lab orders:", out["doctor_sees_own_lab_orders"])

RES["extra_checks"] = out
json.dump(RES, open(os.path.expanduser("~/workspace/docswarm-provider/proofs/swarm_provider_results.json"), "w"), indent=2)
print("WROTE extra checks")
