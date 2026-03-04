import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Plus, Clock, Ambulance, Heart, User, Zap } from 'lucide-react';

export const EmergencyTriage = ({ hospital }: { hospital: any }) => {
  const [cases] = useState([
    { id: 'ER-001', patient: 'Unknown Male (~40y)', complaint: 'RTA - Multiple injuries', triage: 'red', arrival: '10:15', mode: 'Ambulance', status: 'resuscitation', doctor: 'Dr. Banda', vitals: { bp: '90/60', pulse: '120', spo2: '88%' } },
    { id: 'ER-002', patient: 'Mary Phiri', complaint: 'Chest pain, SOB', triage: 'orange', arrival: '10:30', mode: 'Walk-in', status: 'assessment', doctor: 'Dr. Mulenga', vitals: { bp: '150/95', pulse: '98', spo2: '94%' } },
    { id: 'ER-003', patient: 'Child Banda (8y)', complaint: 'High fever, seizure', triage: 'orange', arrival: '09:45', mode: 'Walk-in', status: 'treatment', doctor: 'Dr. Tembo', vitals: { bp: '-', pulse: '130', spo2: '96%' } },
    { id: 'ER-004', patient: 'James Kapota', complaint: 'Laceration right hand', triage: 'yellow', arrival: '11:00', mode: 'Walk-in', status: 'waiting', doctor: 'Unassigned', vitals: { bp: '120/80', pulse: '76', spo2: '99%' } },
    { id: 'ER-005', patient: 'Grace Musonda', complaint: 'Abdominal pain, vomiting', triage: 'green', arrival: '10:50', mode: 'Walk-in', status: 'waiting', doctor: 'Unassigned', vitals: { bp: '118/72', pulse: '82', spo2: '98%' } },
  ]);

  const triageColors: Record<string, { bg: string; label: string; desc: string }> = {
    red: { bg: 'bg-red-500', label: 'Immediate', desc: 'Life-threatening' },
    orange: { bg: 'bg-orange-500', label: 'Emergency', desc: 'Urgent care needed' },
    yellow: { bg: 'bg-yellow-500', label: 'Urgent', desc: 'Can wait briefly' },
    green: { bg: 'bg-emerald-500', label: 'Standard', desc: 'Non-urgent' },
    blue: { bg: 'bg-blue-500', label: 'Non-urgent', desc: 'Minor complaint' },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Accident & Emergency (A&E)</h3>
          <p className="text-sm text-muted-foreground">Triage, resuscitation & emergency case management</p>
        </div>
        <Button size="sm" className="gap-2 bg-destructive hover:bg-destructive/90"><Plus className="h-4 w-4" /> Register Emergency</Button>
      </div>

      {/* Triage Legend & Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Object.entries(triageColors).map(([key, val]) => {
          const count = cases.filter(c => c.triage === key).length;
          return (
            <Card key={key}>
              <CardContent className="pt-3 pb-3 flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${val.bg} flex-shrink-0`} />
                <div>
                  <p className="text-sm font-bold text-foreground">{count}</p>
                  <p className="text-[10px] text-muted-foreground">{val.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active Cases */}
      <div className="space-y-3">
        {cases.map(c => (
          <Card key={c.id} className={c.triage === 'red' ? 'border-red-500/50 bg-red-500/5' : c.triage === 'orange' ? 'border-orange-500/30' : ''}>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`w-3 h-3 rounded-full ${triageColors[c.triage]?.bg} flex-shrink-0`} />
                    <span className="font-medium text-sm text-foreground">{c.patient}</span>
                    <Badge variant={c.status === 'resuscitation' ? 'destructive' : c.status === 'waiting' ? 'outline' : 'secondary'} className="text-[10px] capitalize">{c.status}</Badge>
                  </div>
                  <p className="text-sm text-foreground mt-1 font-medium">{c.complaint}</p>
                  <p className="text-xs text-muted-foreground">{c.id} • Arrived: {c.arrival} ({c.mode}) • {c.doctor}</p>
                  <div className="flex gap-3 mt-2 text-xs">
                    <span className="text-muted-foreground">BP: <strong className="text-foreground">{c.vitals.bp}</strong></span>
                    <span className="text-muted-foreground">Pulse: <strong className="text-foreground">{c.vitals.pulse}</strong></span>
                    <span className="text-muted-foreground">SpO2: <strong className="text-foreground">{c.vitals.spo2}</strong></span>
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {c.doctor === 'Unassigned' && <Button size="sm" className="text-xs">Assign Doctor</Button>}
                  {c.status === 'resuscitation' && <Button size="sm" variant="destructive" className="text-xs">Code Blue</Button>}
                  <Button size="sm" variant="outline" className="text-xs">Update</Button>
                  <Button size="sm" variant="outline" className="text-xs">Admit</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
