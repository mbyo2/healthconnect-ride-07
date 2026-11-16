#!/usr/bin/env python3
"""Targeted re-probe: clinical-note insert with record_type='consultation'
(the value EMRCaseSheets writes) for all 27 providers, after migration
20261116_add_consultation_record_type. Also verifies the patient can read
each note back. Appends results to swarm_provider_results.json."""
import json, os, subprocess, time

SUPABASE_URL = "https://tthzcijscedgxjfnfnky.supabase.co"
ANON = open(os.path.expanduser("~/.qa-work/doc-anonkey.txt")).read().strip()
TOKENS = json.load(open(os.path.expanduser("~/.qa-tokens/docswarm-provider.json")))
PW = TOKENS["password"]
RESULTS = os.path.expanduser("~/workspace/docswarm-provider/proofs/swarm_provider_results.json")

def curl(method, path, token, body=None, params=""):
    cmd = ["curl", "-sS", "--max-time", "60", "-X", method,
           f"{SUPABASE_URL}{path}{params}",
           "-H", f"apikey: {ANON}", "-H", f"Authorization: Bearer {token}",
           "-H", "Content-Type: application/json"]
    if body is not None:
        cmd += ["-d", json.dumps(body)]
    if method in ("POST", "PATCH"):
        cmd += ["-H", "Prefer: return=representation"]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    try:
        return json.loads(p.stdout) if p.stdout.strip() else None
    except Exception:
        return {"_raw": p.stdout[:300]}

def sign_in(email):
    for _ in range(3):
        d = curl("POST", "/auth/v1/token?grant_type=password", ANON, {"email": email, "password": PW})
        if isinstance(d, dict) and d.get("access_token"):
            return d["access_token"]
        time.sleep(2)
    raise RuntimeError(f"sign-in failed {email}")

data = json.load(open(RESULTS))
pat_jwt = sign_in(TOKENS["patient"]["email"])
pat_id = TOKENS["patient"]["uid"]
npass = 0
for prov in TOKENS["providers"]:
    role, uid = prov["role"], prov["uid"]
    jwt = sign_in(prov["email"])
    d = curl("POST", "/rest/v1/comprehensive_medical_records", jwt,
             {"patient_id": pat_id, "provider_id": uid, "record_type": "consultation",
              "title": f"Swarm consultation case sheet ({role})",
              "description": "QA consultation case sheet after record-type fix.",
              "clinical_data": {"soap": {"subjective": "QA", "objective": "QA",
                                          "assessment": "QA", "plan": "QA"}},
              "visit_date": "2026-11-17", "status": "active"})
    ok = isinstance(d, list) and len(d) > 0
    note_id = d[0]["id"] if ok else None
    back = ""
    if ok:
        d2 = curl("GET", "/rest/v1/comprehensive_medical_records", pat_jwt,
                  params=f"?id=eq.{note_id}&select=id,record_type")
        back = "patient-readback:PASS" if isinstance(d2, list) and d2 else f"patient-readback:FAIL:{d2}"
        npass += 1
    data["results"][role]["steps"]["clinical_note"] = "PASS" if ok else f"FAIL:{d}"
    data["results"][role]["steps"]["clinical_note_readback"] = back
    if ok:
        data["results"][role]["note_id"] = note_id
    print(f"{role}: clinical_note={'PASS' if ok else 'FAIL'} {back}", flush=True)

json.dump(data, open(RESULTS, "w"), indent=2)
print(f"clinical_note PASS {npass}/27")
