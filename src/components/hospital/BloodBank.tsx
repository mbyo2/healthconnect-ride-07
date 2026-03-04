import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplets, Plus, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export const BloodBank = ({ hospital }: { hospital: any }) => {
  const inventory = [
    { type: 'A+', whole: 15, prbc: 8, ffp: 5, platelets: 3, status: 'adequate' },
    { type: 'A-', whole: 3, prbc: 2, ffp: 1, platelets: 0, status: 'low' },
    { type: 'B+', whole: 12, prbc: 6, ffp: 4, platelets: 2, status: 'adequate' },
    { type: 'B-', whole: 2, prbc: 1, ffp: 0, platelets: 0, status: 'critical' },
    { type: 'AB+', whole: 5, prbc: 3, ffp: 2, platelets: 1, status: 'adequate' },
    { type: 'AB-', whole: 1, prbc: 0, ffp: 1, platelets: 0, status: 'critical' },
    { type: 'O+', whole: 20, prbc: 10, ffp: 8, platelets: 4, status: 'adequate' },
    { type: 'O-', whole: 4, prbc: 2, ffp: 1, platelets: 1, status: 'low' },
  ];

  const requests = [
    { id: 'BR-001', patient: 'John Mwale', type: 'B+', component: 'PRBC', units: 2, doctor: 'Dr. Banda', dept: 'Surgery', status: 'crossmatch_done', urgency: 'urgent' },
    { id: 'BR-002', patient: 'Mary Phiri', type: 'O+', component: 'Whole Blood', units: 1, doctor: 'Dr. Tembo', dept: 'Obstetrics', status: 'pending', urgency: 'emergency' },
    { id: 'BR-003', patient: 'Grace Banda', type: 'A+', component: 'FFP', units: 3, doctor: 'Dr. Chanda', dept: 'ICU', status: 'issued', urgency: 'routine' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Blood Bank Management</h3>
          <p className="text-sm text-muted-foreground">Inventory, cross-match, issue & donor management</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Register Donor</Button>
          <Button size="sm" variant="outline" className="gap-2"><Droplets className="h-4 w-4" /> Blood Request</Button>
        </div>
      </div>

      {/* Blood Inventory Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-muted-foreground">
            <th className="p-2 text-xs">Blood Group</th>
            <th className="p-2 text-xs text-center">Whole Blood</th>
            <th className="p-2 text-xs text-center">PRBC</th>
            <th className="p-2 text-xs text-center">FFP</th>
            <th className="p-2 text-xs text-center">Platelets</th>
            <th className="p-2 text-xs text-center">Status</th>
          </tr></thead>
          <tbody>
            {inventory.map(b => (
              <tr key={b.type} className="border-b border-border">
                <td className="p-2 font-bold text-foreground text-base">{b.type}</td>
                <td className="p-2 text-center text-foreground">{b.whole}</td>
                <td className="p-2 text-center text-foreground">{b.prbc}</td>
                <td className="p-2 text-center text-foreground">{b.ffp}</td>
                <td className="p-2 text-center text-foreground">{b.platelets}</td>
                <td className="p-2 text-center">
                  <Badge variant={b.status === 'critical' ? 'destructive' : b.status === 'low' ? 'secondary' : 'outline'} className="text-[10px] capitalize">{b.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests" className="text-xs">Blood Requests</TabsTrigger>
          <TabsTrigger value="donors" className="text-xs">Donors</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-3">
          {requests.map(r => (
            <Card key={r.id} className={r.urgency === 'emergency' ? 'border-destructive/40 bg-destructive/5' : ''}>
              <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{r.patient}</span>
                    <Badge variant="outline" className="text-[10px] font-bold">{r.type}</Badge>
                    <Badge variant={r.status === 'issued' ? 'default' : r.status === 'crossmatch_done' ? 'secondary' : 'outline'} className="text-[10px] capitalize">{r.status.replace('_', ' ')}</Badge>
                    {r.urgency === 'emergency' && <Badge variant="destructive" className="text-[10px]">EMERGENCY</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{r.id} • {r.component} x{r.units} units • {r.doctor} ({r.dept})</p>
                </div>
                <div className="flex gap-1">
                  {r.status === 'pending' && <Button size="sm" className="text-xs">Cross-Match</Button>}
                  {r.status === 'crossmatch_done' && <Button size="sm" className="text-xs">Issue Blood</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="donors" className="text-center py-8 text-muted-foreground">
          <Droplets className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Donor registry with eligibility tracking & donation history</p>
          <Button variant="outline" className="mt-3">View Donor Database</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};
