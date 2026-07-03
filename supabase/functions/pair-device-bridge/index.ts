// Returns the HMAC bridge token for the caller's institution. Only users with
// institution_admin / super_admin / admin roles for that institution can fetch it.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BRIDGE_SECRET = Deno.env.get('DEVICE_BRIDGE_SECRET') ?? ''

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    if (!BRIDGE_SECRET) {
      return new Response(JSON.stringify({ error: 'Bridge not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error } = await supabase.auth.getClaims(token)
    if (error || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId = claims.claims.sub as string

    const body = (await req.json().catch(() => ({}))) as { institution_id?: string }
    const institutionId = body.institution_id
    if (!institutionId || !/^[0-9a-f-]{36}$/i.test(institutionId)) {
      return new Response(JSON.stringify({ error: 'institution_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Authorize: super_admin/admin OR institution admin of this institution
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: roles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
    const isPlatformAdmin = roles?.some((r) => r.role === 'super_admin' || r.role === 'admin')
    let allowed = !!isPlatformAdmin
    if (!allowed) {
      const { data: staff } = await admin
        .from('institution_staff')
        .select('role_type, is_active')
        .eq('user_id', userId)
        .eq('institution_id', institutionId)
        .eq('is_active', true)
      allowed = !!staff?.some((s) =>
        ['admin', 'owner', 'institution_admin', 'director'].includes((s.role_type ?? '').toLowerCase()),
      )
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const bridgeToken = await hmac(BRIDGE_SECRET, institutionId)
    return new Response(
      JSON.stringify({
        institution_id: institutionId,
        bridge_token: bridgeToken,
        ingest_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/device-bridge-ingest`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('pair-device-bridge error', e)
    return new Response(JSON.stringify({ error: 'Pair failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
