import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRightLeft, Plus, ArrowRight, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';

export const ReferralManagement = ({ hospital }: { hospital: any }) => {
  const [incoming] = useState([
    { id: 'REF-IN-001', patient: 'John Mwale', from: 'Chipata District Hospital', doctor: 'Dr. Kamanga', reason: 'Cardiac catheterization needed', dept: 'Cardiology', date: '2026-03-04', status: 'accepted', priority: 'urgent' },
    { id: 'REF-IN-002', patient: 'Mary Phiri', from: 'Ndola Central', doctor: 'Dr. Sakala', reason: 'Neurosurgery consult', dept: 'Neurosurgery', date: '2026-03-03', status: 'pending', priority: 'routine' },
  ]);

  const [outgoing] = useState([
    { id: 'REF-OUT-001', patient: 'Grace Banda', to: 'UTH Lusaka', doctor: 'Dr. Banda', reason: 'Oncology treatment - advanced breast cancer', dept: 'Oncology', date: '2026-03-02', status: 'acknowledged', priority: 'urgent' },
    { id: 'REF-OUT-002', patient: 'Peter Zulu', to: 'Levy Mwanawasa Hospital', doctor: 'Dr. Tembo', reason: 'Renal transplant evaluation', dept: 'Nephrology', date: '2026-03-01', status: 'sent', priority: 'routine' },
  ]);

  const [internal] = useState([
    { id: 'REF-INT-001', patient: 'David Mumba', from: 'Dr. Banda (General)', to: 'Dr. Chanda (Cardiology)', reason: 'Abnormal ECG, needs cardiology opinion', date: '2026-03-04', status: 'seen' },
    { id: 'REF-INT-002', patient: 'Sarah Tembo', from: 'Dr. Mulenga (Ortho)', to: 'Dr. Tembo (Physio)', reason: 'Post-op rehabilitation', date: '2026-03-04', status: 'pending' },
  ]);

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
          <p className="text-2xl font-bold text-foreground">{internal.length}</p>
          <p className="text-xs text-muted-foreground">Internal</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming" className="text-xs">Incoming</TabsTrigger>
          <TabsTrigger value="outgoing" className="text-xs">Outgoing</TabsTrigger>
          <TabsTrigger value="internal" className="text-xs">Internal</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="space-y-3">
          {incoming.map(r => (
            <Card key={r.id} className={r.priority === 'urgent' ? 'border-amber-500/30' : ''}>
              <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{r.patient}</span>
                    <Badge variant={r.status === 'accepted' ? 'default' : 'secondary'} className="text-[10px] capitalize">{r.status}</Badge>
                    {r.priority === 'urgent' && <Badge variant="destructive" className="text-[10px]">URGENT</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">From: {r.from} ({r.doctor}) → {r.dept}</p>
                  <p className="text-xs text-muted-foreground">{r.reason}</p>
                </div>
                <div className="flex gap-1">
                  {r.status === 'pending' && <>
                    <Button size="sm" className="text-xs">Accept</Button>
                    <Button size="sm" variant="outline" className="text-xs">Decline</Button>
                  </>}
                  <Button size="sm" variant="outline" className="text-xs">View</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="outgoing" className="space-y-3">
          {outgoing.map(r => (
            <Card key={r.id}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground">{r.patient}</span>
                  <Badge variant={r.status === 'acknowledged' ? 'default' : 'secondary'} className="text-[10px] capitalize">{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">To: {r.to} • {r.dept} • {r.doctor}</p>
                <p className="text-xs text-muted-foreground">{r.reason}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="internal" className="space-y-3">
          {internal.map(r => (
            <Card key={r.id}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground">{r.patient}</span>
                  <Badge variant={r.status === 'seen' ? 'default' : 'secondary'} className="text-[10px] capitalize">{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{r.from} → {r.to}</p>
                <p className="text-xs text-muted-foreground">{r.reason}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};
