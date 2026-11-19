import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Server-side FX refresh for Doc'O Clock. Rates that affect money are
// read from the public.exchange_rates table this function maintains —
// never from a client fetch or a hard-coded constant. Invoked every
// 10 minutes by pg_cron via pg_net (see migration
// 20261119_exchange_rates.sql); the caller must present the service
// role key as bearer, which is verified below before any work happens.
//
// Free exchange-rate APIs (no key required), same provider family as
// BMaGlass Pay: exchangerate-api v4 primary, open.er-api v6 fallback.
// Both return a USD-base `rates` map, so one parser feeds the pair
// builder either way; `source` records which endpoint actually answered.
const PRIMARY_API = 'https://api.exchangerate-api.com/v4/latest'
const FALLBACK_API = 'https://open.er-api.com/v6/latest'
const FETCH_TIMEOUT_MS = 10_000

// The platform's currency set — mirrors the rates map in
// src/services/exchangeRates.ts (ZMW canonical). Every ZMW pair is
// stored in both directions, derived from the single USD-base feed so
// the two directions can never disagree.
const CURRENCIES = [
  'ZMW', 'USD', 'EUR', 'GBP', 'ZAR', 'KES', 'NGN', 'GHS', 'TZS', 'UGX',
  'RWF', 'BWP', 'MWK', 'MZN', 'CDF', 'INR', 'CNY', 'JPY', 'AUD', 'CAD',
  'AED',
]

interface RateFetchResult {
  rates: Record<string, number>
  source: string
}

async function fetchRatesFrom(url: string, source: string, validate: (data: any) => boolean): Promise<RateFetchResult> {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`${source} responded with HTTP ${response.status}`)

  const data = await response.json()
  if (!validate(data) || !data?.rates || typeof data.rates !== 'object') {
    throw new Error(`${source} returned an unexpected payload shape`)
  }
  return { rates: data.rates, source }
}

async function fetchUsdRates(): Promise<RateFetchResult> {
  try {
    // v4 payload: { base: 'USD', rates: { USD: 1, ... } }
    return await fetchRatesFrom(`${PRIMARY_API}/USD`, 'exchangerate-api', (d) => !d?.base || d.base === 'USD')
  } catch (primaryError: any) {
    console.error(`Primary rate source failed (${primaryError?.message ?? primaryError}); trying fallback`)
    // v6 payload: { result: 'success', base_code: 'USD', rates: { USD: 1, ... } }
    return await fetchRatesFrom(`${FALLBACK_API}/USD`, 'open-er-api', (d) => d?.result === 'success' && d?.base_code === 'USD')
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only the platform itself may trigger a refresh: the pg_cron bridge
  // (and manual admin runs) present the service-role key as bearer.
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('fetch-exchange-rates: handler start')

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceRoleKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { rates, source } = await fetchUsdRates()
    const usdZmw = rates['ZMW']
    if (!(usdZmw > 0)) throw new Error('Feed returned no usable USD/ZMW rate')
    console.log(`fetch-exchange-rates: source '${source}' responded; USD/ZMW = ${usdZmw}`)

    const now = new Date()
    const validFrom = now.toISOString()
    const validUntil = new Date(now.getTime() + 3600000).toISOString() // 1 hour validity

    const rows: Array<{ from_currency: string; to_currency: string; rate: number; source: string; valid_from: string; valid_until: string }> = []
    for (const code of CURRENCIES) {
      if (code === 'ZMW') continue
      const perUsd = rates[code]
      if (!(perUsd > 0)) continue
      const zmwToForeign = perUsd / usdZmw
      rows.push({ from_currency: 'ZMW', to_currency: code, rate: zmwToForeign, source, valid_from: validFrom, valid_until: validUntil })
      rows.push({ from_currency: code, to_currency: 'ZMW', rate: 1 / zmwToForeign, source, valid_from: validFrom, valid_until: validUntil })
    }
    console.log(`fetch-exchange-rates: built ${rows.length} ZMW pair rows`)

    const { error: insertError } = await supabase.from('exchange_rates').insert(rows)
    if (insertError) throw new Error(`exchange_rates insert failed: ${insertError.message}`)

    // Housekeeping: drop long-expired rows so the table stays small.
    const pruneBefore = new Date(now.getTime() - 24 * 3600000).toISOString()
    const { error: pruneError } = await supabase.from('exchange_rates').delete().lt('valid_until', pruneBefore)
    if (pruneError) console.error(`fetch-exchange-rates: prune failed (non-fatal): ${pruneError.message}`)

    return new Response(JSON.stringify({
      success: true,
      rates_updated: rows.length,
      source,
      usd_zmw: usdZmw,
      valid_from: validFrom,
      valid_until: validUntil,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error('fetch-exchange-rates: failed:', error?.message ?? error)
    return new Response(JSON.stringify({ error: error?.message ?? 'Failed to fetch exchange rates' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
