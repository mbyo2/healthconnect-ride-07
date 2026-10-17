/**
 * Doc' O Clock — FHIR R4 API server.
 *
 * Base URL:  {function-url}/fhir/R4
 * Resources: Patient, Observation, Condition, MedicationRequest,
 *            Appointment, Encounter, DiagnosticReport, Immunization
 *
 * Operations:
 *   GET  /fhir/R4/metadata            CapabilityStatement
 *   GET  /fhir/R4/{Resource}/{id}     read
 *   GET  /fhir/R4/{Resource}?params   search  (Bundle type=searchset)
 *   POST /fhir/R4/{Resource}          create  (201 + Location)
 *
 * Auth: Bearer <Supabase JWT>. Optional SMART-on-FHIR scopes are honored when
 * present as a space-delimited `scope` claim in app_metadata/user_metadata.
 *
 * Privacy (hard rule): patients can only ever see their OWN records.
 * Providers can read patients they have an appointment relationship with.
 * Platform admins (user_roles admin/super_admin) have full access.
 *
 * NOTE for dashboard deploys: this file imports ./mappers.ts. The Supabase
 * dashboard editor is single-file — inline mappers.ts above the handler
 * (delete the import line) before pasting.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  FHIR_VERSION,
  FHIR_BASE,
  mapPatient,
  mapVitalSignsRow,
  mapLabResultObservation,
  mapCondition,
  mapMedicationRequest,
  mapAppointment,
  mapEncounter,
  mapDiagnosticReport,
  mapImmunization,
  observationToVitals,
  operationOutcome,
} from "./mappers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const RESOURCES = [
  "Patient",
  "Observation",
  "Condition",
  "MedicationRequest",
  "Appointment",
  "Encounter",
  "DiagnosticReport",
  "Immunization",
] as const;

type ResourceName = (typeof RESOURCES)[number];

// ── Response helpers ───────────────────────────────────────────────────────

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/fhir+json", ...extraHeaders },
  });
}

function fhirError(status: number, code: string, diagnostics: string) {
  const severity = status >= 500 ? "fatal" : "error";
  return json(operationOutcome(severity as "fatal" | "error", code, diagnostics), status);
}

function searchBundle(resources: unknown[], total: number, baseUrl: string, resourceType: string) {
  return {
    resourceType: "Bundle",
    id: `search-${Date.now()}`,
    meta: { lastUpdated: new Date().toISOString() },
    type: "searchset",
    total,
    link: [{ relation: "self", url: `${baseUrl}/${resourceType}` }],
    entry: resources.map((r: unknown) => ({
      fullUrl: `${baseUrl}/${resourceType}/${(r as Record<string, unknown>).id}`,
      resource: r,
      search: { mode: "match" },
    })),
  };
}

// ── Auth ───────────────────────────────────────────────────────────────────

interface Caller {
  id: string;
  email?: string;
  roles: Set<string>;
  isAdmin: boolean;
  isPatientOnly: boolean;
  scopes: string[];
}

async function authenticate(req: Request, supabase: ReturnType<typeof createClient>): Promise<Caller | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return fhirError(401, "security", "Missing Authorization header. Use: Bearer <token>");
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return fhirError(401, "security", "Empty bearer token.");

  const { data, error } = await supabase.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return fhirError(401, "security", "Invalid or expired token.");

  const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roles: Set<string> = new Set<string>(
    ((roleRows || []) as Array<{ role: string }>).map((r) => r.role)
  );
  const isAdmin = roles.has("admin") || roles.has("super_admin");
  const isPatientOnly = roles.size === 0 || [...roles].every((r) => r === "patient");

  const scopeClaim =
    (user.app_metadata as Record<string, unknown> | undefined)?.scope ??
    (user.user_metadata as Record<string, unknown> | undefined)?.scope;
  const scopes = typeof scopeClaim === "string" ? scopeClaim.split(/\s+/).filter(Boolean) : [];

  return { id: user.id, email: user.email, roles, isAdmin, isPatientOnly, scopes };
}

/** SMART-on-FHIR scope check. Skipped when the token carries no scope claim. */
function checkScope(caller: Caller, resource: string, write: boolean): Response | null {
  if (caller.scopes.length === 0) return null; // fall back to role/relationship rules
  const need = write ? "write" : "read";
  const ok = caller.scopes.some((s) => {
    const m = s.match(/^(patient|user|system)\/(\*|[A-Za-z]+)\.(read|write|\*)$/);
    if (!m) return false;
    const [, , res, acc] = m;
    return (res === "*" || res === resource) && (acc === "*" || acc === need);
  });
  if (!ok) return fhirError(403, "security", `Missing required SMART scope for ${resource}.${need}.`);
  return null;
}

/** Does this scope claim force patient-level confinement? */
function scopeIsPatientOnly(caller: Caller): boolean {
  if (caller.scopes.length === 0) return false;
  return caller.scopes.some((s) => s.startsWith("patient/")) &&
    !caller.scopes.some((s) => s.startsWith("user/") || s.startsWith("system/"));
}

// ── Access control ─────────────────────────────────────────────────────────

const RELATIONSHIP_CUTOFF_DAYS = 180;
const ACTIVE_APPT_STATUSES = ["scheduled", "confirmed", "in_progress", "completed"];

