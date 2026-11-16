#!/usr/bin/env python3
"""Doc swarm clinical — live JWT replay proofs (PostgREST, QA users only)."""
import json, subprocess, sys
from datetime import date

CFG = json.load(open('/home/hatch/.qa-tokens/docswarm-clinical.json'))
PW = CFG['password']; U = CFG['users']; INST = CFG['institution_id']
ANON = open('/home/hatch/.qa-tokens/doc-oclock-anon.key').read().strip()
BASE = 'https://tthzcijscedgxjfnfnky.supabase.co'
TODAY = date.today().isoformat()
RUN = 'SWARM-CLINICAL-4'
MED_INV_ID = '3470d253-9420-491a-baec-becd74e86b92'  # medication_inventory fixture (direct SQL)
fails, passes = [], []
OUT = '/home/hatch/.qa-tokens/docswarm-clinical-proofs.json'
results = {}

def check(label, cond, extra=''):
    (passes if cond else fails).append(label)
    print(('PASS  ' if cond else 'FAIL  ') + label + (f'  [{extra}]' if extra else ''), flush=True)

def http(method, url, headers, body=None):
    args = ['curl','-s','-w','\n%{http_code}','-X',method,url]
    for k,v in headers.items(): args += ['-H', f'{k}: {v}']
    if body is not None: args += ['-H','Content-Type: application/json','-d',json.dumps(body)]
    r = subprocess.run(args, capture_output=True, text=True, timeout=120)
    text, _, code = r.stdout.rpartition('\n')
    try: return int(code), json.loads(text or '{}')
    except ValueError: return int(code), {'raw': text[:500]}

def signin(email):
    code, auth = http('POST', f'{BASE}/auth/v1/token?grant_type=password',
                      {'apikey': ANON}, {'email': email, 'password': PW})
    assert auth.get('access_token'), f'sign-in failed {email}: {code} {str(auth)[:200]}'
    return auth['access_token']

JWT = {}
for email in U:
    JWT[email] = signin(email)
    print('signed in', email, flush=True)

def H(email): return {'apikey': ANON, 'Authorization': f'Bearer {JWT[email]}', 'Prefer': 'return=representation'}
P = 'swarm-clinical-patient@doc0clock.online'
P2 = 'swarm-clinical-patient2@doc0clock.online'
D = 'swarm-clinical-doctor@doc0clock.online'
PA = 'swarm-clinical-pathologist@doc0clock.online'
LT = 'swarm-clinical-labtech@doc0clock.online'
RA = 'swarm-clinical-radiologist@doc0clock.online'
PH = 'swarm-clinical-pharmacist@doc0clock.online'
IA = 'swarm-clinical-instadmin@doc0clock.online'
OU = 'swarm-clinical-outsider@doc0clock.online'

def rest(method, email, path, body=None, params=''):
    return http(method, f'{BASE}/rest/v1/{path}{params}', H(email), body)

# ═══ LAB ═══
code, t1 = rest('POST', D, 'lab_tests', {
    'patient_id': U[P], 'ordered_by': U[D], 'entered_by': U[D], 'lab_id': INST,
    'institution_id': INST, 'test_type': 'Full Blood Count', 'test_category': 'haematology',
    'priority': 'routine', 'status': 'pending', 'sample_type': 'blood',
    'test_number': f'{RUN}-LAB-001', 'order_source': 'electronic'})
check('LAB order created by doctor (JWT)', code in (200,201) and isinstance(t1, list) and len(t1)==1, f'HTTP {code} {str(t1)[:200]}')
T1 = t1[0]['id'] if isinstance(t1, list) and t1 else None
results['lab_test_id'] = T1

code, rows = rest('GET', P, 'lab_tests', params=f"?id=eq.{T1}&select=id,test_type,status")
check('LAB patient cannot read own lab_tests pre-verification (200 [])', code==200 and rows==[], f'HTTP {code} rows={len(rows) if isinstance(rows,list) else rows}')

