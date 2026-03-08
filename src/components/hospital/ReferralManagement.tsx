import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRightLeft, Plus, ArrowRight, ArrowLeft, CheckCircle2, Clock, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export const ReferralManagement = ({ hospital }: { hospital: any }) => {
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['referrals', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];
      // Try to query a referrals table if it exists; gracefully return empty
      try {
        const { data, error } = await supabase
          .from('patient_referrals' as any)
          .select('*')
          .or(`from_institution_id.eq.${hospital.id},to_institution_id.eq.${hospital.id}`)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!hospital?.id,
  });

  const incoming = referrals.filter((r: any) => r.to_institution_id === hospital?.id);
  const outgoing = referrals.filter((r: any) => r.from_institution_id === hospital?.id);

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Referral Management</h3>
          <p className="text-sm text-muted-foreground">Incoming, outgoing & internal referral tracking</p>
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Create Referral</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <ArrowLeft className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{incoming.length}</p>
          <p className="text-xs text-muted-foreground">Incoming</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <ArrowRight className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{outgoing.length}</p>
          <p className="text-xs text-muted-foreground">Outgoing</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <ArrowRightLeft className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{referrals.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="incoming" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="incoming" className="gap-1.5"><ArrowLeft className="h-3.5 w-3.5" /> Incoming</TabsTrigger>
          <TabsTrigger value="outgoing" className="gap-1.5"><ArrowRight className="h-3.5 w-3.5" /> Outgoing</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming">
          {incoming.length === 0 ? (
            <EmptyState message="No incoming referrals yet" />
          ) : (
            <div className="space-y-2">
              {incoming.map((ref: any) => (
                <Card key={ref.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{ref.patient_name || 'Patient'}</p>
                      <p className="text-xs text-muted-foreground">{ref.reason || 'No reason specified'}</p>
                    </div>
                    <Badge variant={ref.status === 'accepted' ? 'default' : 'secondary'}>
                      {ref.status || 'pending'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outgoing">
          {outgoing.length === 0 ? (
            <EmptyState message="No outgoing referrals yet" />
          ) : (
            <div className="space-y-2">
              {outgoing.map((ref: any) => (
                <Card key={ref.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{ref.patient_name || 'Patient'}</p>
                      <p className="text-xs text-muted-foreground">{ref.reason || 'No reason specified'}</p>
                    </div>
                    <Badge variant={ref.status === 'acknowledged' ? 'default' : 'secondary'}>
                      {ref.status || 'sent'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
