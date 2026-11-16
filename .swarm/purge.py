#!/usr/bin/env python3
"""Doc swarm clinical — purge ALL QA data for swarm-clinical-* (child-first)."""
import json, subprocess
TOK = open('/home/hatch/.supabase-relay/token').read().strip()
MGMT = 'https://api.supabase.com/v1/projects/tthzcijscedgxjfnfnky/database/query'
CFG = json.load(open('/home/hatch/.qa-tokens/docswarm-clinical.json'))
INST = CFG['institution_id']; UIDS = list(CFG['users'].values())
UIDS_SQL = "(" + ",".join(f"'{u}'" for u in UIDS) + ")"
def q(sql):
    r = subprocess.run(['curl','-s','-X','POST',MGMT,'-H',f'Authorization: Bearer {TOK}',
        '-H','Content-Type: application/json','-d',json.dumps({'query':sql})],
        capture_output=True,text=True,timeout=120)
    data = json.loads(r.stdout or '[]')
    if isinstance(data,dict) and data.get('message'): raise RuntimeError(data['message']+' :: '+sql[:160])
    return data
def cnt(sql):
    return q(sql)[0]['n']
# pre-purge census of my rows per table
TABLES = [
    ('fhir_exchanges', f"initiated_by IN {UIDS_SQL} OR patient_id IN {UIDS_SQL}"),
    ('audit_logs', f"user_id IN {UIDS_SQL}"),
    ('comprehensive_prescriptions', f"patient_id IN {UIDS_SQL} OR provider_id IN {UIDS_SQL}"),
    ('comprehensive_medical_records', f"patient_id IN {UIDS_SQL} OR provider_id IN {UIDS_SQL}"),
    ('lab_results', f"patient_id IN {UIDS_SQL}"),
    ('lab_tests', f"patient_id IN {UIDS_SQL}"),
    ('imaging_results', f"patient_id IN {UIDS_SQL}"),
    ('imaging_orders', f"patient_id IN {UIDS_SQL}"),
    ('batch_stock_movements', f"institution_id='{INST}'"),
    ('medicine_batches', f"institution_id='{INST}'"),
    ('drug_stock_items', f"institution_id='{INST}'"),
    ('drug_stock_movements', f"institution_id='{INST}'"),
    ('medication_inventory', f"institution_id='{INST}'"),
    ('art_procedures', f"cycle_id IN (SELECT id FROM public.art_cycles WHERE patient_id IN {UIDS_SQL} OR created_by IN {UIDS_SQL})"),
    ('art_cycle_staff', f"cycle_id IN (SELECT id FROM public.art_cycles WHERE patient_id IN {UIDS_SQL} OR created_by IN {UIDS_SQL})"),
    ('art_cycles', f"patient_id IN {UIDS_SQL} OR created_by IN {UIDS_SQL}"),
    ('vital_signs', f"user_id IN {UIDS_SQL}"),
    ('appointments', f"patient_id IN {UIDS_SQL} OR provider_id IN {UIDS_SQL}"),
    ('user_connections', f"patient_id IN {UIDS_SQL} OR provider_id IN {UIDS_SQL}"),
    ('institution_staff', f"institution_id='{INST}'"),
    ('institution_personnel', f"institution_id='{INST}'"),
    ('healthcare_institutions', f"id='{INST}'"),
    ('notifications', f"user_id IN {UIDS_SQL}"),
    ('user_roles', f"user_id IN {UIDS_SQL}"),
    ('profiles', f"id IN {UIDS_SQL}"),
]
print('--- pre-purge counts ---')
for tbl, cond in TABLES:
    try: print(f'{tbl}: {cnt(f"SELECT count(*) AS n FROM public.{tbl} WHERE {cond}")}')
    except Exception as e: print(f'{tbl}: CHECK-FAILED {str(e)[:120]}')