# phantom column proof: test_name does not exist on lab_tests
code, err = rest('GET', D, 'lab_tests', params=f"?select=id,test_name&limit=1")
check('LAB phantom test_name on lab_tests -> 400', code==400, f'HTTP {code}')
# invalid status 'resulted' proof
code, err = rest('POST', D, 'lab_tests', {
    'patient_id': U[P], 'ordered_by': U[D], 'entered_by': U[D], 'lab_id': INST,
    'institution_id': INST, 'test_type': 'Malaria Test', 'priority': 'routine',
    'status': 'resulted', 'test_number': f'{RUN}-LAB-BAD', 'order_source': 'electronic'})
check("LAB status 'resulted' rejected by CHECK", code==400, f'HTTP {code}')

code, upd = rest('PATCH', LT, 'lab_tests', {'status':'sample_collected','sample_collected_at':'2026-11-16T09:30:00Z'}, params=f'?id=eq.{T1}')
check('LAB sample collected by lab tech (JWT)', code==200 and isinstance(upd,list) and upd and upd[0]['status']=='sample_collected', f'HTTP {code} {str(upd)[:150]}')

code, res = rest('POST', LT, 'lab_results', {
    'patient_id': U[P], 'test_name': 'Full Blood Count', 'test_date': TODAY,
    'result_value': '13.2', 'unit': 'g/dL', 'reference_range': '12.0-15.5',
    'test_id': T1, 'request_id': T1, 'technician_id': U[LT], 'notes': 'Swarm QA result'})
check('LAB result entered by lab tech (JWT)', code in (200,201) and isinstance(res,list) and len(res)==1, f'HTTP {code} {str(res)[:200]}')
R1 = res[0]['id'] if isinstance(res,list) and res else None
results['lab_result_id'] = R1

code, rows = rest('GET', P, 'lab_results_patient_view', params=f"?id=eq.{R1}&select=id,test_name,result_value,verified_at")
check('LAB patient view hides value pre-verification (NULL)', code==200 and isinstance(rows,list) and len(rows)==1 and rows[0]['result_value'] is None, f'HTTP {code} {str(rows)[:200]}')
code, rows = rest('GET', P, 'lab_results', params=f"?id=eq.{R1}&select=id")
check('LAB patient cannot read lab_results pre-verification (200 [])', code==200 and rows==[], f'HTTP {code} rows={rows if isinstance(rows,list) else rows}')

# unauthorised verify: outsider pathologist (role ok, no staff link) on T1
code, err = rest('PATCH', OU, 'lab_tests', {'verified_at':'2026-11-16T10:00:00Z','verified_by':U[OU],'status':'completed'}, params=f'?id=eq.{T1}')
check('LAB unauthorised verify refused (outsider pathologist)', code not in (200,201,204) or (isinstance(err,list) and not err), f'HTTP {code} {str(err)[:200]}')
results['unauth_verify'] = {'code': code, 'body': str(err)[:300]}

code, upd = rest('PATCH', PA, 'lab_tests', {'verified_at':'2026-11-16T10:05:00Z','verified_by':U[PA],'status':'completed'}, params=f'?id=eq.{T1}')
check('LAB authorised verify by staff pathologist (JWT)', code==200 and isinstance(upd,list) and upd and upd[0].get('verified_at'), f'HTTP {code} {str(upd)[:200]}')

code, rows = rest('GET', P, 'lab_results_patient_view', params=f"?id=eq.{R1}&select=id,test_name,result_value,verified_at")
check('LAB patient view shows value post-verification (13.2)', code==200 and isinstance(rows,list) and len(rows)==1 and rows[0]['result_value']=='13.2', f'HTTP {code} {str(rows)[:200]}')
code, rows = rest('GET', P, 'lab_results', params=f"?id=eq.{R1}&select=id,result_value")
check('LAB patient can read lab_results post-verification', code==200 and isinstance(rows,list) and len(rows)==1, f'HTTP {code} {str(rows)[:200]}')

