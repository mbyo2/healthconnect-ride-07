-- Enable pgcrypto for password hashing if not already enabled
create extension if not exists "pgcrypto";

-- Block to create or update the superuser
do $$
declare
  v_email text := 'admin@doc-o-clock.internal';
  v_password text := 'Technology22??//';
  v_user_id uuid;
  v_encrypted_pw text;
begin
  -- Check if user exists
  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is not null then
    -- Update existing user password and confirm email
    update auth.users
    set encrypted_password = crypt(v_password, gen_salt('bf')),
        email_confirmed_at = now(),
        raw_user_meta_data = raw_user_meta_data || '{"role":"admin","admin_level":"superadmin","first_name":"System","last_name":"SuperAdmin"}'::jsonb
    where id = v_user_id;
    
    -- Ensure profile exists and is updated
    insert into public.profiles (id, first_name, last_name, email, role, admin_level, is_profile_complete)
    values (v_user_id, 'System', 'SuperAdmin', v_email, 'admin', 'superadmin', true)
    on conflict (id) do update
    set role = 'admin',
        admin_level = 'superadmin',
        is_profile_complete = true,
        first_name = 'System',
        last_name = 'SuperAdmin';
        
    raise notice 'Updated existing superuser %', v_email;
        
  else
    -- Create new user
    v_user_id := gen_random_uuid();
    v_encrypted_pw := crypt(v_password, gen_salt('bf'));

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted_pw,
      now(),
      null,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"first_name":"System","last_name":"SuperAdmin","role":"admin","admin_level":"superadmin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into public.profiles (
      id,
      first_name,
      last_name,
      email,
      role,
      admin_level,
      is_profile_complete,
      created_at,
      updated_at
    ) values (
      v_user_id,
      'System',
      'SuperAdmin',
      v_email,
      'admin',
      'superadmin',
      true,
      now(),
      now()
    )
    on conflict (id) do update
    set role = 'admin',
        admin_level = 'superadmin',
        is_profile_complete = true,
        first_name = 'System',
        last_name = 'SuperAdmin';
    
    raise notice 'Created new superuser %', v_email;
  end if;
end $$;
