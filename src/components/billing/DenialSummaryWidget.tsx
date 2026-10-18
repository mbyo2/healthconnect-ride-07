import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Wallet, FileX2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { format, differenceInDays, parseISO } from 'date-fns';

interface DenialRow {
  id: string;
  status: string;
  denied_amount: number;
  denial_reason: string;
  appeal_deadline: string | null;
  insurance_claims?: { patient_name?: string | null; claim_number?: string | null } | null;
}

const OPEN_STATUSES = ['new', 'in_review', 'appealed'];

const formatMoney = (n: number) => `K${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export const DenialSummaryWidget: React.FC = () => {
  const { institutionId } = useInstitutionAffiliation();
  const [denials, setDenials] = useState<DenialRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDenials = useCallback(async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('claim_denials')
        .select('id, status, denied_amount, denial_reason, appeal_deadline, insurance_claims ( patient_name, claim_number )')
        .eq('institution_id', institutionId)
        .limit(500);

      if (error) throw error;
      setDenials((data as unknown as DenialRow[]) || []);
    } catch (err) {
      console.error('Failed to fetch denial summary:', err);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    fetchDenials();
  }, [fetchDenials]);

  const openDenials = denials.filter(d => OPEN_STATUSES.includes(d.status));
  const totalDeniedAmount = openDenials.reduce((sum, d) => sum + (Number(d.denied_amount) || 0), 0);

  const countByStatus = denials.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  const byReason = Object.entries(
    openDenials.reduce<Record<string, number>>((acc, d) => {
      const reason = (d.denial_reason || 'Unspecified').trim() || 'Unspecified';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const today = new Date();
  const upcoming = openDenials
    .filter(d => d.appeal_deadline && differenceInDays(parseISO(d.appeal_deadline), today) >= 0 && differenceInDays(parseISO(d.appeal_deadline), today) <= 7)
    .sort((a, b) => (a.appeal_deadline || '').localeCompare(b.appeal_deadline || ''))
    .slice(0, 5);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileX2 className="h-4 w-4 text-destructive" />
          Denial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wallet className="h-3 w-3" /> Open denied amount
                </div>
                <p className="text-xl font-bold text-destructive mt-1">{formatMoney(totalDeniedAmount)}</p>
              </div>
              <div className="rounded-xl bg-muted/50 border p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3" /> Open denials
                </div>
                <p className="text-xl font-bold mt-1">{openDenials.length}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {Object.keys(countByStatus).length === 0 && (
                <span className="text-xs text-muted-foreground">No denials logged yet.</span>
              )}
              {Object.entries(countByStatus).map(([status, count]) => (
                <Badge key={status} variant="outline" className="text-xs">
                  {status.replace('_', ' ')}: {count}
                </Badge>
              ))}
            </div>

            {byReason.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Top denial reasons</p>
                <div className="space-y-1">
                  {byReason.map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between text-sm">
                      <span className="truncate pr-2">{reason}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcoming.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Appeal deadlines — next 7 days
                </p>
                <div className="space-y-1">
                  {upcoming.map(d => (
                    <div key={d.id} className="flex items-center justify-between text-sm rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5">
                      <span className="truncate pr-2">
                        {d.insurance_claims?.patient_name || 'Standalone denial'} · {d.denial_reason}
                      </span>
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 shrink-0">
                        {d.appeal_deadline ? format(parseISO(d.appeal_deadline), 'MMM d') : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
