#!/usr/bin/env python3
"""Purge ALL swarm-provider QA data, child-first. Verifies zero residue for
the swarm-provider-% prefix afterwards. Never touches gate14 users/data."""
import json, os, subprocess, sys

RUNNER = os.path.expanduser("~/workspace/docswarm-provider/proofs/docsql-provider.sh")
U = "(select id from auth.users where email like 'swarm-provider-%')"

# Each entry: (label, delete-sql). Count is returned via CTE.
STEPS = [
    ("prescription_history",
     f"with d as (delete from public.prescription_history where prescription_id in (select id from public.comprehensive_prescriptions where provider_id in {U}) returning 1) select count(*) as n from d"),
    ("booking_fees",
     f"with d as (delete from public.booking_fees where patient_id in {U} or provider_id in {U} returning 1) select count(*) as n from d"),
    ("medical_record_audit",
     f"with d as (delete from public.medical_record_audit where patient_id in {U} or actor_id in {U} returning 1) select count(*) as n from d"),
    ("comprehensive_prescriptions",
     f"with d as (delete from public.comprehensive_prescriptions where patient_id in {U} or provider_id in {U} returning 1) select count(*) as n from d"),
    ("lab_tests",
     f"with d as (delete from public.lab_tests where patient_id in {U} or ordered_by in {U} returning 1) select count(*) as n from d"),
    ("vital_signs",
     f"with d as (delete from public.vital_signs where user_id in {U} returning 1) select count(*) as n from d"),
    ("video_consultations",
     f"with d as (delete from public.video_consultations where patient_id in {U} or provider_id in {U} returning 1) select count(*) as n from d"),
    ("user_connections",
     f"with d as (delete from public.user_connections where patient_id in {U} or provider_id in {U} returning 1) select count(*) as n from d"),
    ("appointments",
     f"with d as (delete from public.appointments where patient_id in {U} or provider_id in {U} returning 1) select count(*) as n from d"),
    ("comprehensive_medical_records",
     f"with d as (delete from public.comprehensive_medical_records where patient_id in {U} or provider_id in {U} returning 1) select count(*) as n from d"),
    ("provider_availability",
     f"with d as (delete from public.provider_availability where provider_id in {U} returning 1) select count(*) as n from d"),
    ("wallet_transactions",
     f"with d as (delete from public.wallet_transactions where wallet_id in (select id from public.user_wallets where user_id in {U}) returning 1) select count(*) as n from d"),
    ("user_wallets",
     f"with d as (delete from public.user_wallets where user_id in {U} returning 1) select count(*) as n from d"),
    ("user_roles",
     f"with d as (delete from public.user_roles where user_id in {U} returning 1) select count(*) as n from d"),
    ("security_audit_log#1",
     f"with d as (delete from public.security_audit_log where user_id in {U} returning 1) select count(*) as n from d"),
    ("profiles",
     f"with d as (delete from public.profiles where id in {U} returning 1) select count(*) as n from d"),
    ("auth.identities",
     f"with d as (delete from auth.identities where user_id in {U} returning 1) select count(*) as n from d"),
    ("auth.users",
     f"with d as (delete from auth.users where email like 'swarm-provider-%' returning 1) select count(*) as n from d"),
    ("security_audit_log#2 (post-user sweep)",
     "with d as (delete from public.security_audit_log where user_id in (select id from auth.users where email like 'swarm-provider-%') returning 1) select count(*) as n from d"),
]

def run_sql(sql):
    with open("/tmp/purge_q.sql", "w") as f:
        f.write(sql)
    p = subprocess.run([RUNNER, "/tmp/purge_q.sql"], capture_output=True, text=True, timeout=180)
    try:
        rows = json.loads(p.stdout)
    except Exception:
        raise RuntimeError(f"purge step failed: out={p.stdout[:500]} err={p.stderr[:300]}")
    if isinstance(rows, dict):
        raise RuntimeError(f"purge step error: {rows}")
    return rows[0]["n"]

for label, sql in STEPS:
    n = run_sql(sql)
    print(f"{label}: deleted {n}")

# Verification: swarm prefix must be zero everywhere.
VERIFY = [
    ("auth.users", "select count(*) as n from auth.users where email like 'swarm-provider-%'"),
    ("auth.identities", f"select count(*) as n from auth.identities where user_id in {U}"),
    ("profiles", f"select count(*) as n from public.profiles where id in {U}"),
    ("user_roles", f"select count(*) as n from public.user_roles where user_id in {U}"),
    ("appointments", f"select count(*) as n from public.appointments where patient_id in {U} or provider_id in {U}"),
    ("booking_fees", f"select count(*) as n from public.booking_fees where patient_id in {U} or provider_id in {U}"),
    ("security_audit_log", f"select count(*) as n from public.security_audit_log where user_id in {U}"),
]
print("--- verify ---")
bad = 0
for label, sql in VERIFY:
    n = run_sql(sql + ";")
    print(f"{label}: {n}")
    bad += n if isinstance(n, int) else 1
print(f"TOTAL auth.users now: {run_sql('select count(*) as n from auth.users;')}")
print("PURGE CLEAN" if bad == 0 else f"PURGE INCOMPLETE residue={bad}")
