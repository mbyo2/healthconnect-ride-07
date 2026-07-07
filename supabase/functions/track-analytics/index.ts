import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsEvent {
  event: string;
  path?: string;
  props?: Record<string, string | number | boolean>;
  timestamp: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Best-effort auth: identify user if a JWT is present, but allow anon events
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const anon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data } = await anon.auth.getUser();
        userId = data.user?.id ?? null;
      } catch { /* ignore */ }
    }

    const body = await req.json().catch(() => ({}));
    const events = Array.isArray(body?.events) ? (body.events as AnalyticsEvent[]) : [];
    if (events.length === 0) {
      return new Response(JSON.stringify({ ok: true, accepted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cap batch size to prevent abuse
    const capped = events.slice(0, 100);

    const MAX_PROPS_KEYS = 20;
    const MAX_PROPS_STRING = 500;
    const MAX_PROPS_JSON_BYTES = 4096;

    const sanitizeProps = (raw: unknown): Record<string, string | number | boolean> | null => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      const out: Record<string, string | number | boolean> = {};
      let keys = 0;
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (keys >= MAX_PROPS_KEYS) break;
        const key = String(k).slice(0, 80);
        if (typeof v === 'string') {
          out[key] = v.slice(0, MAX_PROPS_STRING);
        } else if (typeof v === 'number' && Number.isFinite(v)) {
          out[key] = v;
        } else if (typeof v === 'boolean') {
          out[key] = v;
        } else {
          continue; // drop nested/complex values
        }
        keys++;
      }
      if (keys === 0) return null;
      // Final serialized-size cap
      try {
        if (JSON.stringify(out).length > MAX_PROPS_JSON_BYTES) return null;
      } catch {
        return null;
      }
      return out;
    };

    const rows = capped.map((e) => ({
      user_id: userId,
      event_name: String(e.event || 'unknown').slice(0, 120),
      path: e.path ? String(e.path).slice(0, 500) : null,
      props: sanitizeProps(e.props),
      occurred_at: e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
    }));

    const { error } = await supabase.from('analytics_events').insert(rows);
    if (error) {
      // Table may not exist yet — return ok so client doesn't retry-loop
      console.warn('analytics_events insert failed:', error.message);
      return new Response(JSON.stringify({ ok: true, accepted: 0, note: 'table-missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, accepted: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('track-analytics error:', e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'error' }), {
      status: 200, // never fail the client
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
