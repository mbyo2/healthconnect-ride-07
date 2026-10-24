// P2-23: shared per-user rate limiting for the AI edge functions.
//
// Every AI function authenticates its caller first; immediately after
// auth it calls aiRateLimitResponse() with the verified user id. The
// counter lives in Postgres (public.ai_rate_limit_events) behind the
// SECURITY DEFINER RPC public.ai_rate_limit_hit — service_role only —
// so limits hold across isolates/instances, unlike in-isolate memory.
//
// Failure mode: if the limiter itself errors (RPC unreachable), the
// request is allowed through and the error is logged. The limiter is
// budget protection, not an auth gate; taking clinical AI tools down
// because the counter hiccuped would be the worse failure. A 429 is
// only ever returned on a definitive "limit reached" answer.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// deno-lint-ignore no-explicit-any
let adminClient: any = null;

// deno-lint-ignore no-explicit-any
function getAdminClient(): any {
  if (!adminClient) {
    adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
  }
  return adminClient;
}

/**
 * Returns a 429 Response when the user is over their per-minute limit
 * for this function, or null when the request may proceed.
 */
export async function aiRateLimitResponse(
  userId: string,
  functionName: string,
  limitPerMinute: number,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  try {
    const { data, error } = await getAdminClient().rpc("ai_rate_limit_hit", {
      p_user_id: userId,
      p_function_name: functionName,
      p_limit: limitPerMinute,
      p_window_seconds: 60,
    });
    if (error) {
      console.error(`[rate-limit] ${functionName}: limiter error, allowing request:`, error.message);
      return null;
    }
    if (data === false) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please wait a moment before trying again.",
          retry_after_seconds: 60,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
        },
      );
    }
    return null;
  } catch (err) {
    console.error(`[rate-limit] ${functionName}: limiter threw, allowing request:`, err);
    return null;
  }
}
