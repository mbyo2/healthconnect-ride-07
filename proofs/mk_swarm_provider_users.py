#!/usr/bin/env python3
"""Doc swarm group 2: create 27 provider QA users + 1 QA patient.
Resumable/idempotent. One statement per docsql call (the Management API
has double-executed multi-statement batches: pharmacist user was created
then the same batch raised a duplicate-key error).
profiles.role mirror is set via the SERVICE key over REST: the
prevent_profile_privilege_change trigger silently reverts role changes
when is_service_role() is false, and docsql.sh has no JWT (auth.uid()
NULL, is_service_role() false). With a service_role JWT the trigger
passes the change through. Writes creds to ~/.qa-tokens/docswarm-provider.json (chmod 600)."""
import json, os, secrets, string, subprocess, time

ROLES = [
    "doctor", "specialist", "medical_licentiate", "clinical_officer", "dentist",
    "nurse", "registered_nurse", "enrolled_nurse", "midwife", "radiologist",
    "psychologist", "nutritionist", "optometrist", "optician",
    "physiotherapist", "occupational_therapist", "dental_therapist",
    "traditional_practitioner", "health_personnel",
    "pharmacist", "pharmacy_technologist", "radiographer", "pathologist",
    "lab_technician", "phlebotomist", "environmental_health_officer",
    "community_health_worker",
]
assert len(ROLES) == 27, len(ROLES)
SUPABASE_URL = "https://tthzcijscedgxjfnfnky.supabase.co"
TOKENS = os.path.expanduser("~/.qa-tokens/docswarm-provider.json")
SERVICE_KEY = open(os.path.expanduser("~/.qa-tokens/doc-service.key")).read().strip()

if os.path.exists(TOKENS):
    PW = json.load(open(TOKENS))["password"]
    print("reusing password from existing token file")
else:
    PW = "".join(secrets.choice(string.ascii_letters + string.digits + "!#") for _ in range(18))

def run_sql(sql, retries=3):
    path = "/tmp/swarm_create.sql"
    with open(path, "w") as f:
        f.write(sql)
    last = None
    for attempt in range(retries):
        p = subprocess.run([os.path.expanduser("~/workspace/docswarm-provider/proofs/docsql-provider.sh"), path],
                           capture_output=True, text=True, timeout=180)
        out = p.stdout.strip()
        try:
            rows = json.loads(out)
        except Exception:
            last = f"docsql failed rc={p.returncode} out={out[:800]} err={p.stderr[:300]}"
            time.sleep(2 * (attempt + 1))
            continue
        if isinstance(rows, dict) and "message" in rows:
            last = f"docsql error: {rows['message'][:400]} | sql={sql[:160]}"
            time.sleep(2 * (attempt + 1))
            continue
        return rows
    raise RuntimeError(last)

def rest_patch_profile(uid, role):
    for attempt in range(4):
        p = subprocess.run(
            ["curl", "-sS", "--max-time", "60", "-X", "PATCH",
             f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{uid}",
             "-H", f"apikey: {SERVICE_KEY}",
             "-H", f"Authorization: Bearer {SERVICE_KEY}",
             "-H", "Content-Type: application/json",
             "-H", "Prefer: return=representation",
             "-d", json.dumps({"role": role, "is_verified": True})],
            capture_output=True, text=True, timeout=90)
        try:
            rows = json.loads(p.stdout)
        except Exception:
            rows = None
        if isinstance(rows, list) and rows and rows[0].get("role") == role:
            return rows[0]
        time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"profile mirror failed for {uid} role={role}: out={(p.stdout or '')[:300]} err={p.stderr[:200]}")

def create_user(email, name, role):
    rows = run_sql(f"select id::text as uid from auth.users where email = '{email}';")
    if rows:
        uid = rows[0]["uid"]
        print(f"exists {role} {uid} (resetting password)")
    else:
        rows = run_sql(f"""insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, is_super_admin)
select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  '{email}', extensions.crypt('{PW}', extensions.gen_salt('bf', 10)), now(), now(), now(),
  '', '', '', '',
  '{{"provider":"email","providers":["email"]}}'::jsonb,
  jsonb_build_object('full_name', '{name}'), false
where not exists (select 1 from auth.users u where u.email = '{email}');
""")
        rows = run_sql(f"select id::text as uid from auth.users where email = '{email}';")
        if not rows:
            raise RuntimeError(f"insert produced no user for {email}")
        uid = rows[0]["uid"]
        print(f"created {role} {uid}")
    run_sql(f"update auth.users set encrypted_password = extensions.crypt('{PW}', extensions.gen_salt('bf', 10)), updated_at = now() where email = '{email}';")
    run_sql(f"""insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
select gen_random_uuid(), u.id, jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email', u.id::text, now(), now()
from auth.users u where u.email = '{email}'
  and not exists (select 1 from auth.identities i where i.user_id = u.id);""")
    run_sql(f"""insert into public.user_roles (user_id, role, granted_by)
select u.id, '{role}'::app_role, u.id from auth.users u where u.email = '{email}'
on conflict (user_id, role) do nothing;""")
    rest_patch_profile(uid, role)
    print(f"OK {role} {uid}")
    return uid

users = []
for role in ROLES:
    email = f"swarm-provider-{role}@doc0clock.online"
    uid = create_user(email, f"Swarm Provider {role.replace('_',' ').title()}", role)
    users.append({"email": email, "role": role, "uid": uid})

pat_email = "swarm-provider-patient@doc0clock.online"
pat_uid = create_user(pat_email, "Swarm Provider Patient", "patient")
print(f"OK patient {pat_uid}")

data = {"password": PW, "patient": {"email": pat_email, "uid": pat_uid},
        "providers": users}
with open(TOKENS, "w") as f:
    json.dump(data, f, indent=2)
os.chmod(TOKENS, 0o600)
print(f"WROTE {TOKENS} users={len(users)+1}")