code, err = rest('PATCH', PA, 'lab_tests', {'verified_at':'2026-11-16T10:10:00Z','verified_by':U[PA]}, params=f'?id=eq.{T1}')
check('LAB re-verification refused', code not in (200,201,204) or (isinstance(err,list) and not err), f'HTTP {code} {str(err)[:200]}')
results['reverify'] = {'code': code, 'body': str(err)[:300]}

# mirror: lab_results verified_at mirror from lab_tests verify?
code, rows = rest('GET', D, 'lab_results', params=f"?id=eq.{R1}&select=id,verified_at")
results['lab_result_mirror'] = {'code': code, 'rows': rows}
print('INFO  lab_results mirror after test verify:', code, str(rows)[:300], flush=True)

# ═══ IMAGING ═══
code, o1 = rest('POST', D, 'imaging_orders', {
    'institution_id': INST, 'patient_id': U[P], 'ordered_by': U[D],
    'modality': 'xray', 'body_part': 'chest', 'clinical_indication': 'Swarm QA: persistent cough',
    'priority': 'routine', 'status': 'ordered', 'order_number': f'{RUN}-IMG-001'})
check('IMG order created by doctor (JWT)', code in (200,201) and isinstance(o1,list) and len(o1)==1, f'HTTP {code} {str(o1)[:200]}')
O1 = o1[0]['id'] if isinstance(o1,list) and o1 else None
results['imaging_order_id'] = O1

code, r1 = rest('POST', RA, 'imaging_results', {
    'order_id': O1, 'patient_id': U[P], 'findings': 'Swarm QA: clear lung fields',
    'impression': 'Swarm QA: no acute abnormality', 'status': 'draft'})
check('IMG draft result by radiologist (JWT)', code in (200,201) and isinstance(r1,list) and len(r1)==1, f'HTTP {code} {str(r1)[:200]}')
IR1 = r1[0]['id'] if isinstance(r1,list) and r1 else None
results['imaging_result_id'] = IR1

code, rows = rest('GET', P, 'imaging_results', params=f"?id=eq.{IR1}&select=id,status")
check('IMG patient cannot see draft result (200 [])', code==200 and rows==[], f'HTTP {code} rows={rows}')
code, upd = rest('PATCH', RA, 'imaging_results', {'status':'preliminary'}, params=f'?id=eq.{IR1}')
check('IMG preliminary by radiologist (JWT)', code==200, f'HTTP {code} {str(upd)[:150]}')
code, rows = rest('GET', P, 'imaging_results', params=f"?id=eq.{IR1}&select=id,status")
check('IMG patient cannot see preliminary result (200 [])', code==200 and rows==[], f'HTTP {code} rows={rows}')
code, upd = rest('PATCH', RA, 'imaging_results', {'status':'final'}, params=f'?id=eq.{IR1}')
check('IMG final by radiologist (JWT)', code==200 and isinstance(upd,list) and upd and upd[0]['status']=='final', f'HTTP {code} {str(upd)[:200]}')
code, rows = rest('GET', P, 'imaging_results', params=f"?id=eq.{IR1}&select=id,status,findings,impression")
check('IMG patient sees final result with findings', code==200 and isinstance(rows,list) and len(rows)==1 and rows[0]['findings'].startswith('Swarm QA'), f'HTTP {code} {str(rows)[:200]}')
code, err = rest('PATCH', RA, 'imaging_results', {'findings':'tampered'}, params=f'?id=eq.{IR1}')
check('IMG final report immutable (edit refused)', code not in (200,201,204) or (isinstance(err,list) and not err), f'HTTP {code} {str(err)[:200]}')
results['img_final_edit'] = {'code': code, 'body': str(err)[:300]}

