// Safe admin user deletion.
// POST { mode: 'dry_run' | 'delete', user_id: string, confirmation_email?: string }
//
// - Only platform super_admin (via user_roles) may call.
// - Dry-run first: returns per-table row counts of what WOULD be deleted.
// - Actual deletion requires confirmation_email to exactly match the target's email.
// - Deletes in FK-safe order (children before parents) inside ONE transaction
//   via admin_delete_user_execute; any failure rolls everything back.
// - CEO accounts are UNDELETABLE (checked here, in the RPC, and in the UI).
// - The caller cannot delete their own account.
//
// FK discovery is dynamic (pg_constraint via admin_delete_user_discover),
// so new tables are handled without code changes.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Hard block: these accounts can never be deleted ──────────────────────
const PROTECTED_EMAILS = new Set([
  "mbyo2@gmail.com",
  "kondwaninyirenda99@gmail.com",
]);

// Shared entities: rows that must SURVIVE (detach the user reference instead).
// Format: "schema.table.column"
const DETACH_COLUMNS = new Set([
  "public.healthcare_institutions.admin_id",
]);

const IDENT_RE = /^[a-z_][a-z0-9_]*$/;

function qi(name: string): string {
  if (!IDENT_RE.test(name)) throw new Error(`Unsafe identifier: ${name}`);
  return `"${name}"`;
}

interface FkEdge {
  table_schema: string;
  table_name: string;
  column_name: string;
  ref_schema: string;
  ref_table: string;
  ref_column: string;
  is_nullable: boolean;
  delete_rule: string;
}

const tblKey = (s: string, t: string) => `${s}.${t}`;
const isRoot = (s: string, t: string) =>
  (s === "auth" && t === "users") || (s === "public" && t === "profiles");

