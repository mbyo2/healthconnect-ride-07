import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Trash2, AlertTriangle, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import { useUserRoles } from '@/context/UserRolesContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Accounts that can NEVER be deleted — enforced in UI, Edge Function, and RPC.
const PROTECTED_EMAILS = ['mbyo2@gmail.com', 'kondwaninyirenda99@gmail.com'];

interface FoundUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

interface ImpactRow {
  table: string;
  rows: number;
  action: string;
}

interface DryRunResult {
  target: FoundUser & { user_id: string };
  tables_affected: number;
  total_rows: number;
  detach: { table: string; action: string; rows: number }[];
  details: ImpactRow[];
}

interface DeleteReport {
  target_user_id: string;
  target_email: string;
  deleted_by: string;
  total_rows_affected: number;
  details: ImpactRow[];
}

export function UserDeletionPanel() {
  const { isSuperAdmin } = useUserRoles();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<FoundUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FoundUser | null>(null);
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [dryRunning, setDryRunning] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [report, setReport] = useState<DeleteReport | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchTerm.trim().length >= 2) searchUsers(searchTerm.trim());
      else setResults([]);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const searchUsers = async (term: string) => {
    setSearching(true);
    try {
      const q = term.replace(/[%_,()]/g, '');
      const like = `%${q}%`;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, created_at')
        .or(`email.ilike.${like},first_name.ilike.${like},last_name.ilike.${like}`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setResults((data || []) as FoundUser[]);
    } catch (e) {
      console.error('User search failed', e);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const isProtected = (email: string) =>
    PROTECTED_EMAILS.includes((email || '').toLowerCase());

  const selectUser = (u: FoundUser) => {
    setSelected(u);
    setDryRun(null);
    setConfirmEmail('');
    setReport(null);
  };

  const runDryRun = async () => {
    if (!selected) return;
    setDryRunning(true);
    setDryRun(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('admin-delete-user', {
        body: { mode: 'dry_run', user_id: selected.id },
        headers: session.session ? { Authorization: `Bearer ${session.session.access_token}` } : undefined,
      });
      if (res.error) throw new Error(res.error.message);
      if ((res.data as any)?.error) throw new Error((res.data as any).error);
      setDryRun(res.data as DryRunResult);
    } catch (e: any) {
      console.error('Dry run failed', e);
      toast.error(e.message || 'Dry run failed');
    } finally {
      setDryRunning(false);
    }
  };

  const executeDelete = async () => {
    if (!selected || !dryRun) return;
    setDeleting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('admin-delete-user', {
        body: {
          mode: 'delete',
          user_id: selected.id,
          confirmation_email: confirmEmail.trim().toLowerCase(),
        },
        headers: session.session ? { Authorization: `Bearer ${session.session.access_token}` } : undefined,
      });
      if (res.error) throw new Error(res.error.message);
      if ((res.data as any)?.error) throw new Error((res.data as any).error);
      setReport((res.data as any).report as DeleteReport);
      setShowFinalConfirm(false);
      toast.success(`Account ${selected.email} permanently deleted`);
      // Reset selection state
      setSelected(null);
      setDryRun(null);
      setConfirmEmail('');
      setResults([]);
      setSearchTerm('');
    } catch (e: any) {
      console.error('Deletion failed', e);
      toast.error(e.message || 'Deletion failed — nothing was deleted (rolled back)');
    } finally {
      setDeleting(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-8 text-center text-muted-foreground">
          <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-destructive" />
          User deletion requires platform superadmin access.
        </CardContent>
      </Card>
    );
  }

  const emailMatches = selected && confirmEmail.trim().toLowerCase() === (selected.email || '').toLowerCase();

  return (
    <div className="space-y-6">
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete User Account
          </CardTitle>
          <CardDescription>
            Permanently removes a user and <strong>all</strong> of their data across every table.
            This cannot be undone. A dry-run impact report is always shown first, and the
            target's email must be typed to confirm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm flex gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
            <span>
              Protected accounts can never be deleted:{' '}
              <strong>{PROTECTED_EMAILS.join(', ')}</strong>
            </span>
          </div>

          {/* Step 1: search */}
          <div className="space-y-2">
            <Label>1. Find the user by email or name</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type at least 2 characters…"
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
            {results.length > 0 && (
              <div className="rounded-lg border divide-y max-h-56 overflow-auto">
                {results.map((u) => {
                  const prot = isProtected(u.email);
                  return (
                    <button
                      key={u.id}
                      onClick={() => !prot && selectUser(u)}
                      disabled={prot}
                      className={`w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between gap-2 ${
                        prot ? 'opacity-50 cursor-not-allowed' : ''
                      } ${selected?.id === u.id ? 'bg-muted' : ''}`}
                    >
                      <span>
                        <span className="text-sm font-medium">{u.email}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {[u.first_name, u.last_name].filter(Boolean).join(' ')}
                        </span>
                      </span>
                      {prot ? (
                        <Badge variant="destructive">Protected</Badge>
                      ) : (
                        <Badge variant="outline">Select</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: dry run */}
          {selected && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">2. Impact preview</p>
                  <p className="text-xs text-muted-foreground">
                    Target: <strong>{selected.email}</strong> ({selected.id.slice(0, 8)}…)
                  </p>
                </div>
                <Button onClick={runDryRun} disabled={dryRunning} variant="outline">
                  {dryRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing…
                    </>
                  ) : (
                    'Run dry-run'
                  )}
                </Button>
              </div>

              {dryRun && (
                <div className="space-y-2">
                  <div className="flex gap-4 text-sm">
                    <span>
                      Tables affected: <strong>{dryRun.tables_affected}</strong>
                    </span>
                    <span>
                      Total rows: <strong>{dryRun.total_rows}</strong>
                    </span>
                  </div>
                  {dryRun.detach.length > 0 && (
                    <div className="rounded bg-blue-500/10 border border-blue-500/30 p-2 text-xs">
                      <strong>Preserved (reference detached, row kept):</strong>
                      <ul className="list-disc ml-4 mt-1">
                        {dryRun.detach.map((d, i) => (
                          <li key={i}>
                            {d.table} — user reference set to NULL ({d.rows} row{d.rows === 1 ? '' : 's'})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="rounded border max-h-64 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2">Table</th>
                          <th className="text-right p-2">Rows</th>
                          <th className="text-right p-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {dryRun.details.map((r, i) => (
                          <tr key={i}>
                            <td className="p-2 font-mono">{r.table}</td>
                            <td className="p-2 text-right">{r.rows}</td>
                            <td className="p-2 text-right">{r.action}</td>
                          </tr>
                        ))}
                        {dryRun.details.length === 0 && (
                          <tr>
                            <td colSpan={3} className="p-2 text-center text-muted-foreground">
                              No dependent rows — only the profile and auth account will be removed.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Step 3: typed confirmation */}
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="confirm-email">
                      3. Type <strong className="font-mono">{selected.email}</strong> to confirm
                    </Label>
                    <Input
                      id="confirm-email"
                      placeholder={selected.email}
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      autoComplete="off"
                    />
                    <Button
                      variant="destructive"
                      disabled={!emailMatches || deleting}
                      onClick={() => setShowFinalConfirm(true)}
                      className="w-full"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete this account permanently
                        </>
                      )}
                    </Button>
                    {!emailMatches && confirmEmail && (
                      <p className="text-xs text-destructive">Email does not match.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Report */}
          {report && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Deletion complete
              </p>
              <p className="text-xs text-muted-foreground">
                {report.target_email} — {report.total_rows_affected} rows affected
              </p>
              <div className="rounded border max-h-48 overflow-auto bg-background">
                <table className="w-full text-xs">
                  <tbody className="divide-y">
                    {report.details.map((r, i) => (
                      <tr key={i}>
                        <td className="p-2 font-mono">{r.table}</td>
                        <td className="p-2 text-right">{r.rows}</td>
                        <td className="p-2 text-right text-muted-foreground">{r.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Final irreversible confirmation */}
      <AlertDialog open={showFinalConfirm} onOpenChange={setShowFinalConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Permanently delete {selected?.email}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the auth account, profile, and{' '}
              <strong>{dryRun?.total_rows ?? 0} rows</strong> across{' '}
              <strong>{dryRun?.tables_affected ?? 0} tables</strong>. This cannot be undone.
              {dryRun && dryRun.detach.length > 0 && (
                <>
                  {' '}Shared records ({dryRun.detach.map((d) => d.table).join(', ')}) will be
                  preserved with the user reference removed.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
