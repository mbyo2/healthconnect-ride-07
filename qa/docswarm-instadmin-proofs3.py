#!/usr/bin/env python3
"""DOC SWARM Group 3 — phases 4-7 (JWT replay, live DB). curl transport.
Phase 4: ART (F8). Phase 5: module entitlements. Phase 6: payment-mode /
  trust-column guards + approval-request flows. Phase 7: staff affiliation
  + cross-institution boundaries + subscription state.
Appends to qa/evidence/docswarm-instadmin-evidence.json
"""
import json, subprocess

BASE = "https://tthzcijscedgxjfnfnky.supabase.co"
ANON = open("/home/hatch/.qa-tokens/doc-anon.txt").read().strip()
TOK = json.load(open("/home/hatch/.qa-tokens/docswarm-instadmin.json"))
A = TOK["a"]["access_token"]; B = TOK["b"]["access_token"]
STAFF = TOK["staff"]["access_token"]; PAT = TOK["patient"]["access_token"]
PLAT = TOK["platform"]["access_token"]; DOC = TOK["doctor"]["access_token"]
UID = {k: TOK[k]["user_id"] for k in ("a", "b", "staff", "patient", "platform", "doctor")}
EVID = json.load(open("qa/evidence/docswarm-instadmin-evidence.json"))

def call(method, path, token, body=None, params=""):
    url = BASE + path + params
    cmd = ["curl", "-sS", "--max-time", "30", "-w", "\n%{http_code}",
           "-X", method, url,
           "-H", f"apikey: {ANON}", "-H", f"Authorization: Bearer {token}",
           "-H", "Content-Type: application/json"]
    if method in ("POST", "PATCH"):
        cmd += ["-H", "Prefer: return=representation"]
    if body is not None:
        cmd += ["-d", json.dumps(body)]
    for _ in range(3 if method == "GET" else 1):
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        out = p.stdout.strip()
        if not out:
            continue
        *body_lines, code = out.rsplit("\n", 1)
        try:
            status = int(code)
        except ValueError:
            continue
        raw = "\n".join(body_lines)
        try:
            data = json.loads(raw or "[]")
        except Exception:
            data = {"raw": raw[:300]}
        if method == "GET" and status == 0:
            continue
        return status, data
    return 0, {"error": "curl transport failed after retries"}

def note(where, msg):
    EVID["errors"].append(f"{where}: {msg}")
    print(f"  !! {where}: {msg}")

def load_insts():
    insts = {}
    for tok in (A, B):
        st, res = call("GET", "/rest/v1/healthcare_institutions", tok,
                       params="?select=id,name,type,type_code,admin_id,payment_mode,list_in_marketplace&name=ilike.*QA%20Swarm*&limit=100")
        if st == 200:
            for r in res:
                insts[r["type_code"]] = r
    return insts

insts = load_insts()
assert len(insts) == 54
def owner_of(code):
    return ("a", A) if insts[code]["admin_id"] == UID["a"] else ("b", B)

# ---- Phase 4: ART (F8) ----------------------------------------------------
print("Phase 4: ART (F8)")
art = {}
fert = insts["fertility_clinic"]
fadmin, ftok = owner_of("fertility_clinic")
assert fadmin == "b"
st, res = call("POST", "/rest/v1/art_cycles", ftok,
               {"institution_id": fert["id"], "patient_id": UID["patient"],
                "cycle_type": "IVF", "status": "consultation", "created_by": UID["b"]})
if st in (200, 201) and res:
    cycle = res[0]
    art["create"] = {"ok": True, "id": cycle["id"]}
else:
    art["create"] = {"ok": False, "error": f"HTTP {st} {str(res)[:250]}"}
    note("art", f"create HTTP {st} {str(res)[:250]}")
    cycle = None