async function canAccessPatient(
  supabase: ReturnType<typeof createClient>,
  caller: Caller,
  targetPatientId: string
): Promise<boolean> {
  if (caller.id === targetPatientId) return true;
  if (caller.isAdmin) return true;
  if (caller.isPatientOnly || scopeIsPatientOnly(caller)) return false;

  // Provider with a recent appointment relationship (same rule as fhir-export)
  const cutoff = new Date(Date.now() - RELATIONSHIP_CUTOFF_DAYS * 86400000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("appointments")
    .select("id")
    .eq("provider_id", caller.id)
    .eq("patient_id", targetPatientId)
    .in("status", ACTIVE_APPT_STATUSES)
    .gte("date", cutoff)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function providerPatientIds(
  supabase: ReturnType<typeof createClient>,
  callerId: string
): Promise<string[]> {
  const cutoff = new Date(Date.now() - RELATIONSHIP_CUTOFF_DAYS * 86400000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("appointments")
    .select("patient_id")
    .eq("provider_id", callerId)
    .in("status", ACTIVE_APPT_STATUSES)
    .gte("date", cutoff)
    .limit(500);
  const ids: string[] = ((data || []) as Array<{ patient_id: string }>).map((r) => r.patient_id);
  return [...new Set(ids)];
}

// ── Search param helpers ───────────────────────────────────────────────────

function parseDateParam(raw: string | null): { op: string; value: string } | null {
  if (!raw) return null;
  const m = raw.match(/^(ge|le|gt|lt|eq|ne|sa|eb|ap)?(.*)$/);
  if (!m) return null;
  return { op: m[1] || "eq", value: m[2] };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyDateFilter(q: any, column: string, raw: string | null) {
  const p = parseDateParam(raw);
  if (!p) return q;
  switch (p.op) {
    case "ge": return q.gte(column, p.value);
    case "le": return q.lte(column, p.value);
    case "gt": return q.gt(column, p.value);
    case "lt": return q.lt(column, p.value);
    default: return q.eq(column, p.value);
  }
}

function getCount(params: URLSearchParams): number {
  const n = parseInt(params.get("_count") || "20", 10);
  return Math.min(Math.max(n || 20, 1), 100);
}

function patientRefToId(ref: string | null): string | null {
  if (!ref) return null;
  const m = ref.match(/^(?:Patient\/)?([0-9a-f-]{36})$/i);
  return m ? m[1] : null;
}

// ── CapabilityStatement ────────────────────────────────────────────────────

function capabilityStatement(baseUrl: string, tokenUrl: string) {
  const searchParams: Record<string, Array<{ name: string; type: string; documentation: string }>> = {
    Patient: [
      { name: "name", type: "string", documentation: "Search by first or last name" },
      { name: "birthdate", type: "date", documentation: "Date of birth" },
      { name: "gender", type: "token", documentation: "male | female | other | unknown" },
      { name: "identifier", type: "token", documentation: "Patient identifier value" },
    ],
    Observation: [
      { name: "patient", type: "reference", documentation: "Subject patient (Patient/{id} or id)" },
      { name: "subject", type: "reference", documentation: "Alias of patient" },
      { name: "code", type: "token", documentation: "LOINC code" },
      { name: "date", type: "date", documentation: "Effective date (prefixes ge/le/gt/lt/eq)" },
      { name: "category", type: "token", documentation: "vital-signs | laboratory" },
    ],
    Condition: [
      { name: "patient", type: "reference", documentation: "Subject patient" },
      { name: "clinical-status", type: "token", documentation: "active | resolved | inactive" },
      { name: "code", type: "token", documentation: "Free-text search on condition title" },
    ],
    MedicationRequest: [
      { name: "patient", type: "reference", documentation: "Subject patient" },
      { name: "status", type: "token", documentation: "active | completed | cancelled | stopped" },
      { name: "medication", type: "token", documentation: "Medication name search" },
    ],
    Appointment: [
      { name: "patient", type: "reference", documentation: "Patient participant" },
      { name: "practitioner", type: "reference", documentation: "Provider participant" },
      { name: "status", type: "token", documentation: "booked | fulfilled | cancelled | noshow" },
      { name: "date", type: "date", documentation: "Appointment date (prefixes ge/le/gt/lt/eq)" },
    ],
    Encounter: [
      { name: "patient", type: "reference", documentation: "Subject patient" },
      { name: "status", type: "token", documentation: "in-progress | finished" },
      { name: "date", type: "date", documentation: "Admission date (prefixes ge/le/gt/lt/eq)" },
    ],
    DiagnosticReport: [
      { name: "patient", type: "reference", documentation: "Subject patient" },
      { name: "subject", type: "reference", documentation: "Alias of patient" },
      { name: "status", type: "token", documentation: "registered | partial | final | cancelled" },
      { name: "code", type: "token", documentation: "Lab test name search" },
    ],
    Immunization: [
      { name: "patient", type: "reference", documentation: "Subject patient" },
      { name: "status", type: "token", documentation: "completed | not-done" },
      { name: "vaccine-code", type: "token", documentation: "Vaccine name search" },
    ],
  };

  const creatable = new Set(["Patient", "Observation", "Condition", "MedicationRequest", "Appointment"]);

  return {
    resourceType: "CapabilityStatement",
    id: "doc0clock-fhir-server",
    url: `${FHIR_BASE}/metadata`,
    version: "1.0.0",
    name: "DocOClockFHIRServer",
    title: "Doc' O Clock FHIR R4 API",
    status: "active",
    date: new Date().toISOString(),
    publisher: "Doc' O Clock",
    kind: "instance",
    fhirVersion: FHIR_VERSION,
    format: ["json"],
    patchFormat: [],
    implementationGuide: [],
    rest: [
      {
        mode: "server",
        documentation: "Doc' O Clock FHIR R4 API. Auth: Bearer <Supabase JWT>. SMART-on-FHIR scopes honored when present.",
        security: {
          cors: true,
          service: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/restful-security-service",
                  code: "SMART-on-FHIR",
                  display: "SMART-on-FHIR",
                },
              ],
              text: "SMART-on-FHIR (Supabase JWT as bearer token)",
            },
          ],
          extension: [
            {
              url: "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
              extension: [
                { url: "token", valueUri: tokenUrl },
                { url: "authorize", valueUri: tokenUrl },
              ],
            },
          ],
        },
        resource: RESOURCES.map((r) => ({
          type: r,
          profile: `http://hl7.org/fhir/R4/${r}.html`,
          interaction: [
            { code: "read" },
            { code: "search-type" },
            ...(creatable.has(r) ? [{ code: "create" }] : []),
          ],
          searchParam: searchParams[r] || [],
        })),
      },
    ],
  };
}

