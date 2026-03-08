import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Lock, AlertTriangle, Clock, Eye, Save, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  hospital?: any;
}

export const SecurityManagement = ({ hospital }: Props) => {
  const queryClient = useQueryClient();

  const [policy, setPolicy] = useState({
    expiry_days: 90,
    min_length: 8,
    require_uppercase: true,
    require_numbers: true,
    require_special_chars: true,
    max_failed_attempts: 5,
    lockout_duration_minutes: 30,
  });

  const { data: loginLogs = [] } = useQuery({
    queryKey: ['login-security-log'],
    queryFn: async () => {
      const { data } = await supabase
        .from('login_security_log' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return (data as any[]) || [];
    },
  });

  const { data: existingPolicy } = useQuery({
    queryKey: ['password-policy', hospital?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('password_policies' as any)
        .select('*')
        .eq('hospital_id', hospital?.id)
        .maybeSingle();
      if (data) setPolicy(data as any);
      return data;
    },
    enabled: !!hospital?.id,
  });

  const savePolicy = async () => {
    const payload = { ...policy, hospital_id: hospital?.id };
    if (existingPolicy) {
      await supabase.from('password_policies' as any).update(payload).eq('id', (existingPolicy as any).id);
    } else {
      await supabase.from('password_policies' as any).insert(payload);
    }
    toast.success('Security policy saved');
    queryClient.invalidateQueries({ queryKey: ['password-policy'] });
  };

  const failedAttempts = loginLogs.filter((l: any) => l.event_type === 'failed_login');
  const lockedAccounts = loginLogs.filter((l: any) => l.event_type === 'account_locked');

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> Security & Access Control
        </h3>
        <p className="text-sm text-muted-foreground">Password policies, login monitoring & account security</p>
      </div>

      <Tabs defaultValue="policy">
        <TabsList>
          <TabsTrigger value="policy" className="text-xs">Password Policy</TabsTrigger>
          <TabsTrigger value="log" className="text-xs">
            Security Log
            {failedAttempts.length > 0 && <Badge variant="destructive" className="ml-1 text-[8px]">{failedAttempts.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policy" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><KeyRound className="h-4 w-4" /> Password Expiry & Strength</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Password Expiry (days)</Label>
                  <Select value={String(policy.expiry_days)} onValueChange={v => setPolicy(p => ({ ...p, expiry_days: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">365 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Min Password Length</Label>
                  <Input type="number" value={policy.min_length} onChange={e => setPolicy(p => ({ ...p, min_length: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Max Failed Attempts</Label>
                  <Input type="number" value={policy.max_failed_attempts} onChange={e => setPolicy(p => ({ ...p, max_failed_attempts: Number(e.target.value) }))} />
                </div>
                <div><Label className="text-xs">Lockout Duration (min)</Label>
                  <Input type="number" value={policy.lockout_duration_minutes} onChange={e => setPolicy(p => ({ ...p, lockout_duration_minutes: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Require Uppercase</Label>
                  <Switch checked={policy.require_uppercase} onCheckedChange={v => setPolicy(p => ({ ...p, require_uppercase: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Require Numbers</Label>
                  <Switch checked={policy.require_numbers} onCheckedChange={v => setPolicy(p => ({ ...p, require_numbers: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Require Special Characters</Label>
                  <Switch checked={policy.require_special_chars} onCheckedChange={v => setPolicy(p => ({ ...p, require_special_chars: v }))} />
                </div>
              </div>
              <Button onClick={savePolicy} className="w-full gap-2"><Save className="h-4 w-4" /> Save Policy</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Card><CardContent className="pt-4 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
              <p className="text-2xl font-bold text-foreground">{failedAttempts.length}</p>
              <p className="text-xs text-muted-foreground">Failed Logins</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <Lock className="h-5 w-5 mx-auto text-destructive mb-1" />
              <p className="text-2xl font-bold text-foreground">{lockedAccounts.length}</p>
              <p className="text-xs text-muted-foreground">Account Locks</p>
            </CardContent></Card>
          </div>

          {loginLogs.map((log: any) => (
            <Card key={log.id} className={log.event_type === 'account_locked' ? 'border-destructive/40' : ''}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {log.event_type === 'account_locked' ? <Lock className="h-4 w-4 text-destructive" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    <div>
                      <p className="text-xs font-medium text-foreground">{log.email}</p>
                      <p className="text-[10px] text-muted-foreground">{log.description}</p>
                      <p className="text-[10px] text-muted-foreground">
                        IP: {log.ip_address || 'Unknown'} • {log.browser || 'Unknown browser'} • {log.platform || 'Unknown OS'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={log.event_type === 'account_locked' ? 'destructive' : 'secondary'} className="text-[8px]">
                      {log.event_type.replace('_', ' ')}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {loginLogs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No security events</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
};
