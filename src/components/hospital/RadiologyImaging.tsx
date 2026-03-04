import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Monitor, Clock, CheckCircle2, Plus, FileText, Printer, Calendar } from 'lucide-react';

export const RadiologyImaging = ({ hospital }: { hospital: any }) => {
  const [orders] = useState([
    { id: 'RAD-001', patient: 'John Mwale', modality: 'X-Ray', bodyPart: 'Chest PA', doctor: 'Dr. Banda', scheduled: '2026-03-04 11:00', status: 'scheduled', priority: 'routine', room: 'X-Ray Room 1' },
    { id: 'RAD-002', patient: 'Mary Phiri', modality: 'CT Scan', bodyPart: 'Abdomen', doctor: 'Dr. Tembo', scheduled: '2026-03-04 14:00', status: 'in_progress', priority: 'urgent', room: 'CT Suite' },
    { id: 'RAD-003', patient: 'Peter Zulu', modality: 'Ultrasound', bodyPart: 'Abdomen', doctor: 'Dr. Mulenga', scheduled: '2026-03-04 09:30', status: 'completed', priority: 'routine', room: 'USG Room 2' },
    { id: 'RAD-004', patient: 'Grace Banda', modality: 'MRI', bodyPart: 'Brain', doctor: 'Dr. Chanda', scheduled: '2026-03-04 16:00', status: 'report_pending', priority: 'urgent', room: 'MRI Suite' },
    { id: 'RAD-005', patient: 'David Mumba', modality: 'X-Ray', bodyPart: 'Left Knee AP/Lat', doctor: 'Dr. Banda', scheduled: '2026-03-04 10:15', status: 'reported', priority: 'routine', room: 'X-Ray Room 1' },
  ]);

  const [modalities] = useState([
    { name: 'X-Ray', rooms: 2, queue: 3, available: true },
    { name: 'CT Scan', rooms: 1, queue: 1, available: true },
    { name: 'MRI', rooms: 1, queue: 2, available: true },
    { name: 'Ultrasound', rooms: 3, queue: 4, available: true },
    { name: 'Mammography', rooms: 1, queue: 0, available: true },
    { name: 'Fluoroscopy', rooms: 1, queue: 0, available: false },
  ]);

  const statusColors: Record<string, 'outline' | 'secondary' | 'default' | 'destructive'> = {
    scheduled: 'outline',
    in_progress: 'secondary',
    completed: 'default',
    report_pending: 'secondary',
    reported: 'default',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Radiology & Imaging (RIS)</h3>
          <p className="text-sm text-muted-foreground">Modality scheduling, image capture & radiology reporting</p>
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Imaging Order</Button>
      </div>

      {/* Modality Status */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {modalities.map(m => (
          <Card key={m.name} className={!m.available ? 'opacity-50' : ''}>
            <CardContent className="pt-3 pb-3 text-center">
              <Monitor className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-xs font-medium text-foreground">{m.name}</p>
              <p className="text-[10px] text-muted-foreground">{m.rooms} rooms • {m.queue} in queue</p>
              <Badge variant={m.available ? 'default' : 'destructive'} className="text-[10px] mt-1">
                {m.available ? 'Active' : 'Down'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="worklist">
        <TabsList>
          <TabsTrigger value="worklist" className="text-xs">Worklist</TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs">Schedule</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="worklist" className="space-y-3">
          {orders.map(o => (
            <Card key={o.id} className={o.priority === 'urgent' ? 'border-amber-500/40' : ''}>
              <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{o.patient}</span>
                    <Badge variant={statusColors[o.status]} className="text-[10px] capitalize">{o.status.replace('_', ' ')}</Badge>
                    {o.priority === 'urgent' && <Badge variant="destructive" className="text-[10px]">URGENT</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {o.id} • {o.modality}: {o.bodyPart} • {o.doctor} • {o.room}
                  </p>
                  <p className="text-xs text-muted-foreground">Scheduled: {o.scheduled}</p>
                </div>
                <div className="flex gap-1">
                  {o.status === 'scheduled' && <Button size="sm" variant="outline" className="text-xs">Start Exam</Button>}
                  {o.status === 'in_progress' && <Button size="sm" className="text-xs">Complete</Button>}
                  {o.status === 'report_pending' && <Button size="sm" className="text-xs">Write Report</Button>}
                  {o.status === 'reported' && <Button size="sm" variant="outline" className="text-xs gap-1"><Printer className="h-3 w-3" /> Print</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="schedule" className="text-center py-8">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Modality schedule calendar view — configure time slots per room</p>
          <Button variant="outline" className="mt-3">Open Schedule Calendar</Button>
        </TabsContent>

        <TabsContent value="reports" className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">View completed radiology reports with DICOM viewer integration</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};