# ═══ DISPENSARY ═══
code, b1 = rest('POST', PH, 'medicine_batches', {
    'institution_id': INST, 'product_name': 'Amoxicillin 500mg', 'batch_number': f'{RUN}-BATCH-001',
    'quantity_received': 100, 'quantity_remaining': 100, 'expiry_date': '2027-11-16',
    'is_active': True, 'qa_status': 'approved', 'inventory_table': 'medication_inventory', 'inventory_item_id': MED_INV_ID})
check('DISP batch created qty 100 (JWT)', code in (200,201) and isinstance(b1,list) and len(b1)==1, f'HTTP {code} {str(b1)[:200]}')
B1 = b1[0]['id'] if isinstance(b1,list) and b1 else None
results['batch_id'] = B1

code, m1 = rest('POST', PH, 'batch_stock_movements', {
    'institution_id': INST, 'batch_id': B1, 'movement_type': 'dispense',
    'quantity_change': -5, 'reference_type': 'prescription', 'notes': 'Swarm QA dispense 5'})
check('DISP movement -5 accepted (JWT)', code in (200,201) and isinstance(m1,list) and len(m1)==1, f'HTTP {code} {str(m1)[:200]}')
if isinstance(m1,list) and m1:
    check('DISP quantity_after = 95 on movement row', m1[0].get('quantity_after')==95, f"got {m1[0].get('quantity_after')}")
code, rows = rest('GET', PH, 'medicine_batches', params=f"?id=eq.{B1}&select=id,quantity_remaining")
check('DISP stock 100->95 exactly once (trigger only)', code==200 and isinstance(rows,list) and rows and rows[0]['quantity_remaining']==95, f'HTTP {code} {str(rows)[:150]}')
code, m2 = rest('POST', PH, 'batch_stock_movements', {
    'institution_id': INST, 'batch_id': B1, 'movement_type': 'dispense',
    'quantity_change': -5, 'reference_type': 'prescription', 'notes': 'Swarm QA dispense 5 again'})
code, rows = rest('GET', PH, 'medicine_batches', params=f"?id=eq.{B1}&select=id,quantity_remaining")
check('DISP second -5 -> 90 exactly once', code==200 and isinstance(rows,list) and rows and rows[0]['quantity_remaining']==90, f'HTTP {code} {str(rows)[:150]}')
code, err = rest('POST', PH, 'batch_stock_movements', {
    'institution_id': INST, 'batch_id': B1, 'movement_type': 'dispense',
    'quantity_change': -200, 'reference_type': 'prescription'})
check('DISP over-dispense refused (would go negative)', code not in (200,201), f'HTTP {code} {str(err)[:200]}')
results['overdispense'] = {'code': code, 'body': str(err)[:300]}

# ═══ ART ═══
code, c1 = rest('POST', D, 'art_cycles', {
    'institution_id': INST, 'patient_id': U[P], 'partner_patient_id': U[P2],
    'cycle_number': 1, 'cycle_type': 'IVF', 'status': 'consultation',
    'start_date': TODAY, 'created_by': U[D], 'confidentiality_level': 'standard'})
check('ART cycle created by doctor (JWT)', code in (200,201) and isinstance(c1,list) and len(c1)==1, f'HTTP {code} {str(c1)[:200]}')
C1 = c1[0]['id'] if isinstance(c1,list) and c1 else None
results['art_cycle_id'] = C1
code, rows = rest('GET', P2, 'art_cycles', params=f"?id=eq.{C1}&select=id")
check('ART partner patient can read cycle', code==200 and isinstance(rows,list) and len(rows)==1, f'HTTP {code} rows={rows}')
code, rows = rest('GET', OU, 'art_cycles', params=f"?id=eq.{C1}&select=id")
check('ART outsider cannot read cycle (200 [])', code==200 and rows==[], f'HTTP {code} rows={rows}')
code, s1 = rest('POST', D, 'art_cycle_staff', {'cycle_id': C1, 'staff_id': U[PA], 'role': 'pathologist'})
check('ART staff assigned (JWT)', code in (200,201) and isinstance(s1,list) and len(s1)==1, f'HTTP {code} {str(s1)[:200]}')
code, rows = rest('GET', PA, 'art_cycles', params=f"?id=eq.{C1}&select=id")
check('ART assigned staff can read cycle', code==200 and isinstance(rows,list) and len(rows)==1, f'HTTP {code} rows={rows}')
code, pr = rest('POST', D, 'art_procedures', {
    'cycle_id': C1, 'procedure_type': 'oocyte_retrieval', 'procedure_date': TODAY,
    'outcome': 'completed', 'performed_by': U[D]})