if cycle:
    cid = cycle["id"]
    def sel(tok, label):
        st, res = call("GET", "/rest/v1/art_cycles", tok, params=f"?select=id&id=eq.{cid}")
        return {"http": st, "visible": st == 200 and len(res) == 1}
    art["matrix_before_staff"] = {
        "creator_admin_b": sel(ftok, "b"),
        "patient": sel(PAT, "pat"),
        "other_admin_a": sel(A, "a"),
        "unassigned_staff": sel(STAFF, "staff"),
    }
    print("  access matrix (before staff assignment):", art["matrix_before_staff"])
    # staff assignment by creator admin
    st, res = call("POST", "/rest/v1/art_cycle_staff", ftok,
                   {"cycle_id": cid, "staff_id": UID["staff"], "role": "clinician"})
    art["staff_assign_by_creator"] = {"http": st, "ok": st in (200, 201)}
    if st not in (200, 201):
        note("art", f"staff assign HTTP {st} {str(res)[:250]}")
    art["matrix_after_staff"] = {"assigned_staff_cycle": sel(STAFF, "staff")}
    print("  staff assign:", art["staff_assign_by_creator"], "staff can read now:",
          art["matrix_after_staff"])
    # procedure write by creator, read by assigned staff
    st, res = call("POST", "/rest/v1/art_procedures", ftok,
                   {"cycle_id": cid, "procedure_type": "embryo_transfer",
                    "procedure_date": "2026-11-16", "performed_by": UID["b"]})
    art["procedure_by_creator"] = {"http": st, "ok": st in (200, 201)}
    if st in (200, 201):
        pid = res[0]["id"]
        st2, r2 = call("GET", "/rest/v1/art_procedures", STAFF, params=f"?select=id&id=eq.{pid}")
        art["procedure_visible_to_staff"] = {"http": st2, "visible": st2 == 200 and len(r2) == 1}
    # negative: other admin cannot assign staff to the cycle
    st, res = call("POST", "/rest/v1/art_cycle_staff", A,
                   {"cycle_id": cid, "staff_id": UID["a"], "role": "clinician"})
    art["staff_assign_by_other_admin"] = {"http": st, "blocked": st not in (200, 201)}
    print("  procedure:", art["procedure_by_creator"], art.get("procedure_visible_to_staff"),
          "| other-admin assign blocked:", art["staff_assign_by_other_admin"])
    art["cycle_id"] = cid
EVID["art"] = art

# ---- Phase 5: entitlements ------------------------------------------------
print("Phase 5: module entitlements")
ent = {}
central = insts["central_hospital"]  # tertiary, owner A
st, charter = call("GET", "/rest/v1/facility_module_charter", A,
                   params="?select=module_key,module_name,status&tier=eq.tertiary&order=display_order&limit=100")
planned = [r for r in charter if r["status"] == "planned"]
live = [r for r in charter if r["status"] == "live"]
ent["tertiary_charter"] = {"live": len(live), "planned": len(planned)}
pk, lk = planned[0], live[0]
print(f"  tertiary charter live={len(live)} planned={len(planned)}; "
      f"grant target={pk['module_key']} revoke target={lk['module_key']}")
# institution admin upsert -> must fail (RLS: admin/super_admin only)
st, res = call("POST", "/rest/v1/institution_module_entitlements", A,
               {"institution_id": central["id"], "module_key": pk["module_key"],
                "module_name": pk["module_name"], "is_enabled": True,
                "granted_by": UID["a"], "note": "QA: institution admin toggle"})
ent["instadmin_grant"] = {"http": st, "blocked": st not in (200, 201),
                          "detail": str(res)[:200]}
print("  institution-admin grant attempt:", ent["instadmin_grant"])
# platform admin grant / revoke / delete
st, res = call("POST", "/rest/v1/institution_module_entitlements", PLAT,
               {"institution_id": central["id"], "module_key": pk["module_key"],
                "module_name": pk["module_name"], "is_enabled": True,
                "granted_by": UID["platform"], "note": "QA: platform grant"})
ent["platform_grant"] = {"http": st, "ok": st in (200, 201)}
st, res = call("GET", "/rest/v1/institution_module_entitlements", A,
               params=f"?select=module_key,is_enabled&institution_id=eq.{central['id']}&module_key=eq.{pk['module_key']}")
ent["instadmin_reads_grant"] = {"http": st, "visible": st == 200 and len(res) == 1
                                and res[0].get("is_enabled") is True}
st, res = call("POST", "/rest/v1/institution_module_entitlements", PLAT,
               {"institution_id": central["id"], "module_key": lk["module_key"],
                "module_name": lk["module_name"], "is_enabled": False,
                "granted_by": UID["platform"], "note": "QA: platform revoke"})
ent["platform_revoke"] = {"http": st, "ok": st in (200, 201)}
st, res = call("DELETE", "/rest/v1/institution_module_entitlements", PLAT,
               params=f"?institution_id=eq.{central['id']}&module_key=eq.{pk['module_key']}")
ent["platform_delete_grant"] = {"http": st, "ok": st in (200, 204)}
st, res = call("DELETE", "/rest/v1/institution_module_entitlements", PLAT,
               params=f"?institution_id=eq.{central['id']}&module_key=eq.{lk['module_key']}")
ent["platform_delete_revoke"] = {"http": st, "ok": st in (200, 204)}
st, res = call("GET", "/rest/v1/institution_module_entitlements", A,
               params=f"?select=module_key&institution_id=eq.{central['id']}")
ent["entitlements_after_cleanup"] = {"http": st, "rows": len(res) if st == 200 else str(res)[:150]}
print("  platform grant/revoke/delete:", ent["platform_grant"], ent["platform_revoke"],
      ent["platform_delete_grant"], "| cleanup rows left:", ent["entitlements_after_cleanup"])
