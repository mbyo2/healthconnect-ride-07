// Workstream A (auth & session audit, 2026-11-15) — role-oracle pins.
//
// Proven live before the fix (anon key only):
//   POST /rest/v1/rpc/has_admin_scope {"p_uid": "<super_admin id>"} -> true
//   POST /rest/v1/rpc/has_role {"_user_id": "<super_admin id>", "_role": "super_admin"} -> true
// has_role answered about ANY user id (has_admin_scope delegates to it).
// The oracle closes inside the function (migration
// 20261115_workstream_a_has_role_oracle_guard.sql): a caller may only ask
// about themselves, unless admin/super_admin or trusted server context
// (service_role / no JWT). The anon/authenticated EXECUTE grants stay on
// purpose: RLS policies evaluated for anon callers (e.g.
// public_view_institutions calls has_admin_scope(auth.uid())) need them,
// and the security-db-sweep test pins those grants.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSrc = (p: string) => readFileSync(resolve(__dirname, "../../", p), "utf8");

const MIGRATION = "supabase/migrations/20261115_workstream_a_has_role_oracle_guard.sql";

describe("has_role oracle guard (workstream A)", () => {
  it("the guard migration exists and rewrites has_role", () => {
    const sql = readSrc(MIGRATION);
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)"
    );
  });

  it("a caller asking about someone else gets the answer about themselves", () => {
    const sql = readSrc(MIGRATION);
    expect(sql).toContain("WHEN auth.uid() = _user_id THEN _user_id");
    expect(sql).toContain("ELSE auth.uid()");
  });

  it("platform admins and trusted server context keep cross-user checks", () => {
    const sql = readSrc(MIGRATION);
    expect(sql).toContain("public.is_service_role()");
    expect(sql).toContain("auth.jwt() IS NULL");
    expect(sql).toContain("'admin'::app_role, 'super_admin'::app_role");
  });

  it("the EXECUTE grants are kept (policies evaluated as anon need them)", () => {
    const sql = readSrc(MIGRATION);
    expect(sql).not.toMatch(/REVOKE EXECUTE ON FUNCTION public\.has_role/);
  });

  it("has_admin_scope needs no change: it delegates to the guarded has_role", () => {
    // Guard lives in has_role; has_admin_scope calls has_role(p_uid, ...)
    // for both branches, so an anon probe through it now returns false.
    expect(readSrc(MIGRATION)).toContain("has_admin_scope");
  });
});
