import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sun, Plus, Clock, CheckCircle2, User, Stethoscope } from 'lucide-react';

export const DayCareManagement = ({ hospital }: { hospital: any }) => {
  const [procedures] = useState([
    { id: 1, patient: 'John Mwale', procedure: 'Cataract Surgery (Phaco)', doctor: 'Dr. Kapasa', time: '08:00', estDuration: '2h', status: 'in_progress', bed: 'DC-01' },
    { id: 2, patient: 'Mary Phiri', procedure: 'Endoscopy (Upper GI)', doctor: 'Dr. Tembo', time: '09:30', estDuration: '1h', status: 'pre_op', bed: 'DC-02' },
    { id: 3, patient: 'Grace Banda', procedure: 'Colonoscopy', doctor: 'Dr. Tembo', time: '11:00', estDuration: '1.5h', status: 'scheduled', bed: 'DC-03' },
    { id: 4, patient: 'David Mumba', procedure: 'Dialysis Session', doctor: 'Dr. Mulenga', time: '07:00', estDuration: '4h', status: 'in_progress', bed: 'DC-04' },
    { id: 5, patient: 'Peter Zulu', procedure: 'Minor Wound Debridement', doctor: 'Dr. Banda', time: '10:00', estDuration: '45min', status: 'completed', bed: 'DC-05' },
    { id: 6, patient: 'Sarah Tembo', procedure: 'Chemotherapy Cycle 3', doctor: 'Dr. Chanda', time: '08:30', estDuration: '3h', status: 'post_op', bed: 'DC-06' },
  ]);

  const statusConfig: Record<string, { label: string; color: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    scheduled: { label: 'Scheduled', color: 'text-muted-foreground', variant: 'outline' },
    pre_op: { label: 'Pre-Op Prep', color: 'text-amber-500', variant: 'secondary' },
    in_progress: { label: 'In Progress', color: 'text-primary', variant: 'secondary' },
    post_op: { label: 'Post-Op Recovery', color: 'text-blue-500', variant: 'secondary' },
    completed: { label: 'Discharged', color: 'text-emerald-500', variant: 'default' },
  };

  const stats = {
    total: procedures.length,
    active: procedures.filter(p => ['in_progress', 'pre_op', 'post_op'].includes(p.status)).length,
    completed: procedures.filter(p => p.status === 'completed').length,
    upcoming: procedures.filter(p => p.status === 'scheduled').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Day Care Management</h3>
          <p className="text-sm text-muted-foreground">Short-stay procedures, dialysis & outpatient surgeries</p>
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Schedule Procedure</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Sun className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Today's Cases</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.active}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Stethoscope className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.upcoming}</p>
          <p className="text-xs text-muted-foreground">Upcoming</p>
        </CardContent></Card>
      </div>

      <div className="space-y-3">
        {procedures.map(p => (
          <Card key={p.id}>
            <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground">{p.patient}</span>
                  <Badge variant={statusConfig[p.status]?.variant} className="text-[10px]">{statusConfig[p.status]?.label}</Badge>
                  <Badge variant="outline" className="text-[10px]">Bed: {p.bed}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{p.procedure} • {p.doctor}</p>
                <p className="text-xs text-muted-foreground">Time: {p.time} • Duration: {p.estDuration}</p>
              </div>
              <div className="flex gap-1">
                {p.status === 'scheduled' && <Button size="sm" variant="outline" className="text-xs">Start Pre-Op</Button>}
                {p.status === 'pre_op' && <Button size="sm" className="text-xs">Begin Procedure</Button>}
                {p.status === 'in_progress' && <Button size="sm" className="text-xs">Complete</Button>}
                {p.status === 'post_op' && <Button size="sm" variant="outline" className="text-xs">Discharge</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
