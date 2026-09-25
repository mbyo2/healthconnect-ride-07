import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * DISABLED — 2026-09-25.
 *
 * The test-account factory (which previously embedded hardcoded credentials
 * and could mint privileged accounts) is permanently disabled. It must never
 * run against production. This stub returns 403 for every invocation so that
 * even a stale deployment cannot create accounts.
 *
 * Test/QA accounts are created manually through the Supabase dashboard or the
 * normal signup flow and deleted afterwards.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Test account provisioning is disabled. Create QA accounts manually and delete them after testing.',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
  );
})
