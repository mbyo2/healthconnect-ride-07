import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Clock, CheckCircle2, XCircle, Plus, FileText, DollarSign, AlertTriangle } from 'lucide-react';

export const InsuranceTPA = ({ hospital }: { hospital: any }) => {
  const [preAuths] = useState([
    { id: 'PA-001', patient: 'John Mwale', insurer: 'ZSIC', policyNo: 'ZS-2024-1234', procedure: 'Appendectomy', estCost: 15000, status: 'approved', date: '2026-03-02' },
    { id: 'PA-002', patient: 'Mary Phiri', insurer: 'Madison General', policyNo: 'MG-2024-5678', procedure: 'MRI Brain', estCost: 5000, status: 'pending', date: '2026-03-04' },
    { id: 'PA-003', patient: 'Grace Banda', insurer: 'Professional Insurance', policyNo: 'PI-2024-9012', procedure: 'Knee Replacement', estCost: 45000, status: 'rejected', date: '2026-03-01' },
  ]);

  const [claims] = useState([
    { id: 'CLM-001', patient: 'Peter Zulu', insurer: 'ZSIC', amount: 12500, submitted: '2026-02-20', status: 'paid', paidAmount: 10000 },
    { id: 'CLM-002', patient: 'David Mumba', insurer: 'Madison General', amount: 8000, submitted: '2026-02-25', status: 'processing', paidAmount: 0 },
    { id: 'CLM-003', patient: 'Sarah Tembo', insurer: 'Professional Insurance', amount: 22000, submitted: '2026-02-15', status: 'disputed', paidAmount: 0 },
    { id: 'CLM-004', patient: 'James Kapota', insurer: 'ZSIC', amount: 3500, submitted: '2026-03-01', status: 'submitted', paidAmount: 0 },
  ]);

  const stats = {
    pendingAuth: preAuths.filter(p => p.status === 'pending').length,
    approvedAuth: preAuths.filter(p => p.status === 'approved').length,
    pendingClaims: claims.filter(c => ['submitted', 'processing'].includes(c.status)).length,
    totalReceivable: claims.filter(c => c.status !== 'paid').reduce((s, c) => s + c.amount, 0),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Insurance & TPA Management</h3>
          <p className="text-sm text-muted-foreground">Pre-authorization, claims processing & settlement tracking</p>
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Pre-Auth</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.pendingAuth}</p>
          <p className="text-xs text-muted-foreground">Pending Auth</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.approvedAuth}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <FileText className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.pendingClaims}</p>
          <p className="text-xs text-muted-foreground">Pending Claims</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <DollarSign className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">K{(stats.totalReceivable / 1000).toFixed(0)}k</p>
          <p className="text-xs text-muted-foreground">Receivable</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="preauth">
        <TabsList>
          <TabsTrigger value="preauth" className="text-xs">Pre-Authorization</TabsTrigger>
          <TabsTrigger value="claims" className="text-xs">Claims</TabsTrigger>
        </TabsList>

        <TabsContent value="preauth" className="space-y-3">
          {preAuths.map(pa => (
            <Card key={pa.id} className={pa.status === 'rejected' ? 'border-destructive/30' : pa.status === 'approved' ? 'border-emerald-500/30' : ''}>
              <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{pa.patient}</span>
                    <Badge variant={pa.status === 'approved' ? 'default' : pa.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">{pa.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{pa.id} • {pa.insurer} ({pa.policyNo}) • {pa.procedure}</p>
                  <p className="text-xs text-muted-foreground">Est. Cost: K{pa.estCost.toLocaleString()} • {pa.date}</p>
                </div>
                <div className="flex gap-1">
                  {pa.status === 'pending' && <Button size="sm" variant="outline" className="text-xs">Follow Up</Button>}
                  {pa.status === 'rejected' && <Button size="sm" variant="outline" className="text-xs">Appeal</Button>}
                  <Button size="sm" variant="outline" className="text-xs">View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="claims" className="space-y-3">
          {claims.map(cl => (
            <Card key={cl.id}>
              <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{cl.patient}</span>
                    <Badge variant={cl.status === 'paid' ? 'default' : cl.status === 'disputed' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">{cl.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{cl.id} • {cl.insurer} • Claimed: K{cl.amount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Submitted: {cl.submitted} {cl.paidAmount > 0 && `• Paid: K${cl.paidAmount.toLocaleString()}`}</p>
                </div>
                <div className="flex gap-1">
                  {cl.status === 'disputed' && <Button size="sm" variant="outline" className="text-xs">Resolve</Button>}
                  <Button size="sm" variant="outline" className="text-xs">Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};
