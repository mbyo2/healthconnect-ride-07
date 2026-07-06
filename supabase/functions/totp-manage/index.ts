// Server-side TOTP (RFC 6238) management. All secret material stays server-side.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ISSUER = 'DocOClock';

// --- base32 (RFC 4648) ---
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
function base32Decode(s: string): Uint8Array {
  const clean = s.replace(/=+$/g, '').replace(/\s/g, '').toUpperCase();
  const out: number[] = [];
  let bits = 0, value = 0;
  for (const c of clean) {
    const i = B32.indexOf(c);
    if (i < 0) throw new Error('bad base32');
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

async function hotp(secret: Uint8Array, counter: number): Promise<string> {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  // counter is < 2^53
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);
  const key = await crypto.subtle.importKey(
    'raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
  const offset = sig[sig.length - 1] & 0x0f;
  const bin =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);
  return (bin % 1_000_000).toString().padStart(6, '0');
}

async function verifyTotp(secretB32: string, token: string): Promise<boolean> {
  if (!/^\d{6}$/.test(token)) return false;
  const secret = base32Decode(secretB32);
  const step = Math.floor(Date.now() / 30_000);
  for (const w of [-1, 0, 1]) {
    if ((await hotp(secret, step + w)) === token) return true;
  }
  return false;
}

function randomBase32(bytes = 20): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base32Encode(buf);
}
function randomBackupCode(): string {
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return hex.match(/.{1,4}/g)!.join('-');
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
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    if (action === 'setup') {
      // If 2FA is already enabled, require a valid TOTP or backup code before
      // overwriting the existing secret. Prevents session-hijack silent reset.
      const { data: status } = await admin
        .from('user_two_factor')
        .select('enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      if (status?.enabled) {
        const code = String(body?.code || '').replace(/\s/g, '');
        const { data: prior } = await admin
          .from('user_two_factor_secrets')
          .select('secret, backup_codes')
          .eq('user_id', user.id)
          .maybeSingle();
        const valid = !!prior && (
          (await verifyTotp(prior.secret, code)) ||
          (Array.isArray(prior.backup_codes) && prior.backup_codes.includes(code))
        );
        if (!valid) return json({ ok: false, error: 'Current 2FA code required to reset' }, 400);
      }

      // Generate secret + backup codes; store server-side; return QR URL
      const secret = randomBase32(20);
      const codes = Array.from({ length: 10 }, () => randomBackupCode());
      const { error } = await admin
        .from('user_two_factor_secrets')
        .upsert({ user_id: user.id, secret, backup_codes: codes, updated_at: new Date().toISOString() });
      if (error) return json({ error: 'Setup failed' }, 500);
      await admin
        .from('user_two_factor')
        .upsert({
          user_id: user.id,
          enabled: false,
          backup_codes_remaining: codes.length,
          setup_at: new Date().toISOString(),
        });
      const label = encodeURIComponent(`${ISSUER}:${user.email ?? user.id}`);
      const qrCodeUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${ISSUER}&algorithm=SHA1&digits=6&period=30`;
      return json({ ok: true, qrCodeUrl, manualEntryKey: secret.match(/.{1,4}/g)!.join(' '), backupCodes: codes });
    }

    if (action === 'enable' || action === 'verify') {
      const code = String(body?.code || '').replace(/\s/g, '');
      const { data: row } = await admin
        .from('user_two_factor_secrets')
        .select('secret, backup_codes')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!row) return json({ ok: false, error: '2FA not set up' }, 400);

      let valid = await verifyTotp(row.secret, code);
      let backupUsed = false;
      if (!valid && Array.isArray(row.backup_codes) && row.backup_codes.includes(code)) {
        valid = true; backupUsed = true;
        const remaining = row.backup_codes.filter((c: string) => c !== code);
        await admin
          .from('user_two_factor_secrets')
          .update({ backup_codes: remaining, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        await admin
          .from('user_two_factor')
          .update({ backup_codes_remaining: remaining.length })
          .eq('user_id', user.id);
      }

      if (!valid) return json({ ok: false, error: 'Invalid code' }, 400);

      if (action === 'enable') {
        await admin
          .from('user_two_factor')
          .update({ enabled: true, enabled_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }
      return json({ ok: true, backupUsed });
    }

    if (action === 'disable') {
      const code = String(body?.code || '').replace(/\s/g, '');
      const { data: row } = await admin
        .from('user_two_factor_secrets')
        .select('secret, backup_codes')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!row) return json({ ok: true });
      const valid = (await verifyTotp(row.secret, code)) ||
        (Array.isArray(row.backup_codes) && row.backup_codes.includes(code));
      if (!valid) return json({ ok: false, error: 'Invalid code' }, 400);
      await admin.from('user_two_factor').update({ enabled: false, disabled_at: new Date().toISOString() }).eq('user_id', user.id);
      await admin.from('user_two_factor_secrets').delete().eq('user_id', user.id);
      return json({ ok: true });
    }

    if (action === 'regenerate') {
      const code = String(body?.code || '').replace(/\s/g, '');
      const { data: existing } = await admin
        .from('user_two_factor_secrets')
        .select('secret, backup_codes')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!existing) return json({ ok: false, error: '2FA not set up' }, 400);
      const valid = (await verifyTotp(existing.secret, code)) ||
        (Array.isArray(existing.backup_codes) && existing.backup_codes.includes(code));
      if (!valid) return json({ ok: false, error: 'Invalid code' }, 400);
      const codes = Array.from({ length: 10 }, () => randomBackupCode());
      const { error } = await admin
        .from('user_two_factor_secrets')
        .update({ backup_codes: codes, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) return json({ error: 'Failed' }, 500);
      await admin.from('user_two_factor').update({ backup_codes_remaining: codes.length }).eq('user_id', user.id);
      return json({ ok: true, backupCodes: codes });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('totp-manage error:', e);
    return json({ error: 'An internal error occurred' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