// ── Resource handlers ──────────────────────────────────────────────────────

interface Ctx {
  supabase: ReturnType<typeof createClient>;
  caller: Caller;
  baseUrl: string;
  params: URLSearchParams;
}

async function resolvePatientScope(ctx: Ctx): Promise<
  | { mode: "self"; id: string }
  | { mode: "list"; ids: string[] }
  | { mode: "all" }
  | Response
> {
  const { caller, supabase } = ctx;
  if (caller.isPatientOnly || scopeIsPatientOnly(caller)) return { mode: "self", id: caller.id };
  if (caller.isAdmin) return { mode: "all" };
  const ids = await providerPatientIds(supabase, caller.id);
  return { mode: "list", ids };
}

/** Enforce subject confinement for a patient-scoped resource search. */
async function scopedPatientId(ctx: Ctx): Promise<string | string[] | "all" | Response> {
  const raw = ctx.params.get("patient") || ctx.params.get("subject");
  const requested = patientRefToId(raw);
  const scope = await resolvePatientScope(ctx);

  if (scope instanceof Response) return scope;
  if (scope.mode === "self") {
    if (requested && requested !== scope.id) {
      return fhirError(403, "security", "Patients may only access their own records.");
    }
    return scope.id;
  }
  if (scope.mode === "all") return requested || "all";
  // provider list
  if (requested) {
    if (!scope.ids.includes(requested)) {
      return fhirError(403, "security", "No care relationship with the requested patient.");
    }
    return requested;
  }
  return scope.ids;
}

// — Patient —

async function readPatient(ctx: Ctx, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fhirError(400, "invalid", "Invalid Patient id.");
  if (!(await canAccessPatient(ctx.supabase, ctx.caller, id))) {
    return fhirError(404, "not-found", "Patient not found."); // 404, not 403: no enumeration
  }
  const { data, error } = await ctx.supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error || !data) return fhirError(404, "not-found", "Patient not found.");
  return json(mapPatient(data));
}