print('--- purging (child-first) ---')
DELETES = [
    ('fhir_exchanges', f"initiated_by IN {UIDS_SQL} OR patient_id IN {UIDS_SQL}"),
    ('audit_logs', f"user_id IN {UIDS_SQL}"),
    ('comprehensive_prescriptions', f"patient_id IN {UIDS_SQL} OR provider_id IN {UIDS_SQL}"),
    ('comprehensive_medical_records', f"patient_id IN {UIDS_SQL} OR provider_id IN {UIDS_SQL}"),
    ('lab_results', f"patient_id IN {UIDS_SQL}"),
    ('lab_tests', f"patient_id IN {UIDS_SQL}"),
    ('imaging_results', f"patient_id IN {UIDS_SQL}"),
    ('imaging_orders', f"patient_id IN {UIDS_SQL}"),
    ('batch_stock_movements', f"institution_id='{INST}'"),
    ('medicine_batches', f"institution_id='{INST}'"),
    ('drug_stock_items', f"institution_id='{INST}'"),
    ('drug_stock_movements', f"institution_id='{INST}'"),
    ('medication_inventory', f"institution_id='{INST}'"),
    ('art_procedures', f"cycle_id IN (SELECT id FROM public.art_cycles WHERE patient_id IN {UIDS_SQL} OR created_by IN {UIDS_SQL})"),
    ('art_cycle_staff', f"cycle_id IN (SELECT id FROM public.art_cycles WHERE patient_id IN {UIDS_SQL} OR created_by IN {UIDS_SQL})"),
    ('art_cycles', f"patient_id IN {UIDS_SQL} OR created_by IN {UIDS_SQL}"),
    ('vital_signs', f"user_id IN {UIDS_SQL}"),
    ('appointments', f"patient_id IN {UIDS_SQL} OR provider_id IN {UIDS_SQL}"),
    ('user_connections', f"patient_id IN {UIDS_SQL} OR provider_id IN {UIDS_SQL}"),
    ('institution_staff', f"institution_id='{INST}'"),
    ('institution_personnel', f"institution_id='{INST}'"),
    ('healthcare_institutions', f"id='{INST}'"),
    ('notifications', f"user_id IN {UIDS_SQL}"),
    ('user_roles', f"user_id IN {UIDS_SQL}"),
    ('profiles', f"id IN {UIDS_SQL}"),
]
for tbl, cond in DELETES:
    try:
        q(f"DELETE FROM public.{tbl} WHERE {cond}")
        print('deleted', tbl)
    except Exception as e: print('DELETE-FAILED', tbl, str(e)[:200])
# role-audit rows created by the user_roles deletes (if table exists)
try:
    n = cnt(f"SELECT count(*) AS n FROM public.role_audit WHERE user_id IN {UIDS_SQL}")
    print('role_audit rows for my users:', n)
    if n: q(f"DELETE FROM public.role_audit WHERE user_id IN {UIDS_SQL}"); print('deleted role_audit')
except Exception as e: print('role_audit check skipped:', str(e)[:120])
try:
    n = cnt(f"SELECT count(*) AS n FROM public.security_audit_log WHERE user_id IN {UIDS_SQL}")
    print('security_audit_log rows for my users:', n)
    if n: q(f"DELETE FROM public.security_audit_log WHERE user_id IN {UIDS_SQL}"); print('deleted security_audit_log')
except Exception as e: print('security_audit_log check skipped:', str(e)[:120])
# auth rows
q(f"DELETE FROM auth.identities WHERE user_id IN {UIDS_SQL}")
print('deleted auth.identities')
q(f"DELETE FROM auth.users WHERE id IN {UIDS_SQL}")
print('deleted auth.users')
print('--- post-purge verification ---')
residue = 0
for tbl, cond in TABLES:
    try:
        n = cnt(f"SELECT count(*) AS n FROM public.{tbl} WHERE {cond}")
        if n: print(f'RESIDUE {tbl}: {n}'); residue += n
    except Exception as e: print(f'{tbl}: check skipped ({str(e)[:80]})')
print('auth.users with my prefix:', cnt("SELECT count(*) AS n FROM auth.users WHERE email LIKE 'swarm-clinical-%@doc0clock.online'"))
print('global auth.users count:', cnt("SELECT count(*) AS n FROM auth.users"))
print('gate14 intact:', q("SELECT email FROM auth.users WHERE email LIKE 'gate14%' ORDER BY email"))
print('RESIDUE TOTAL:', residue)