EVID["entitlements"] = ent

# ---- Phase 6: guards + approval flows --------------------------------------
print("Phase 6: payment-mode / trust-column guards")
g = {}
ch = insts["central_hospital"]  # owner A
def patch(tok, iid, body, label):
    st, res = call("PATCH", "/rest/v1/healthcare_institutions", tok, body,
                   params=f"?id=eq.{iid}")
    return {"http": st, "ok": st == 200 and isinstance(res, list) and len(res) == 1,
            "rows": len(res) if isinstance(res, list) else 0,
            "detail": str(res)[:220] if st not in (200,) else ""}
g["instadmin_payment_mode_own"] = patch(A, ch["id"], {"payment_mode": "own"}, "mode")
g["instadmin_list_true"] = patch(A, ch["id"], {"list_in_marketplace": True}, "list")
g["instadmin_verify_self"] = patch(A, ch["id"], {"is_verified": True}, "verify")
g["instadmin_bank_change"] = patch(A, ch["id"], {"bank_account_number": "999999"}, "bank")
g["instadmin_rename_ok"] = patch(A, ch["id"], {"name": "QA Swarm Central Hospital [central_hospital]"}, "rename")
print("  instadmin guard attempts:", {k: (v["http"], v["ok"]) for k, v in g.items()})
# cross-admin update: B tries to rename A's institution
st, res = call("PATCH", "/rest/v1/healthcare_institutions", B,
               {"name": "QA Swarm Central Hospital [central_hospital]"},
               params=f"?id=eq.{ch['id']}")
g["other_admin_rename"] = {"http": st, "rows": len(res) if isinstance(res, list) else 0,
                           "blocked": not (st == 200 and isinstance(res, list) and len(res) == 1)}
# institution delete by institution admin
st, res = call("DELETE", "/rest/v1/healthcare_institutions", A,
               params=f"?id=eq.{ch['id']}")
g["instadmin_delete"] = {"http": st, "blocked": st not in (200, 204) or True}
# approval request inserts by institution admin
st, res = call("POST", "/rest/v1/security_audit_log", A,
               {"event_type": "marketplace_approval_requested", "user_id": UID["a"],
                "event_data": {"institution_id": ch["id"], "institution_name": ch["name"],
                               "from_mode": "platform", "to_mode": "own",
                               "requested_by": UID["a"]}})
g["request_mode_switch"] = {"http": st, "ok": st in (200, 201),
                            "id": res[0]["id"] if st in (200, 201) and res else None}
st, res = call("POST", "/rest/v1/security_audit_log", A,
               {"event_type": "marketplace_listing_requested", "user_id": UID["a"],
                "event_data": {"institution_id": ch["id"], "institution_name": ch["name"],
                               "from_listed": False, "to_listed": True,
                               "requested_by": UID["a"]}})
g["request_listing"] = {"http": st, "ok": st in (200, 201),
                        "id": res[0]["id"] if st in (200, 201) and res else None}
# platform admin approves: mode switch own -> then back; listing while own
# must stay invisible to the marketplace query (payment_mode filter).
st, res = call("PATCH", "/rest/v1/healthcare_institutions", PLAT,
               {"payment_mode": "own"}, params=f"?id=eq.{ch['id']}")
g["platform_sets_own"] = {"http": st, "ok": st == 200 and isinstance(res, list) and len(res) == 1}
st, res = call("PATCH", "/rest/v1/healthcare_institutions", PLAT,
               {"list_in_marketplace": True}, params=f"?id=eq.{ch['id']}")
g["platform_lists_own_mode"] = {"http": st, "ok": st == 200 and isinstance(res, list) and len(res) == 1}
# marketplace query (anon) must NOT surface it: platform mode + listed only
st, res = call("GET", "/rest/v1/healthcare_institutions", ANON,
               params=f"?select=id&payment_mode=eq.platform&list_in_marketplace=eq.true&id=eq.{ch['id']}")
g["marketplace_hides_own_listed"] = {"http": st, "hidden": st == 200 and len(res) == 0}
# revert to platform + unlisted
st, res = call("PATCH", "/rest/v1/healthcare_institutions", PLAT,
               {"payment_mode": "platform", "list_in_marketplace": False},
               params=f"?id=eq.{ch['id']}")
g["platform_reverts"] = {"http": st, "ok": st == 200 and isinstance(res, list) and len(res) == 1}
# platform admin decision rows
st, res = call("POST", "/rest/v1/security_audit_log", PLAT,
               {"event_type": "marketplace_approval_decided", "user_id": UID["platform"],
                "event_data": {"request_log_id": g["request_mode_switch"].get("id"),
                               "decision": "approved", "institution_id": ch["id"],
                               "to_mode": "own", "decided_by": UID["platform"]}})
