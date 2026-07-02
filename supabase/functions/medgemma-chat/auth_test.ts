// Deno tests: verify server-side role/auth checks for medgemma edge functions
// and that audit_logs / security_audit_log reject non-service-role writes.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("VITE_SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;

assert(SUPABASE_URL, "SUPABASE_URL must be set");
assert(ANON_KEY, "SUPABASE_ANON_KEY must be set");

const MEDGEMMA_FNS = [
  "medgemma-chat",
  "medgemma-health-analysis",
  "medgemma-document-analysis",
  "medgemma-3d-imaging",
];

async function callFn(fn: string, authHeader?: string, body: unknown = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
  };
  if (authHeader) headers["Authorization"] = authHeader;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text };
}

// -------- Medgemma auth-gate tests --------

for (const fn of MEDGEMMA_FNS) {
  Deno.test(`${fn}: rejects missing Authorization header (401)`, async () => {
    const { status, text } = await callFn(fn, undefined, { message: "hi" });
    assertEquals(
      status,
      401,
      `expected 401 without Authorization, got ${status}: ${text}`,
    );
    assert(text.toLowerCase().includes("unauthorized"), `body: ${text}`);
  });

  Deno.test(`${fn}: rejects invalid bearer token (401)`, async () => {
    const { status, text } = await callFn(
      fn,
      "Bearer not-a-real-jwt-token-xxx",
      { message: "hi" },
    );
    assertEquals(
      status,
      401,
      `expected 401 with bad token, got ${status}: ${text}`,
    );
  });

  Deno.test(`${fn}: rejects anon-key-only auth (no user) with 401`, async () => {
    // Passing the anon key as the Authorization bearer resolves to no user,
    // so the server-side role check must reject it before hitting the paid AI.
    const { status, text } = await callFn(fn, `Bearer ${ANON_KEY}`, {
      message: "hi",
    });
    assertEquals(
      status,
      401,
      `expected 401 with anon-only bearer, got ${status}: ${text}`,
    );
  });
}

// -------- Audit / security log RLS tests (service-role-only writes) --------

async function restInsert(table: string, row: Record<string, unknown>, jwt: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  const text = await res.text();
  return { status: res.status, text };
}

Deno.test("audit_logs: anon INSERT is rejected by RLS", async () => {
  const { status, text } = await restInsert(
    "audit_logs",
    { action: "test", table_name: "test" },
    ANON_KEY,
  );
  assert(
    status === 401 || status === 403 || status === 400 || status === 404,
    `expected auth/RLS failure for anon insert, got ${status}: ${text}`,
  );
});

Deno.test("security_audit_log: anon INSERT is rejected by RLS", async () => {
  const { status, text } = await restInsert(
    "security_audit_log",
    { event_type: "test_event", event_data: {} },
    ANON_KEY,
  );
  assert(
    status === 401 || status === 403 || status === 400 || status === 404,
    `expected auth/RLS failure for anon insert, got ${status}: ${text}`,
  );
});

// Confirm anon SELECT is also blocked (no public exposure of logs)
async function restSelect(table: string, jwt: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`,
    {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` },
    },
  );
  const text = await res.text();
  return { status: res.status, text };
}

Deno.test("audit_logs: anon SELECT returns no rows / is blocked", async () => {
  const { status, text } = await restSelect("audit_logs", ANON_KEY);
  // RLS with no matching policy yields 200 + [] for anon; either that or an auth error is acceptable
  if (status === 200) {
    assertEquals(text.trim(), "[]", `unexpected rows visible to anon: ${text}`);
  } else {
    assert(
      status === 401 || status === 403,
      `unexpected status ${status}: ${text}`,
    );
  }
});

Deno.test("security_audit_log: anon SELECT returns no rows / is blocked", async () => {
  const { status, text } = await restSelect("security_audit_log", ANON_KEY);
  if (status === 200) {
    assertEquals(text.trim(), "[]", `unexpected rows visible to anon: ${text}`);
  } else {
    assert(
      status === 401 || status === 403,
      `unexpected status ${status}: ${text}`,
    );
  }
});
