#!/usr/bin/env python3
"""Doc swarm clinical — QA setup (direct SQL via Management API)."""
import json, secrets, subprocess, sys

TOK = open('/home/hatch/.supabase-relay/token').read().strip()
MGMT = 'https://api.supabase.com/v1/projects/tthzcijscedgxjfnfnky/database/query'
OUT = '/home/hatch/.qa-tokens/docswarm-clinical.json'
PW = secrets.token_urlsafe(16)

USERS = [
    ('swarm-clinical-patient@doc0clock.online', 'Swarm Clinical Patient', 'patient'),
    ('swarm-clinical-patient2@doc0clock.online', 'Swarm Clinical Patient Two', 'patient'),
    ('swarm-clinical-doctor@doc0clock.online', 'Swarm Clinical Doctor', 'doctor'),
    ('swarm-clinical-pathologist@doc0clock.online', 'Swarm Clinical Pathologist', 'pathologist'),
    ('swarm-clinical-labtech@doc0clock.online', 'Swarm Clinical Lab Tech', 'lab_technician'),
    ('swarm-clinical-radiologist@doc0clock.online', 'Swarm Clinical Radiologist', 'radiologist'),
    ('swarm-clinical-pharmacist@doc0clock.online', 'Swarm Clinical Pharmacist', 'pharmacist'),
    ('swarm-clinical-instadmin@doc0clock.online', 'Swarm Clinical Admin', 'institution_admin'),
    ('swarm-clinical-outsider@doc0clock.online', 'Swarm Clinical Outsider', 'pathologist'),
]

def q(sql):
    r = subprocess.run(['curl','-s','-X','POST',MGMT,'-H',f'Authorization: Bearer {TOK}',
                        '-H','Content-Type: application/json','-d',json.dumps({'query':sql})],
                       capture_output=True,text=True,timeout=90)
    data = json.loads(r.stdout or '[]')
    if isinstance(data,dict) and data.get('message'):
        raise RuntimeError(f"SQL error: {data['message']} :: {sql[:200]}")
    return data

fails=[]
def step(label, fn):
    try:
        fn(); print('OK   '+label, flush=True)
    except Exception as e:
        print('FAIL '+label+' :: '+str(e)[:300], flush=True); fails.append(label)

# census before
n = q('SELECT count(*) AS n FROM auth.users')[0]['n']
print('census before:', n)

ids={}
for email, name, role in USERS:
    def mk(email=email, name=name, role=role):
        esc_pw = PW.replace("'","''")
        q(f"""INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, is_super_admin)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  '{email}', crypt('{esc_pw}', gen_salt('bf')), now(), now(), now(), '', '', '', '',
  '{{"provider":"email","providers":["email"]}}'::jsonb,
  jsonb_build_object('full_name', '{name}'), false
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email='{email}')""")
        q(f"""INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
SELECT gen_random_uuid(), u.id, jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email', u.id::text, now(), now() FROM auth.users u
WHERE u.email='{email}' AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id=u.id)""")
        q(f"""INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT u.id, '{role}'::app_role, u.id FROM auth.users u WHERE u.email='{email}'
ON CONFLICT (user_id, role) DO NOTHING""")
        q(f"""UPDATE public.profiles p SET role='{role}'::user_role, is_verified=true, updated_at=now()
FROM auth.users u WHERE p.id=u.id AND u.email='{email}'""")
        # every QA user also gets the baseline patient role (as gate14 does)
        if role != 'patient':
            q(f"""INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT u.id, 'patient'::app_role, u.id FROM auth.users u WHERE u.email='{email}'
ON CONFLICT (user_id, role) DO NOTHING""")
    step('create '+email, mk)

rows = q("SELECT id, email FROM auth.users WHERE email LIKE 'swarm-clinical-%@doc0clock.online' ORDER BY email")
ids = {r['email']: r['id'] for r in rows}
print('created:', len(ids), 'of', len(USERS))
assert len(ids)==len(USERS), f'missing: {set(e for e,_,_ in USERS)-set(ids)}'

# profiles exist? (trigger-created)
profs = q("SELECT count(*) AS n FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email LIKE 'swarm-clinical-%')")[0]['n']
print('profiles rows for swarm users:', profs)

# institution owned by instadmin
def mk_inst():
    q(f"""INSERT INTO public.healthcare_institutions (id, name, type, city, country, admin_id, is_verified, created_at, updated_at)
SELECT gen_random_uuid(), 'Swarm Clinical QA Hospital', 'hospital', 'Lusaka', 'Zambia', u.id, true, now(), now()
FROM auth.users u WHERE u.email='swarm-clinical-instadmin@doc0clock.online'
AND NOT EXISTS (SELECT 1 FROM public.healthcare_institutions h WHERE h.name='Swarm Clinical QA Hospital')""")
step('create institution', mk_inst)
inst = q("SELECT id FROM public.healthcare_institutions WHERE name='Swarm Clinical QA Hospital'")
INST = inst[0]['id']
print('institution:', INST)

# personnel links (active) for clinical staff
for email, role in [('swarm-clinical-doctor@doc0clock.online','doctor'),
                    ('swarm-clinical-pathologist@doc0clock.online','pathologist'),
                    ('swarm-clinical-labtech@doc0clock.online','lab_technician'),
                    ('swarm-clinical-radiologist@doc0clock.online','radiologist'),
                    ('swarm-clinical-pharmacist@doc0clock.online','pharmacist')]:
    def link(email=email, role=role):
        q(f"""INSERT INTO public.institution_personnel (institution_id, user_id, role, status)
SELECT '{INST}', u.id, '{role}', 'active' FROM auth.users u WHERE u.email='{email}'
ON CONFLICT DO NOTHING""")
    step('personnel '+email, link)

json.dump({'password': PW, 'users': {e: ids[e] for e in ids}, 'institution_id': INST},
          open(OUT,'w'), indent=1)
subprocess.run(['chmod','600',OUT])
print('wrote', OUT)
print('FAILS:', fails)