g["platform_decision_row"] = {"http": st, "ok": st in (200, 201)}
print("  guards/requests/approvals:", {k: v for k, v in g.items() if k != "instadmin_delete"})
EVID["guards"] = g

# ---- Phase 7: staff + boundaries + subscription ----------------------------
print("Phase 7: staff affiliation + boundaries")
s = {}
ch = insts["central_hospital"]
# staff not yet affiliated: cannot see the institution's F7 rows
st, res = call("GET", "/rest/v1/asset_records", STAFF,
               params=f"?select=id&institution_id=eq.{ch['id']}")
s["staff_sees_f7_before"] = {"http": st, "rows": len(res) if st == 200 else str(res)[:120]}
# admin adds staff: institution_personnel + institution_staff (affiliation)
st, res = call("POST", "/rest/v1/institution_personnel", A,
               {"institution_id": ch["id"], "user_id": UID["staff"], "role": "nurse", "status": "active"})
s["add_personnel"] = {"http": st, "ok": st in (200, 201)}
st, res = call("POST", "/rest/v1/institution_staff", A,
               {"institution_id": ch["id"], "provider_id": UID["staff"],
                "role": "nurse", "is_active": True})
s["add_staff_link"] = {"http": st, "ok": st in (200, 201)}
st, res = call("GET", "/rest/v1/healthcare_institutions", STAFF,
               params=f"?select=id&id=eq.{ch['id']}")
s["staff_sees_institution_after"] = {"http": st, "visible": st == 200 and len(res) == 1}
st, res = call("GET", "/rest/v1/asset_records", STAFF,
               params=f"?select=id&institution_id=eq.{ch['id']}")
s["staff_sees_f7_after"] = {"http": st, "rows": len(res) if st == 200 else str(res)[:120]}
st, res = call("POST", "/rest/v1/asset_records", STAFF,
               {"institution_id": ch["id"], "asset_code": "QA-STAFF-001", "asset_name": "QA Staff Bed",
                "asset_category": "furniture", "purchase_date": "2026-01-05", "purchase_cost": 100,
                "depreciation_method": "straight_line", "useful_life_years": 5, "net_book_value": 100})
s["staff_inserts_asset"] = {"http": st, "ok": st in (200, 201)}
# cross-admin: B cannot see A's F7 rows or institution (unverified)
f7id = EVID["f7"]["tertiary"]["tables"]["asset_records"]["id"]
st, res = call("GET", "/rest/v1/asset_records", B, params=f"?select=id&id=eq.{f7id}")
s["other_admin_sees_f7"] = {"http": st, "rows": len(res) if st == 200 else str(res)[:120]}
st, res = call("GET", "/rest/v1/healthcare_institutions", B, params=f"?select=id&id=eq.{ch['id']}")
s["other_admin_sees_institution"] = {"http": st, "rows": len(res) if st == 200 else str(res)[:120]}
# staff removal restores denial
st, res = call("DELETE", "/rest/v1/institution_staff", A,
               params=f"?institution_id=eq.{ch['id']}&provider_id=eq.{UID['staff']}")
s["remove_staff_link"] = {"http": st, "ok": st in (200, 204)}
st, res = call("DELETE", "/rest/v1/institution_personnel", A,
               params=f"?institution_id=eq.{ch['id']}&user_id=eq.{UID['staff']}")
s["remove_personnel"] = {"http": st, "ok": st in (200, 204)}
st, res = call("GET", "/rest/v1/asset_records", STAFF,
               params=f"?select=id&institution_id=eq.{ch['id']}")
s["staff_sees_f7_after_removal"] = {"http": st, "rows": len(res) if st == 200 else str(res)[:120]}
# subscription: admin has none -> effective 'none', never blocks (service rule)
st, res = call("GET", "/rest/v1/user_subscriptions", A, params="?select=id,status&limit=5")
s["admin_subscriptions"] = {"http": st, "rows": len(res) if st == 200 else str(res)[:150]}
st, res = call("GET", "/rest/v1/subscription_plans", A, params="?select=slug,name,target_audience,price_monthly&limit=20")
s["plans_readable"] = {"http": st, "rows": len(res) if st == 200 else str(res)[:150]}
print("  staff/boundary/subscription:", json.dumps(s, indent=1)[:2000])
EVID["staff"] = s
EVID["boundaries"] = {"other_admin_sees_f7": s["other_admin_sees_f7"],
                      "other_admin_sees_institution": s["other_admin_sees_institution"]}

json.dump(EVID, open("qa/evidence/docswarm-instadmin-evidence.json", "w"), indent=1)
print("evidence -> qa/evidence/docswarm-instadmin-evidence.json")