async function searchPatient(ctx: Ctx) {
  const scope = await resolvePatientScope(ctx);
  if (scope instanceof Response) return scope;

  let q = ctx.supabase.from("profiles").select("*", { count: "exact" });
  if (scope.mode === "self") q = q.eq("id", scope.id);
  else if (scope.mode === "list") {
    if (scope.ids.length === 0) return json(searchBundle([], 0, ctx.baseUrl, "Patient"));
    q = q.in("id", scope.ids);
  }

  const name = ctx.params.get("name");
  if (name) q = q.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`);
  const birthdate = ctx.params.get("birthdate");
  if (birthdate) q = q.eq("date_of_birth", birthdate);
  const gender = ctx.params.get("gender");
  if (gender) q = q.eq("gender", gender);
  const identifier = ctx.params.get("identifier");
  if (identifier) q = q.eq("id", identifier);

  const count = getCount(ctx.params);
  const { data, error, count: total } = await q.limit(count);
  if (error) return fhirError(500, "processing", "Patient search failed.");
  return json(searchBundle((data || []).map(mapPatient), total ?? 0, ctx.baseUrl, "Patient"));
}

async function createPatient(ctx: Ctx, body: Record<string, unknown>) {
  // Patient onboarding creates a real auth account: admin-only.
  if (!ctx.caller.isAdmin) {
    return fhirError(403, "security", "Patient registration via FHIR requires an admin caller.");
  }
  const names = (body.name as Array<Record<string, unknown>>) || [];
  const official = names.find((n) => n.use === "official") || names[0] || {};
  const family = String(official.family || "");
  const given = ((official.given as string[]) || [])[0] || "";
  const telecom = (body.telecom as Array<Record<string, string>>) || [];
  const email = telecom.find((t) => t.system === "email")?.value;
  const phone = telecom.find((t) => t.system === "phone")?.value;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return fhirError(422, "required", "Patient.telecom email is required for registration.");
  }
  if (!family && !given) {
    return fhirError(422, "required", "Patient.name (family/given) is required.");
  }

  const password = [...crypto.getRandomValues(new Uint8Array(24))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const { data: created, error: createErr } = await ctx.supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { first_name: given, last_name: family },
  });
  if (createErr || !created?.user) {
    return fhirError(422, "processing", `Patient registration failed: ${createErr?.message || "unknown error"}`);
  }
  const userId = created.user.id;

  // Profile row (signup trigger usually creates it; upsert to be certain).
  // NOTE: profiles has no gender/date_of_birth/address columns — only the
  // columns below are written.
  await ctx.supabase.from("profiles").upsert(
    {
      id: userId,
      first_name: given || null,
      last_name: family || null,
      email,
      phone: phone || null,
      role: "patient",
    },
    { onConflict: "id" }
  );
  // Ensure patient role in user_roles (source of truth)
  await ctx.supabase.from("user_roles").upsert({ user_id: userId, role: "patient" }, { onConflict: "user_id,role" });

  const { data: profile } = await ctx.supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  const patient = mapPatient(profile || { id: userId, first_name: given, last_name: family, email });
  return json(patient, 201, { Location: `${ctx.baseUrl}/Patient/${userId}` });
}

// — Observation —

async function readObservation(ctx: Ctx, id: string) {
  // id forms: "<uuid>-<vitalKey>" (vitals) or "lab-<uuid>" (lab results)
  const lab = id.match(/^lab-([0-9a-f-]{36})$/i);
  const vs = id.match(/^([0-9a-f-]{36})-(heart_rate|temperature|oxygen_saturation|blood_pressure)$/i);

  if (lab) {
    const { data, error } = await ctx.supabase.from("lab_results").select("*").eq("id", lab[1]).maybeSingle();
    if (error || !data) return fhirError(404, "not-found", "Observation not found.");
    if (!(await canAccessPatient(ctx.supabase, ctx.caller, data.patient_id))) {
      return fhirError(404, "not-found", "Observation not found.");
    }
    return json(mapLabResultObservation(data));
  }
  if (vs) {
    const { data, error } = await ctx.supabase.from("vital_signs").select("*").eq("id", vs[1]).maybeSingle();
    if (error || !data) return fhirError(404, "not-found", "Observation not found.");
    if (!(await canAccessPatient(ctx.supabase, ctx.caller, data.user_id))) {
      return fhirError(404, "not-found", "Observation not found.");
    }
    const mapped = mapVitalSignsRow(data).filter(
      (o) => (o as Record<string, unknown>).id === id
    );
    if (mapped.length === 0) return fhirError(404, "not-found", "Observation not found.");
    return json(mapped[0]);
  }
  return fhirError(400, "invalid", "Invalid Observation id.");
}

async function searchObservation(ctx: Ctx) {
  const scope = await scopedPatientId(ctx);
  if (scope instanceof Response) return scope;

  const out: unknown[] = [];
  let total = 0;
  const count = getCount(ctx.params);
  const code = ctx.params.get("code");
  const category = ctx.params.get("category");
  const wantVitals = !category || category === "vital-signs";
  const wantLabs = !category || category === "laboratory";

  // vitals
  if (wantVitals) {
    let q = ctx.supabase.from("vital_signs").select("*", { count: "exact" }).order("recorded_at", { ascending: false });
    if (scope === "all") {
      /* no filter */
    } else if (Array.isArray(scope)) {
      q = scope.length === 0
        ? q.eq("user_id", "00000000-0000-0000-0000-000000000000")
        : q.in("user_id", scope);
    } else {
      q = q.eq("user_id", scope);
    }
    q = applyDateFilter(q, "recorded_at", ctx.params.get("date"));
    const { data, error, count: c } = await q.limit(200);
    if (!error && data) {
      for (const row of data) {
        for (const o of mapVitalSignsRow(row)) {
          if (code) {
            const codings = (((o as Record<string, unknown>).code as Record<string, unknown>).coding as Array<Record<string, string>>) || [];
            if (!codings.some((cd) => cd.code === code)) continue;
          }
          out.push(o);
        }
      }
      total += c ?? 0;
    }
  }

  // lab results
  if (wantLabs && out.length < count) {
    let q = ctx.supabase.from("lab_results").select("*", { count: "exact" }).order("test_date", { ascending: false });
    if (scope === "all") { /* no filter */ }
    else if (Array.isArray(scope)) {
      q = scope.length === 0 ? q.eq("patient_id", "00000000-0000-0000-0000-000000000000") : q.in("patient_id", scope);
    } else q = q.eq("patient_id", scope);
    q = applyDateFilter(q, "test_date", ctx.params.get("date"));
    if (code) q = q.ilike("test_name", `%${code}%`);
    const { data, error, count: c } = await q.limit(200);
    if (!error && data) {
      for (const r of data) out.push(mapLabResultObservation(r));
      total += c ?? 0;
    }
  }

  return json(searchBundle(out.slice(0, count), total, ctx.baseUrl, "Observation"));
}

async function createObservation(ctx: Ctx, body: Record<string, unknown>) {
  let vitals: Record<string, unknown>;
  try {
    vitals = observationToVitals(body);
  } catch (e) {
    return fhirError(422, "processing", (e as Error).message);
  }
  const subject = patientRefToId(
    ((body.subject as Record<string, string> | undefined)?.reference) || null
  );
  const targetId = subject || ctx.caller.id;
  if (!(await canAccessPatient(ctx.supabase, ctx.caller, targetId))) {
    return fhirError(403, "security", "Cannot record observations for this patient.");
  }
  if ((ctx.caller.isPatientOnly || scopeIsPatientOnly(ctx.caller)) && targetId !== ctx.caller.id) {
    return fhirError(403, "security", "Patients may only record their own observations.");
  }

  const { data, error } = await ctx.supabase
    .from("vital_signs")
    .insert({ user_id: targetId, ...vitals })
    .select("*")
    .single();
  if (error || !data) return fhirError(422, "processing", `Observation not stored: ${error?.message || "unknown"}`);

  const mapped = mapVitalSignsRow(data);
  const created = mapped[0];
  return json(created, 201, {
    Location: `${ctx.baseUrl}/Observation/${(created as Record<string, unknown>).id}`,
  });
}

// — Condition —

async function readCondition(ctx: Ctx, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fhirError(400, "invalid", "Invalid Condition id.");
  const { data, error } = await ctx.supabase
    .from("comprehensive_medical_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return fhirError(404, "not-found", "Condition not found.");
  if (!(await canAccessPatient(ctx.supabase, ctx.caller, data.patient_id))) {
    return fhirError(404, "not-found", "Condition not found.");
  }
  return json(mapCondition(data));
}

async function searchCondition(ctx: Ctx) {
  const scope = await scopedPatientId(ctx);
  if (scope instanceof Response) return scope;

  let q = ctx.supabase
    .from("comprehensive_medical_records")
    .select("*", { count: "exact" })
    .in("record_type", ["diagnosis", "condition", "chronic_condition"])
    .order("visit_date", { ascending: false });
  if (scope === "all") { /* none */ }
  else if (Array.isArray(scope)) {
    q = scope.length === 0 ? q.eq("patient_id", "00000000-0000-0000-0000-000000000000") : q.in("patient_id", scope);
  } else q = q.eq("patient_id", scope);

  const clinicalStatus = ctx.params.get("clinical-status");
  if (clinicalStatus) {
    q = q.eq("status", clinicalStatus === "resolved" ? "resolved" : clinicalStatus === "inactive" ? "inactive" : "active");
  }
  const code = ctx.params.get("code");
  if (code) q = q.ilike("title", `%${code}%`);

  const count = getCount(ctx.params);
  const { data, error, count: total } = await q.limit(count);
  if (error) return fhirError(500, "processing", "Condition search failed.");
  return json(searchBundle((data || []).map(mapCondition), total ?? 0, ctx.baseUrl, "Condition"));
}

async function createCondition(ctx: Ctx, body: Record<string, unknown>) {
  if (ctx.caller.isPatientOnly || scopeIsPatientOnly(ctx.caller)) {
    return fhirError(403, "security", "Only providers may record conditions.");
  }
  const subject = patientRefToId(((body.subject as Record<string, string> | undefined)?.reference) || null);
  if (!subject) return fhirError(422, "required", "Condition.subject (Patient reference) is required.");
  if (!(await canAccessPatient(ctx.supabase, ctx.caller, subject))) {
    return fhirError(403, "security", "No care relationship with this patient.");
  }
  const title = (body.code as Record<string, unknown> | undefined)?.text as string | undefined;
  if (!title) return fhirError(422, "required", "Condition.code.text is required.");
  const clinical = (((body.clinicalStatus as Record<string, unknown> | undefined)?.coding as Array<Record<string, string>>) || [])[0]?.code;
  const status = clinical === "resolved" ? "resolved" : clinical === "inactive" ? "inactive" : "active";

  const { data, error } = await ctx.supabase
    .from("comprehensive_medical_records")
    .insert({
      patient_id: subject,
      provider_id: ctx.caller.id,
      record_type: "diagnosis",
      title,
      description: ((body.note as Array<Record<string, string>>) || [])[0]?.text || null,
      visit_date: (body.recordedDate as string) || new Date().toISOString().slice(0, 10),
      status,
    })
    .select("*")
    .single();
  if (error || !data) return fhirError(422, "processing", `Condition not stored: ${error?.message || "unknown"}`);
  const created = mapCondition(data);
  return json(created, 201, { Location: `${ctx.baseUrl}/Condition/${data.id}` });
}

// — MedicationRequest —

async function readMedicationRequest(ctx: Ctx, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fhirError(400, "invalid", "Invalid MedicationRequest id.");
  const { data, error } = await ctx.supabase.from("comprehensive_prescriptions").select("*").eq("id", id).maybeSingle();
  if (error || !data) return fhirError(404, "not-found", "MedicationRequest not found.");
  if (!(await canAccessPatient(ctx.supabase, ctx.caller, data.patient_id))) {
    return fhirError(404, "not-found", "MedicationRequest not found.");
  }
  return json(mapMedicationRequest(data));
}

async function searchMedicationRequest(ctx: Ctx) {
  const scope = await scopedPatientId(ctx);
  if (scope instanceof Response) return scope;

  let q = ctx.supabase.from("comprehensive_prescriptions").select("*", { count: "exact" }).order("prescribed_date", { ascending: false });
  if (scope === "all") { /* none */ }
  else if (Array.isArray(scope)) {
    q = scope.length === 0 ? q.eq("patient_id", "00000000-0000-0000-0000-000000000000") : q.in("patient_id", scope);
  } else q = q.eq("patient_id", scope);

  const status = ctx.params.get("status");
  if (status) {
    const rev: Record<string, string> = { active: "pending", completed: "filled", cancelled: "cancelled", stopped: "expired" };
    if (rev[status]) q = q.eq("status", rev[status]);
  }
  const med = ctx.params.get("medication");
  if (med) q = q.ilike("medication_name", `%${med}%`);

  const count = getCount(ctx.params);
  const { data, error, count: total } = await q.limit(count);
  if (error) return fhirError(500, "processing", "MedicationRequest search failed.");
  return json(searchBundle((data || []).map(mapMedicationRequest), total ?? 0, ctx.baseUrl, "MedicationRequest"));
}

async function createMedicationRequest(ctx: Ctx, body: Record<string, unknown>) {
  if (ctx.caller.isPatientOnly || scopeIsPatientOnly(ctx.caller)) {
    return fhirError(403, "security", "Only providers may order medications.");
  }
  const subject = patientRefToId(((body.subject as Record<string, string> | undefined)?.reference) || null);
  if (!subject) return fhirError(422, "required", "MedicationRequest.subject (Patient reference) is required.");
  if (!(await canAccessPatient(ctx.supabase, ctx.caller, subject))) {
    return fhirError(403, "security", "No care relationship with this patient.");
  }
  const med = (body.medicationCodeableConcept as Record<string, unknown>) || {};
  const medicationName = (med.text as string) || "";
  const dosage = (((body.dosageInstruction as Array<Record<string, unknown>>) || [])[0]?.text as string) || "";
  const quantity = Number(
    (((body.dispenseRequest as Record<string, unknown> | undefined)?.quantity as Record<string, unknown> | undefined)?.value) ?? 1
  );
  if (!medicationName) return fhirError(422, "required", "MedicationRequest.medicationCodeableConcept.text is required.");
  if (!dosage) return fhirError(422, "required", "MedicationRequest.dosageInstruction[0].text is required.");

  const { data, error } = await ctx.supabase
    .from("comprehensive_prescriptions")
    .insert({
      patient_id: subject,
      provider_id: ctx.caller.id,
      medication_name: medicationName,
      dosage,
      quantity: Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1,
      instructions: dosage,
      status: "pending",
    })
    .select("*")
    .single();
  if (error || !data) return fhirError(422, "processing", `MedicationRequest not stored: ${error?.message || "unknown"}`);
  const created = mapMedicationRequest(data);
  return json(created, 201, { Location: `${ctx.baseUrl}/MedicationRequest/${data.id}` });
}

// — Appointment —

async function readAppointment(ctx: Ctx, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fhirError(400, "invalid", "Invalid Appointment id.");
  const { data, error } = await ctx.supabase.from("appointments").select("*").eq("id", id).maybeSingle();
  if (error || !data) return fhirError(404, "not-found", "Appointment not found.");
  const ok =
    data.patient_id === ctx.caller.id ||
    data.provider_id === ctx.caller.id ||
    ctx.caller.isAdmin;
  if (!ok) return fhirError(404, "not-found", "Appointment not found.");
  return json(mapAppointment(data));
}

async function searchAppointment(ctx: Ctx) {
  const scope = await resolvePatientScope(ctx);
  if (scope instanceof Response) return scope;

  let q = ctx.supabase.from("appointments").select("*", { count: "exact" }).order("date", { ascending: false });
  if (scope.mode === "self") {
    q = q.or(`patient_id.eq.${scope.id},provider_id.eq.${scope.id}`);
  } else if (scope.mode === "list") {
    const ids = scope.ids.length ? scope.ids : ["00000000-0000-0000-0000-000000000000"];
    q = q.or(`patient_id.in.(${ids.join(",")}),provider_id.eq.${ctx.caller.id}`);
  }
  const patient = patientRefToId(ctx.params.get("patient"));
  if (patient) q = q.eq("patient_id", patient);
  const practitioner = patientRefToId(ctx.params.get("practitioner"));
  if (practitioner) q = q.eq("provider_id", practitioner);
  const status = ctx.params.get("status");
  if (status) {
    const rev: Record<string, string> = { booked: "scheduled", fulfilled: "completed", cancelled: "cancelled", noshow: "noshow" };
    if (rev[status]) q = q.eq("status", rev[status]);
  }
  q = applyDateFilter(q, "date", ctx.params.get("date"));

  const count = getCount(ctx.params);
  const { data, error, count: total } = await q.limit(count);
  if (error) return fhirError(500, "processing", "Appointment search failed.");
  return json(searchBundle((data || []).map(mapAppointment), total ?? 0, ctx.baseUrl, "Appointment"));
}

async function createAppointment(ctx: Ctx, body: Record<string, unknown>) {
  const start = String(body.start || "");
  const m = start.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?/);
  if (!m) return fhirError(422, "required", "Appointment.start (YYYY-MM-DDTHH:MM) is required.");
  const [, date, time] = m;

  const parts = ((body.participant as Array<Record<string, unknown>>) || [])
    .map((p) => (p.actor as Record<string, string> | undefined)?.reference || "");
  let patientId = ctx.caller.id;
  let providerId: string | null = null;
  for (const ref of parts) {
    const pm = ref.match(/^Patient\/([0-9a-f-]{36})$/i);
    const prm = ref.match(/^Practitioner\/([0-9a-f-]{36})$/i);
    if (pm) patientId = pm[1];
    if (prm) providerId = prm[1];
  }
  if (patientId !== ctx.caller.id && !ctx.caller.isAdmin) {
    return fhirError(403, "security", "Cannot book appointments for other patients.");
  }
  if (!providerId) return fhirError(422, "required", "Appointment.participant must include a Practitioner reference.");

  const type =
    ((body.serviceType as Array<Record<string, string>>) || [])[0]?.text ||
    "general_consultation";

  const { data, error } = await ctx.supabase
    .from("appointments")
    .insert({ patient_id: patientId, provider_id: providerId, date, time, type, status: "scheduled" })
    .select("*")
    .single();
  if (error || !data) return fhirError(422, "processing", `Appointment not stored: ${error?.message || "unknown"}`);
  const created = mapAppointment(data);
  return json(created, 201, { Location: `${ctx.baseUrl}/Appointment/${data.id}` });
}

// — Encounter —

async function readEncounter(ctx: Ctx, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fhirError(400, "invalid", "Invalid Encounter id.");
  const { data, error } = await ctx.supabase.from("hospital_admissions").select("*").eq("id", id).maybeSingle();
  if (error || !data) return fhirError(404, "not-found", "Encounter not found.");
  if (!(await canAccessPatient(ctx.supabase, ctx.caller, data.patient_id))) {
    return fhirError(404, "not-found", "Encounter not found.");
  }
  return json(mapEncounter(data));
}

async function searchEncounter(ctx: Ctx) {
  const scope = await scopedPatientId(ctx);
  if (scope instanceof Response) return scope;

  let q = ctx.supabase.from("hospital_admissions").select("*", { count: "exact" }).order("admission_date", { ascending: false });
  if (scope === "all") { /* none */ }
  else if (Array.isArray(scope)) {
    q = scope.length === 0 ? q.eq("patient_id", "00000000-0000-0000-0000-000000000000") : q.in("patient_id", scope);
  } else q = q.eq("patient_id", scope);

  const status = ctx.params.get("status");
  if (status) {
    const rev: Record<string, string> = { "in-progress": "admitted", finished: "discharged" };
    if (rev[status]) q = q.eq("status", rev[status]);
  }
  q = applyDateFilter(q, "admission_date", ctx.params.get("date"));

  const count = getCount(ctx.params);
  const { data, error, count: total } = await q.limit(count);
  if (error) return fhirError(500, "processing", "Encounter search failed.");
  return json(searchBundle((data || []).map(mapEncounter), total ?? 0, ctx.baseUrl, "Encounter"));
}

// — DiagnosticReport —

async function readDiagnosticReport(ctx: Ctx, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fhirError(400, "invalid", "Invalid DiagnosticReport id.");
  const { data, error } = await ctx.supabase
    .from("lab_requests")
    .select("*, test:lab_tests(name, code, category)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return fhirError(404, "not-found", "DiagnosticReport not found.");
  if (!(await canAccessPatient(ctx.supabase, ctx.caller, data.patient_id))) {
    return fhirError(404, "not-found", "DiagnosticReport not found.");
  }
  const { data: results } = await ctx.supabase.from("lab_results").select("id").eq("request_id", id);
  return json(mapDiagnosticReport(data, (results || []).map((r: { id: string }) => r.id)));
}

async function searchDiagnosticReport(ctx: Ctx) {
  const scope = await scopedPatientId(ctx);
  if (scope instanceof Response) return scope;

  let q = ctx.supabase
    .from("lab_requests")
    .select("*, test:lab_tests(name, code, category)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (scope === "all") { /* none */ }
  else if (Array.isArray(scope)) {
    q = scope.length === 0 ? q.eq("patient_id", "00000000-0000-0000-0000-000000000000") : q.in("patient_id", scope);
  } else q = q.eq("patient_id", scope);

  const status = ctx.params.get("status");
  if (status) {
    const rev: Record<string, string> = { registered: "pending", partial: "in_progress", final: "completed", cancelled: "cancelled" };
    if (rev[status]) q = q.eq("status", rev[status]);
  }
  const code = ctx.params.get("code");
  if (code) q = q.ilike("test.name", `%${code}%`);

  const count = getCount(ctx.params);
  const { data, error, count: total } = await q.limit(count);
  if (error) return fhirError(500, "processing", "DiagnosticReport search failed.");
  const mapped = ((data || []) as Array<Parameters<typeof mapDiagnosticReport>[0]>).map((r) =>
    mapDiagnosticReport(r, [])
  );
  return json(searchBundle(mapped, total ?? 0, ctx.baseUrl, "DiagnosticReport"));
}

// — Immunization —

async function readImmunization(ctx: Ctx, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fhirError(400, "invalid", "Invalid Immunization id.");
  const { data, error } = await ctx.supabase.from("immunizations").select("*").eq("id", id).maybeSingle();
  if (error || !data) return fhirError(404, "not-found", "Immunization not found.");
  if (!(await canAccessPatient(ctx.supabase, ctx.caller, data.patient_id))) {
    return fhirError(404, "not-found", "Immunization not found.");
  }
  return json(mapImmunization(data));
}

async function searchImmunization(ctx: Ctx) {
  const scope = await scopedPatientId(ctx);
  if (scope instanceof Response) return scope;

  let q = ctx.supabase.from("immunizations").select("*", { count: "exact" }).order("scheduled_date", { ascending: false });
  if (scope === "all") { /* none */ }
  else if (Array.isArray(scope)) {
    q = scope.length === 0 ? q.eq("patient_id", "00000000-0000-0000-0000-000000000000") : q.in("patient_id", scope);
  } else q = q.eq("patient_id", scope);

  const status = ctx.params.get("status");
  if (status === "completed") q = q.not("administered_date", "is", null);
  else if (status === "not-done") q = q.is("administered_date", null);
  const vc = ctx.params.get("vaccine-code");
  if (vc) q = q.ilike("vaccine_name", `%${vc}%`);

  const count = getCount(ctx.params);
  const { data, error, count: total } = await q.limit(count);
  if (error) return fhirError(500, "processing", "Immunization search failed.");
  return json(searchBundle((data || []).map(mapImmunization), total ?? 0, ctx.baseUrl, "Immunization"));
}

// ── Router ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const baseUrl = `${url.origin}${url.pathname.split("/fhir")[0]}/fhir/R4`;

    // Strip optional /fhir/R4 prefix -> [Resource, id?]
    let segs = url.pathname.split("/").filter(Boolean);
    if (segs[0]?.toLowerCase() === "fhir") segs = segs.slice(1);
    if (segs[0]?.toLowerCase() === "r4") segs = segs.slice(1);

    // GET /metadata (no auth required — capability discovery)
    if (segs.length === 1 && segs[0] === "metadata" && req.method === "GET") {
      return json(capabilityStatement(baseUrl, `${supabaseUrl}/auth/v1/token`));
    }

    const authed = await authenticate(req, supabase);
    if (authed instanceof Response) return authed;
    const caller = authed;

    const resource = segs[0] as ResourceName | undefined;
    const id = segs[1];
    if (!resource || !RESOURCES.includes(resource)) {
      return fhirError(404, "not-found", `Unknown resource. Supported: ${RESOURCES.join(", ")}.`);
    }
    if (segs.length > 2) return fhirError(400, "invalid", "Invalid path.");

    const ctx: Ctx = { supabase, caller, baseUrl, params: url.searchParams };

    // ── read ──
    if (req.method === "GET" && id) {
      const scopeErr = checkScope(caller, resource, false);
      if (scopeErr) return scopeErr;
      switch (resource) {
        case "Patient": return readPatient(ctx, id);
        case "Observation": return readObservation(ctx, id);
        case "Condition": return readCondition(ctx, id);
        case "MedicationRequest": return readMedicationRequest(ctx, id);
        case "Appointment": return readAppointment(ctx, id);
        case "Encounter": return readEncounter(ctx, id);
        case "DiagnosticReport": return readDiagnosticReport(ctx, id);
        case "Immunization": return readImmunization(ctx, id);
      }
    }

    // ── search ──
    if (req.method === "GET" && !id) {
      const scopeErr = checkScope(caller, resource, false);
      if (scopeErr) return scopeErr;
      switch (resource) {
        case "Patient": return searchPatient(ctx);
        case "Observation": return searchObservation(ctx);
        case "Condition": return searchCondition(ctx);
        case "MedicationRequest": return searchMedicationRequest(ctx);
        case "Appointment": return searchAppointment(ctx);
        case "Encounter": return searchEncounter(ctx);
        case "DiagnosticReport": return searchDiagnosticReport(ctx);
        case "Immunization": return searchImmunization(ctx);
      }
    }

    // ── create ──
    if (req.method === "POST" && !id) {
      const scopeErr = checkScope(caller, resource, true);
      if (scopeErr) return scopeErr;
      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return fhirError(400, "invalid", "Request body must be JSON.");
      }
      if (!body || body.resourceType !== resource) {
        return fhirError(400, "invalid", `Body resourceType must be "${resource}".`);
      }
      switch (resource) {
        case "Patient": return createPatient(ctx, body);
        case "Observation": return createObservation(ctx, body);
        case "Condition": return createCondition(ctx, body);
        case "MedicationRequest": return createMedicationRequest(ctx, body);
        case "Appointment": return createAppointment(ctx, body);
        default:
          return fhirError(
            405,
            "not-supported",
            `${resource} is read-only in this API (system-generated from clinical workflows).`
          );
      }
    }

    return fhirError(405, "not-supported", `Method ${req.method} not supported here.`);
  } catch (e) {
    console.error("fhir-api error:", e);
    return fhirError(500, "exception", "Internal server error.");
  }
});
