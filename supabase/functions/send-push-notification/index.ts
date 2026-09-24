// Push notification service using Web Push Protocol
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Configure VAPID keys (these should be set in Supabase environment variables)
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@dococlock.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Validate the caller's JWT — a present-but-invalid Bearer token must
    // NOT authorize pushes to arbitrary users/roles.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { data: callerRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);
    const isAdmin = (callerRoles ?? []).some((r: any) =>
      ['admin', 'superadmin', 'super_admin', 'institution_admin'].includes(String(r.role).toLowerCase())
    );

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return json({ success: false, error: 'Push delivery not configured (VAPID keys missing)' }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    if (action === 'send_to_user') {
      const { userId, payload } = body;
      if (!userId || !payload) {
        return json({ error: 'userId and payload required' }, 400);
      }
      // Self or admin only — staff-to-patient pushes go through send-push,
      // which enforces the care-relationship + audit trail.
      if (userId !== caller.id && !isAdmin) {
        return json({ error: 'Forbidden: you may only push to yourself' }, 403);
      }

      const { data: subscriptions } = await admin
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', userId);

      if (!subscriptions || subscriptions.length === 0) {
        return json({ success: true, message: 'No subscriptions found' });
      }

      const results = await Promise.allSettled(
        subscriptions.map((sub: any) =>
          webpush.sendNotification(sub.subscription, JSON.stringify(payload))
        )
      );

      const failed = results.filter(r => r.status === 'rejected').length;
      return json({ success: true, sent: results.length, failed });
    }

    if (action === 'send_to_users') {
      const { userIds, payload } = body;
      if (!userIds || !Array.isArray(userIds) || !payload) {
        return json({ error: 'userIds array and payload required' }, 400);
      }
      if (!isAdmin) {
        return json({ error: 'Forbidden: bulk push is admin-only' }, 403);
      }

      const { data: subscriptions } = await admin
        .from('push_subscriptions')
        .select('subscription')
        .in('user_id', userIds);

      if (!subscriptions || subscriptions.length === 0) {
        return json({ success: true, message: 'No subscriptions found' });
      }

      const results = await Promise.allSettled(
        subscriptions.map((sub: any) =>
          webpush.sendNotification(sub.subscription, JSON.stringify(payload))
        )
      );

      const failed = results.filter(r => r.status === 'rejected').length;
      return json({ success: true, sent: results.length, failed });
    }

    if (action === 'send_to_role') {
      const { role, payload } = body;
      if (!role || !payload) {
        return json({ error: 'role and payload required' }, 400);
      }
      if (!isAdmin) {
        return json({ error: 'Forbidden: role push is admin-only' }, 403);
      }

      const { data: userRoles } = await admin
        .from('user_roles')
        .select('user_id')
        .eq('role', role);

      if (!userRoles || userRoles.length === 0) {
        return json({ success: true, message: 'No users with this role' });
      }

      const userIds = userRoles.map((ur: any) => ur.user_id);

      const { data: subscriptions } = await admin
        .from('push_subscriptions')
        .select('subscription')
        .in('user_id', userIds);

      if (!subscriptions || subscriptions.length === 0) {
        return json({ success: true, message: 'No subscriptions found' });
      }

      const results = await Promise.allSettled(
        subscriptions.map((sub: any) =>
          webpush.sendNotification(sub.subscription, JSON.stringify(payload))
        )
      );

      const failed = results.filter(r => r.status === 'rejected').length;
      return json({ success: true, sent: results.length, failed });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('send-push-notification error:', error);
    return json({ error: 'An internal error occurred' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