interface TableNode {
  schema: string;
  table: string;
  // edges where THIS table references a parent
  edges: FkEdge[];
}

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── 1. Authenticate + authorize: platform super_admin only ──────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !caller) return json({ error: "Unauthorized" }, 401);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin");
    if (!roles || roles.length === 0) {
      return json({ error: "Platform superadmin access required" }, 403);
    }

    // ── 2. Parse + validate input ───────────────────────────────────────
    const body = await req.json();
    const mode = body.mode;
    const targetUserId = body.user_id;
    if (!targetUserId || !/^[0-9a-f-]{36}$/i.test(targetUserId)) {
      return json({ error: "Valid user_id required" }, 400);
    }
    if (mode !== "dry_run" && mode !== "delete") {
      return json({ error: "mode must be 'dry_run' or 'delete'" }, 400);
    }
    if (targetUserId.toLowerCase() === caller.id.toLowerCase()) {
      return json({ error: "You cannot delete your own account" }, 400);
    }

    // ── 3. Resolve target identity (service_role can read auth.users) ───
    const { data: targetUser, error: targetErr } =
      await supabase.auth.admin.getUserById(targetUserId);
    if (targetErr || !targetUser?.user) {
      return json({ error: "Target user not found" }, 404);
    }
    const targetEmail = (targetUser.user.email || "").toLowerCase();

    if (PROTECTED_EMAILS.has(targetEmail)) {
      return json({ error: `Account ${targetEmail} is protected and cannot be deleted` }, 403);
    }

    // Profile info for the UI (best effort)
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, first_name, last_name, created_at")
      .eq("id", targetUserId)
      .maybeSingle();

    // ── 4. Discover FK graph ────────────────────────────────────────────
    const { data: edges, error: discErr } = await supabase.rpc(
      "admin_delete_user_discover"
    );
    if (discErr) throw new Error(`FK discovery failed: ${discErr.message}`);
    const allEdges = (edges || []) as FkEdge[];

    // Build dependents map: parentKey -> edges where child references parent
    // and node map: childKey -> node
    const nodes = new Map<string, TableNode>();
    const dependentsOf = new Map<string, FkEdge[]>(); // parentKey -> edges

    const ensureNode = (s: string, t: string): TableNode => {
      const k = tblKey(s, t);
      let n = nodes.get(k);
      if (!n) {
        n = { schema: s, table: t, edges: [] };
        nodes.set(k, n);
      }
      return n;
    };

    for (const e of allEdges) {
      // validate identifiers early (fail closed on anything unexpected)
      qi(e.table_schema); qi(e.table_name); qi(e.column_name);
      qi(e.ref_schema); qi(e.ref_table); qi(e.ref_column);

      const childKey = tblKey(e.table_schema, e.table_name);
      const parentKey = tblKey(e.ref_schema, e.ref_table);
      const node = ensureNode(e.table_schema, e.table_name);
      node.edges.push(e);
      if (!dependentsOf.has(parentKey)) dependentsOf.set(parentKey, []);
      dependentsOf.get(parentKey)!.push(e);
      ensureNode(e.ref_schema, e.ref_table); // parent exists as node too
      void childKey;
    }

    // ── 5. BFS from roots: find all user-linked tables ───────────────────
    const linked = new Map<string, TableNode>(); // tables to delete (excludes roots)
    const queue: string[] = [tblKey("auth", "users"), tblKey("public", "profiles")];
    const visited = new Set<string>(queue);

    while (queue.length > 0) {
      const parentKey = queue.shift()!;
      for (const e of dependentsOf.get(parentKey) || []) {
        const childKey = tblKey(e.table_schema, e.table_name);
        if (isRoot(e.table_schema, e.table_name)) continue; // roots handled explicitly
        if (!visited.has(childKey)) {
          visited.add(childKey);
          queue.push(childKey);
        }
        if (!linked.has(childKey)) {
          linked.set(childKey, nodes.get(childKey)!);
        }
      }
    }

    // ── 6. Classify: detach vs owned-delete vs shared (skip) ─────────────
    // A table is DETACH if any of its user-link edges is a curated
    // shared-entity column (e.g. healthcare_institutions.admin_id).
    // A table is OWNED if it has at least one user-link edge to a root or
    // to another owned, non-detach table. Tables reachable only through
    // shared entities (e.g. institution_settings -> institutions) are
    // SKIPPED — their rows belong to the shared entity, not the user.
    const detachTables = new Set<string>();
    const tableDetachEdges = new Map<string, FkEdge[]>();

    for (const [key, node] of linked) {
      void node;
      for (const e of (nodes.get(key)?.edges || [])) {
        const pk = tblKey(e.ref_schema, e.ref_table);
        if (!isRoot(e.ref_schema, e.ref_table) && !linked.has(pk)) continue;
        if (DETACH_COLUMNS.has(`${e.table_schema}.${e.table_name}.${e.column_name}`)) {
          detachTables.add(key);
          if (!tableDetachEdges.has(key)) tableDetachEdges.set(key, []);
          tableDetachEdges.get(key)!.push(e);
        }
      }
    }

    // Fail closed: a table with BOTH detach and owned edges needs manual review.
    // (Owned check below determines this.)

    const ownedMemo = new Map<string, boolean>();
    const ownedVisiting = new Set<string>();
    function isOwned(key: string): boolean {
      const hit = ownedMemo.get(key);
      if (hit !== undefined) return hit;
      if (detachTables.has(key)) { ownedMemo.set(key, false); return false; }
      if (ownedVisiting.has(key)) return false; // cycle: not owned via this path
      ownedVisiting.add(key);
      let owned = false;
      for (const e of (nodes.get(key)?.edges || [])) {
        const pk = tblKey(e.ref_schema, e.ref_table);
        if (DETACH_COLUMNS.has(`${e.table_schema}.${e.table_name}.${e.column_name}`)) continue;
        if (isRoot(e.ref_schema, e.ref_table)) { owned = true; break; }
        if (linked.has(pk) && !detachTables.has(pk) && isOwned(pk)) { owned = true; break; }
      }
      ownedVisiting.delete(key);
      ownedMemo.set(key, owned);
      return owned;
    }

    const detachSteps: { schema: string; table: string; column: string }[] = [];
    const deleteKeys: string[] = [];

    for (const key of linked.keys()) {
      if (detachTables.has(key)) {
        for (const e of tableDetachEdges.get(key)!) {
          if (!e.is_nullable) {
            return json({
              error: `Cannot detach ${key}.${e.column_name}: column is NOT NULL and the row must survive. Manual review required.`,
            }, 409);
          }
          detachSteps.push({ schema: e.table_schema, table: e.table_name, column: e.column_name });
        }
      } else if (isOwned(key)) {
        deleteKeys.push(key);
      }
      // else: shared-entity subtree — rows survive, skip silently
    }

    // ── 7. Build user predicates (recursive, memoized, cycle-safe) ──────
    const predMemo = new Map<string, string>();
    const visiting = new Set<string>();

    function predicateFor(key: string): string {
      const hit = predMemo.get(key);
      if (hit) return hit;
      if (visiting.has(key)) {
        throw new Error(`FK cycle detected at ${key} — refusing to delete (manual review required)`);
      }
      visiting.add(key);
      const node = nodes.get(key)!;
      const conds: string[] = [];
      for (const e of node.edges) {
        const pk = tblKey(e.ref_schema, e.ref_table);
        if (!isRoot(e.ref_schema, e.ref_table) && !linked.has(pk)) continue; // outside closure
        if (DETACH_COLUMNS.has(`${e.table_schema}.${e.table_name}.${e.column_name}`)) continue; // detached, not deleted
        if (detachTables.has(pk)) continue; // shared entity survives — not a deletion path
        if (!isRoot(e.ref_schema, e.ref_table) && !isOwned(pk)) continue; // shared subtree — not a deletion path
        if (isRoot(e.ref_schema, e.ref_table)) {
          conds.push(`${qi(e.column_name)} = $1`);
        } else {
          const parentPred = predicateFor(pk);
          conds.push(
            `${qi(e.column_name)} IN (SELECT ${qi(e.ref_column)} FROM ${qi(e.ref_schema)}.${qi(e.ref_table)} WHERE ${parentPred})`
          );
        }
      }
      visiting.delete(key);
      if (conds.length === 0) {
        throw new Error(`No user-link predicate for ${key} — refusing to delete`);
      }
      const pred = conds.join(" OR ");
      predMemo.set(key, pred);
      return pred;
    }

    // ── 8. Topological order (Kahn's): children before parents ──────────
    // Edge child -> parent means child must be deleted first.
    const indegree = new Map<string, number>();
    const childrenOf = new Map<string, string[]>(); // parentKey -> childKeys (delete order edges)
    for (const k of deleteKeys) indegree.set(k, 0);

    for (const k of deleteKeys) {
      const node = nodes.get(k)!;
      for (const e of node.edges) {
        const pk = tblKey(e.ref_schema, e.ref_table);
        if (deleteKeys.includes(pk)) {
          // k depends on pk: pk must come AFTER k
          indegree.set(pk, (indegree.get(pk) || 0) + 1);
          if (!childrenOf.has(pk)) childrenOf.set(pk, []);
          childrenOf.get(pk)!.push(k);
        }
      }
    }

    const ordered: string[] = [];
    const ready = deleteKeys.filter((k) => (indegree.get(k) || 0) === 0);
    while (ready.length > 0) {
      const k = ready.shift()!;
      ordered.push(k);
      // k is deleted; for each parent p of k that is in deleteKeys, reduce indegree
      const node = nodes.get(k)!;
      const seenParents = new Set<string>();
      for (const e of node.edges) {
        const pk = tblKey(e.ref_schema, e.ref_table);
        if (deleteKeys.includes(pk) && !seenParents.has(pk)) {
          seenParents.add(pk);
          indegree.set(pk, (indegree.get(pk) || 1) - 1);
          if (indegree.get(pk) === 0) ready.push(pk);
        }
      }
    }
    if (ordered.length !== deleteKeys.length) {
      const stuck = deleteKeys.filter((k) => !ordered.includes(k));
      return json({
        error: `FK cycle detected among: ${stuck.join(", ")} — refusing to delete (manual review required)`,
      }, 409);
    }
    void childrenOf;

    const steps = ordered.map((k) => {
      const [schema, table] = k.split(".");
      return { schema, table, predicate: predicateFor(k) };
    });

    const target = {
      user_id: targetUserId,
      email: targetEmail,
      first_name: (profile as any)?.first_name || null,
      last_name: (profile as any)?.last_name || null,
      created_at: (profile as any)?.created_at || targetUser.user.created_at,
    };

    // ── 9a. Dry run ─────────────────────────────────────────────────────
    if (mode === "dry_run") {
      const { data: counts, error: countErr } = await supabase.rpc(
        "admin_delete_user_counts",
        { p_steps: steps, p_target: targetUserId, p_detach: detachSteps }
      );
      if (countErr) throw new Error(`Dry-run failed: ${countErr.message}`);

      const nonzero = (counts || []).filter((c: any) => Number(c.row_count) > 0);
      const deletes = nonzero.filter((c: any) => c.action === "delete");
      const detaches = nonzero.filter((c: any) => c.action !== "delete");
      const total = deletes.reduce((s: number, c: any) => s + Number(c.row_count), 0);

      return json({
        mode: "dry_run",
        target,
        tables_affected: deletes.length,
        total_rows: total,
        detach: detaches.map((c: any) => ({
          table: c.table_name,
          action: "detach (set null)",
          rows: Number(c.row_count),
        })),
        details: deletes
          .map((c: any) => ({ table: c.table_name, rows: Number(c.row_count), action: "delete" }))
          .sort((a: any, b: any) => b.rows - a.rows),
        warning: "This is a dry run. Nothing was deleted. Re-run with mode='delete' and confirmation_email to proceed.",
      });
    }

    // ── 9b. Execute ──────────────────────────────────────────────────────
    const confirmationEmail = (body.confirmation_email || "").toLowerCase().trim();
    if (!confirmationEmail) {
      return json({ error: "confirmation_email is required for deletion" }, 400);
    }
    if (confirmationEmail !== targetEmail) {
      return json({ error: "confirmation_email does not match the target user's email" }, 400);
    }

    const { data: report, error: execErr } = await supabase.rpc(
      "admin_delete_user_execute",
      {
        p_steps: steps,
        p_detach: detachSteps,
        p_target: targetUserId,
        p_actor: caller.id,
        p_target_email: targetEmail,
      }
    );
    if (execErr) throw new Error(`Deletion failed and was rolled back: ${execErr.message}`);

    return json({ mode: "delete", target, report });
  } catch (e: any) {
    console.error("admin-delete-user error:", e.message);
    return json({ error: e.message || "Deletion failed" }, 500);
  }
});
