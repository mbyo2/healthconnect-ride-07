import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CSP violation report collector (P3-22 follow-up).
//
// Browsers deliver Content-Security-Policy violation reports to this
// endpoint unauthenticated (verify_jwt = false in supabase/config.toml):
//   - modern Reporting API: POST application/reports+json — a JSON array
//     of { type: "csp-violation", url, body: { documentURL,
//     effectiveDirective, blockedURL, sourceFile, lineNumber,
//     disposition, ... } }
//   - legacy report-uri: POST application/csp-report —
//     { "csp-report": { "document-uri": ..., "violated-directive": ...,
//     "effective-directive": ..., "blocked-uri": ..., "source-file": ...,
//     "line-number": ..., "disposition": ... } }
//
// Each report is stored in public.csp_reports (service-role write; the
// table has RLS on and no anon/authenticated policies, so the evidence
// is readable via SQL only). Abuse caps: bodies over 64 KB get 413,
// non-JSON bodies get 400, per-field strings are truncated. Successful
// (or well-formed-but-empty) deliveries answer 204 with no body, as
// reporting endpoints are expected to.

const MAX_BODY_BYTES = 65536;
const MAX_FIELD_CHARS = 2048;

const trunc = (v: unknown): string | null => {
  if (typeof v !== 'string' || v.length === 0) return null;
  return v.slice(0, MAX_FIELD_CHARS);
};

const toLineNumber = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isInteger(n) && n >= 0 ? n : null;
};

interface ParsedReport {
  document_uri: string | null;
  violated_directive: string | null;
  effective_directive: string | null;
  blocked_uri: string | null;
  source_file: string | null;
  line_number: number | null;
  disposition: string | null;
  raw: Record<string, unknown>;
}

// Modern Reporting API body uses camelCase keys.
const fromModernBody = (body: Record<string, unknown>): ParsedReport => ({
  document_uri: trunc(body.documentURL),
  violated_directive: trunc(body.violatedDirective) ?? trunc(body.effectiveDirective),
  effective_directive: trunc(body.effectiveDirective),
  blocked_uri: trunc(body.blockedURL),
  source_file: trunc(body.sourceFile),
  line_number: toLineNumber(body.lineNumber),
  disposition: trunc(body.disposition),
  raw: body,
});

// Legacy report-uri body uses kebab-case keys.
const fromLegacyBody = (body: Record<string, unknown>): ParsedReport => ({
  document_uri: trunc(body['document-uri']),
  violated_directive: trunc(body['violated-directive']),
  effective_directive: trunc(body['effective-directive']) ?? trunc(body['violated-directive']),
  blocked_uri: trunc(body['blocked-uri']),
  source_file: trunc(body['source-file']),
  line_number: toLineNumber(body['line-number']),
  disposition: trunc(body.disposition),
  raw: body,
});

const extractReports = (payload: unknown): ParsedReport[] => {
  const out: ParsedReport[] = [];
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as Record<string, unknown>;
      const body = entry.body;
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        out.push(fromModernBody(body as Record<string, unknown>));
      }
    }
    return out;
  }
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    const legacy = obj['csp-report'];
    if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
      out.push(fromLegacyBody(legacy as Record<string, unknown>));
      return out;
    }
    // Tolerate a single modern report object (not wrapped in an array).
    const body = obj.body;
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      out.push(fromModernBody(body as Record<string, unknown>));
    }
  }
  return out;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return new Response(null, { status: 405 });

  const declared = Number(req.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 });
  }

  const text = await req.text().catch(() => '');
  if (text.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }

  const reports = extractReports(payload);
  if (reports.length === 0) return new Response(null, { status: 204 });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const userAgent = trunc(req.headers.get('user-agent'));
    const rows = reports.map((r) => ({ ...r, user_agent: userAgent }));
    const { error } = await supabase.from('csp_reports').insert(rows);
    if (error) {
      console.error('csp-report insert failed:', error.message);
      return new Response(null, { status: 500 });
    }
  } catch (e) {
    console.error('csp-report failed:', e);
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 204 });
});
