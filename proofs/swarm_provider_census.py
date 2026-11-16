#!/usr/bin/env python3
"""Census of swarm-provider residue: counts rows touching any
swarm-provider-% uid across all plausibly-affected tables."""
import json, os, subprocess, sys

RUNNER = os.path.expanduser("~/workspace/docswarm-provider/proofs/docsql-provider.sh")
CHECKS = [
    ("auth.users", "email like 'swarm-provider-%'", "auth.users"),
    ("auth.identities", "user_id in (select id from auth.users where email like 'swarm-provider-%')", "auth.identities"),
    ("public.profiles", "id in (select id from auth.users where email like 'swarm-provider-%')", "public.profiles"),
    ("public.patients", "id in (select id from auth.users where email like 'swarm-provider-%') or user_id in (select id from auth.users where email like 'swarm-provider-%')", "public.patients"),
    ("public.user_roles", "user_id in (select id from auth.users where email like 'swarm-provider-%')", "public.user_roles"),
    ("public.appointments", "patient_id in (select id from auth.users where email like 'swarm-provider-%') or provider_id in (select id from auth.users where email like 'swarm-provider-%')", "public.appointments"),
    ("public.video_consultations", "patient_id in (select id from auth.users where email like 'swarm-provider-%') or provider_id in (select id from auth.users where email like 'swarm-provider-%')", "public.video_consultations"),
    ("public.comprehensive_medical_records", "patient_id in (select id from auth.users where email like 'swarm-provider-%') or provider_id in (select id from auth.users where email like 'swarm-provider-%')", "public.comprehensive_medical_records"),
    ("public.comprehensive_prescriptions", "patient_id in (select id from auth.users where email like 'swarm-provider-%') or provider_id in (select id from auth.users where email like 'swarm-provider-%')", "public.comprehensive_prescriptions"),
    ("public.lab_tests", "patient_id in (select id from auth.users where email like 'swarm-provider-%') or ordered_by in (select id from auth.users where email like 'swarm-provider-%')", "public.lab_tests"),
    ("public.lab_results", "patient_id in (select id from auth.users where email like 'swarm-provider-%')", "public.lab_results"),
    ("public.vital_signs", "user_id in (select id from auth.users where email like 'swarm-provider-%')", "public.vital_signs"),
    ("public.provider_availability", "provider_id in (select id from auth.users where email like 'swarm-provider-%')", "public.provider_availability"),
    ("public.provider_time_slots", "provider_id in (select id from auth.users where email like 'swarm-provider-%')", "public.provider_time_slots"),
    ("public.user_wallets", "user_id in (select id from auth.users where email like 'swarm-provider-%')", "public.user_wallets"),
    ("public.wallet_transactions", "created_by in (select id from auth.users where email like 'swarm-provider-%')", "public.wallet_transactions"),
    ("public.doctor_fraction_earnings", "doctor_id in (select id from auth.users where email like 'swarm-provider-%')", "public.doctor_fraction_earnings"),
    ("public.payment_splits", "recipient_id in (select id from auth.users where email like 'swarm-provider-%')", "public.payment_splits"),
    ("public.notifications", "user_id in (select id from auth.users where email like 'swarm-provider-%')", "public.notifications"),
    ("public.security_audit_log", "user_id in (select id from auth.users where email like 'swarm-provider-%')", "public.security_audit_log"),
    ("public.medical_record_audit", "user_id in (select id from auth.users where email like 'swarm-provider-%')", "public.medical_record_audit"),
    ("public.audit_logs", "user_id in (select id from auth.users where email like 'swarm-provider-%')", "public.audit_logs"),
]

def run_sql(sql):
    with open("/tmp/census_q.sql", "w") as f:
        f.write(sql)
    p = subprocess.run([RUNNER, "/tmp/census_q.sql"], capture_output=True, text=True, timeout=180)
    try:
        rows = json.loads(p.stdout)
    except Exception:
        return f"ERR {p.stdout[:200]} {p.stderr[:200]}"
    if isinstance(rows, dict):
        return f"ERR {rows}"
    return rows[0]["n"] if rows else "ERR empty"

total = 0
for label, where, table in CHECKS:
    try:
        n = run_sql(f"select count(*) as n from {table} where {where};")
    except Exception as e:
        n = f"EXC {e}"
    if isinstance(n, int):
        total += n
    print(f"{label}: {n}")
print(f"TOTAL swarm rows: {total}")
