import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  isTwoFactorVerifiedThisSession,
  markTwoFactorVerifiedThisSession,
  verifyTwoFactor,
} from '@/utils/two-factor-service';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Enforces per-session TOTP verification for accounts that have 2FA enabled.
 * Mounted below AuthProvider and above the router. Blocks all authenticated
 * routes until a valid code is presented for the current Supabase session.
 */
export function TwoFactorGate({ children }: { children: React.ReactNode }) {
  const { user, session, signOut } = useAuth();
  const [status, setStatus] = useState<'loading' | 'ok' | 'required'>('loading');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || !session) { setStatus('ok'); return; }
      // If already verified for this session token, allow through.
      if (isTwoFactorVerifiedThisSession(session.access_token)) {
        setStatus('ok'); return;
      }
      const { data } = await supabase
        .from('user_two_factor')
        .select('enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if ((data as any)?.enabled) setStatus('required');
      else setStatus('ok');
    })();
    return () => { cancelled = true; };
  }, [user?.id, session?.access_token]);

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'ok') return <>{children}</>;

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const ok = await verifyTwoFactor(user!.id, code.trim());
      if (!ok) { setErr('Invalid code'); return; }
      markTwoFactorVerifiedThisSession(session?.access_token || null);
      setStatus('ok');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full space-y-4 border border-border rounded-lg p-6 bg-card">
        <h1 className="text-xl font-semibold">Two-factor verification</h1>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app, or a backup code.
        </p>
        <Input
          inputMode="numeric"
          autoFocus
          maxLength={20}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
        />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button className="w-full" disabled={busy || code.length < 6} onClick={submit}>
          {busy ? 'Verifying…' : 'Verify'}
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