check('ART procedure recorded (JWT)', code in (200,201) and isinstance(pr,list) and len(pr)==1, f'HTTP {code} {str(pr)[:200]}')
code, rows = rest('GET', OU, 'art_procedures', params=f"?cycle_id=eq.{C1}&select=id")
check('ART outsider cannot read procedures (200 [])', code==200 and rows==[], f'HTTP {code} rows={rows}')

# ═══ VITALS ═══
code, v1 = rest('POST', P, 'vital_signs', {
    'user_id': U[P], 'heart_rate': 72, 'blood_pressure_systolic': 120,
    'blood_pressure_diastolic': 90, 'temperature': 36.6, 'oxygen_saturation': 98,
    'respiratory_rate': 16, 'recorded_at': '2026-11-16T09:45:00Z',
    'metadata': {'recorded_by': U[D], 'notes': 'Swarm QA diastolic 90'}})
check('VITALS patient self-record diastolic 90 (JWT)', code in (200,201) and isinstance(v1,list) and len(v1)==1, f'HTTP {code} {str(v1)[:200]}')
code, v2 = rest('POST', P, 'vital_signs', {
    'user_id': U[P], 'heart_rate': 78, 'blood_pressure_systolic': 132,
    'blood_pressure_diastolic': 91, 'temperature': 36.8, 'oxygen_saturation': 97,
    'respiratory_rate': 18, 'recorded_at': '2026-11-16T10:00:00Z',
    'metadata': {'recorded_by': U[D], 'notes': 'Swarm QA diastolic 91'}})
check('VITALS patient self-record diastolic 91 (JWT)', code in (200,201) and isinstance(v2,list) and len(v2)==1, f'HTTP {code} {str(v2)[:200]}')
results['vitals_ids'] = [v1[0]['id'] if isinstance(v1,list) and v1 else None, v2[0]['id'] if isinstance(v2,list) and v2 else None]
code, rows = rest('GET', D, 'vital_signs', params=f"?user_id=eq.{U[P]}&select=id,blood_pressure_diastolic&order=recorded_at")
check('VITALS doctor reads patient vitals (care relationship)', code==200 and isinstance(rows,list) and {90,91} <= {r.get('blood_pressure_diastolic') for r in rows}, f'HTTP {code} {str(rows)[:200]}')
code, rows = rest('GET', P2, 'vital_signs', params=f"?user_id=eq.{U[P]}&select=id")
check('VITALS other patient cannot read vitals (200 [])', code==200 and rows==[], f'HTTP {code} rows={rows}')

# ═══ MEDICAL RECORDS ═══
code, mr = rest('POST', D, 'comprehensive_medical_records', {
    'patient_id': U[P], 'provider_id': U[D], 'institution_id': INST,
    'record_type': 'diagnosis', 'title': 'Swarm QA consultation',
    'description': 'Swarm QA clinical note', 'visit_date': TODAY,
    'status': 'active', 'record_source': 'provider'})
