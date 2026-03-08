import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // 2. Verify caller's identity and admin status
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerId = claimsData.claims.sub;

    // 3. Check caller has admin/superadmin role via secure DB function
    const { data: isAdmin, error: roleError } = await anonClient.rpc('has_role', {
      _user_id: callerId,
      _role: 'admin',
    });

    const { data: isSuperAdmin } = await anonClient.rpc('has_role', {
      _user_id: callerId,
      _role: 'super_admin',
    });

    if (roleError || (!isAdmin && !isSuperAdmin)) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Parse request body
    const { email, password, firstName, lastName, adminLevel } = await req.json();

    if (!email || !password || !firstName || !lastName) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, firstName, lastName' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only superadmins can create other superadmins
    const targetLevel = adminLevel === 'superadmin' ? 'superadmin' : 'admin';
    if (targetLevel === 'superadmin' && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only superadmins can create superadmin accounts' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Use service_role client to create the user (bypasses RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create user via admin API
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'admin',
        admin_level: targetLevel,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Update the profile with admin_level
    if (newUser?.user) {
      await serviceClient.from('profiles').update({
        first_name: firstName,
        last_name: lastName,
        role: 'admin',
        admin_level: targetLevel,
        is_profile_complete: true,
      }).eq('id', newUser.user.id);

      // Ensure admin role is in user_roles
      await serviceClient.from('user_roles').upsert({
        user_id: newUser.user.id,
        role: targetLevel === 'superadmin' ? 'super_admin' : 'admin',
        granted_by: callerId,
      }, { onConflict: 'user_id,role' });
    }

    return new Response(JSON.stringify({
      success: true,
      userId: newUser?.user?.id,
      email,
      adminLevel: targetLevel,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-admin-user:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