check('RECS doctor creates record (JWT)', code in (200,201) and isinstance(mr,list) and len(mr)==1, f'HTTP {code} {str(mr)[:200]}')
MR1 = mr[0]['id'] if isinstance(mr,list) and mr else None
results['record_id'] = MR1
code, rows = rest('GET', P, 'comprehensive_medical_records', params=f"?id=eq.{MR1}&select=id,title")
check('RECS patient reads own record', code==200 and isinstance(rows,list) and len(rows)==1, f'HTTP {code} rows={rows}')
code, rows = rest('GET', P2, 'comprehensive_medical_records', params=f"?id=eq.{MR1}&select=id")
check('RECS other patient cannot read record (200 [])', code==200 and rows==[], f'HTTP {code} rows={rows}')
code, mr2 = rest('POST', P, 'comprehensive_medical_records', {
    'patient_id': U[P], 'provider_id': U[P], 'record_type': 'diagnosis',
    'title': 'Swarm QA self report', 'description': 'Patient-reported symptom note',
    'visit_date': TODAY, 'status': 'active', 'record_source': 'patient'})
check('RECS patient creates own self-reported record (JWT)', code in (200,201) and isinstance(mr2,list) and len(mr2)==1, f'HTTP {code} {str(mr2)[:200]}')
results['record2_id'] = mr2[0]['id'] if isinstance(mr2,list) and mr2 else None
code, err = rest('PATCH', P2, 'comprehensive_medical_records', {'title': 'tampered'}, params=f'?id=eq.{MR1}')
check('RECS other patient cannot update record', code not in (200,201,204) or (isinstance(err,list) and not err), f'HTTP {code} {str(err)[:200]}')

# ═══ PRESCRIPTIONS ═══
code, rx = rest('POST', D, 'comprehensive_prescriptions', {
    'patient_id': U[P], 'provider_id': U[D], 'medication_name': 'Amoxicillin',
    'dosage': '500mg', 'quantity': 30, 'instructions': 'Take one capsule three times daily after meals',
    'status': 'pending', 'prescribed_date': TODAY, 'prescription_number': f'{RUN}-RX-001'})
check('RX doctor creates prescription with instructions (JWT)', code in (200,201) and isinstance(rx,list) and len(rx)==1, f'HTTP {code} {str(rx)[:200]}')
RX1 = rx[0]['id'] if isinstance(rx,list) and rx else None
results['rx_id'] = RX1
code, rows = rest('GET', P, 'comprehensive_prescriptions', params=f"?id=eq.{RX1}&select=id,medication_name,instructions")
check('RX patient reads own prescription + instructions', code==200 and isinstance(rows,list) and len(rows)==1 and 'three times daily' in (rows[0].get('instructions') or ''), f'HTTP {code} {str(rows)[:200]}')
code, err = rest('GET', D, 'comprehensive_prescriptions', params="?select=id,frequency&limit=1")
check('RX phantom frequency column -> 400', code==400, f'HTTP {code}')
code, rows = rest('GET', PH, 'comprehensive_prescriptions', params=f"?id=eq.{RX1}&select=id,fulfillment_status")
check('RX pharmacist can view unassigned prescription', code==200 and isinstance(rows,list) and len(rows)==1, f'HTTP {code} rows={rows}')
code, upd = rest('PATCH', PH, 'comprehensive_prescriptions', {'fulfillment_status':'filled'}, params=f'?id=eq.{RX1}')
check('RX pharmacist fills (JWT)', code==200 and isinstance(upd,list) and upd and upd[0].get('fulfillment_status')=='filled', f'HTTP {code} {str(upd)[:200]}')
results['rx_dispense'] = {'code': code, 'body': str(upd)[:300]}

# ═══ FHIR ═══
code, fx = rest('GET', D, 'fhir_exchanges', params='?select=id&limit=1')
check('FHIR exchanges readable by doctor (JWT)', code==200, f'HTTP {code} {str(fx)[:200]}')
code, anon = http('GET', f'{BASE}/rest/v1/fhir_exchanges?select=id&limit=1', {'apikey': ANON})
check('FHIR exchanges anon refused (401)', code==401, f'HTTP {code}')

print()
print(f'PASSED {len(passes)}  FAILED {len(fails)}')
if fails: print('FAILS:', fails)
json.dump({'passes': passes, 'fails': fails, 'results': results}, open(OUT,'w'), indent=1)
print('wrote', OUT)
