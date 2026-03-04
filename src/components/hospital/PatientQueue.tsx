import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Clock, CheckCircle2, ArrowRight, Monitor, Volume2 } from 'lucide-react';

interface Props {
  hospital: any;
  departments: any[];
}

export const PatientQueue = ({ hospital, departments }: Props) => {
  const [selectedDept, setSelectedDept] = useState('all');

  const [queues] = useState([
    { id: 1, token: 'T-001', patient: 'John Mwale', dept: 'General Medicine', doctor: 'Dr. Banda', counter: 'OPD-1', status: 'serving', waitTime: 0 },
    { id: 2, token: 'T-002', patient: 'Mary Phiri', dept: 'General Medicine', doctor: 'Dr. Banda', counter: 'OPD-1', status: 'next', waitTime: 5 },
    { id: 3, token: 'T-003', patient: 'Grace Banda', dept: 'General Medicine', doctor: 'Dr. Banda', counter: 'OPD-1', status: 'waiting', waitTime: 15 },
    { id: 4, token: 'T-004', patient: 'Peter Zulu', dept: 'Orthopedics', doctor: 'Dr. Mulenga', counter: 'OPD-3', status: 'serving', waitTime: 0 },
    { id: 5, token: 'T-005', patient: 'David Mumba', dept: 'Orthopedics', doctor: 'Dr. Mulenga', counter: 'OPD-3', status: 'waiting', waitTime: 10 },
    { id: 6, token: 'T-006', patient: 'Sarah Tembo', dept: 'Cardiology', doctor: 'Dr. Chanda', counter: 'OPD-5', status: 'serving', waitTime: 0 },
    { id: 7, token: 'T-007', patient: 'Alice Ngosa', dept: 'General Medicine', doctor: 'Dr. Tembo', counter: 'OPD-2', status: 'waiting', waitTime: 20 },
    { id: 8, token: 'T-008', patient: 'Moses Bwalya', dept: 'Pharmacy', doctor: '-', counter: 'PHR-1', status: 'waiting', waitTime: 8 },
    { id: 9, token: 'T-009', patient: 'Ruth Siame', dept: 'Lab', doctor: '-', counter: 'LAB-1', status: 'serving', waitTime: 0 },
  ]);

  const filtered = selectedDept === 'all' ? queues : queues.filter(q => q.dept === selectedDept);
  const deptList = [...new Set(queues.map(q => q.dept))];

  const stats = {
    total: queues.length,
    serving: queues.filter(q => q.status === 'serving').length,
    waiting: queues.filter(q => q.status === 'waiting').length,
    avgWait: Math.round(queues.filter(q => q.status === 'waiting').reduce((s, q) => s + q.waitTime, 0) / Math.max(1, queues.filter(q => q.status === 'waiting').length)),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Queue & Token Management</h3>
          <p className="text-sm text-muted-foreground">Real-time patient flow across OPD, lab, pharmacy & billing</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2"><Monitor className="h-4 w-4" /> Display Board</Button>
          <Button size="sm" variant="outline" className="gap-2"><Volume2 className="h-4 w-4" /> Call Next</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Users className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Tokens</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <ArrowRight className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.serving}</p>
          <p className="text-xs text-muted-foreground">Being Served</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.waiting}</p>
          <p className="text-xs text-muted-foreground">Waiting</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.avgWait}m</p>
          <p className="text-xs text-muted-foreground">Avg Wait</p>
        </CardContent></Card>
      </div>

      <Select value={selectedDept} onValueChange={setSelectedDept}>
        <SelectTrigger className="w-48"><SelectValue placeholder="Filter by dept" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {deptList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="space-y-2">
        {filtered.map(q => (
          <Card key={q.id} className={q.status === 'serving' ? 'border-emerald-500/30 bg-emerald-500/5' : q.status === 'next' ? 'border-primary/30 bg-primary/5' : ''}>
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm ${q.status === 'serving' ? 'bg-emerald-500 text-white' : q.status === 'next' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  {q.token}
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{q.patient}</p>
                  <p className="text-xs text-muted-foreground">{q.dept} • {q.counter} • {q.doctor}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {q.status === 'waiting' && <span className="text-xs text-muted-foreground">{q.waitTime}m wait</span>}
                <Badge variant={q.status === 'serving' ? 'default' : q.status === 'next' ? 'secondary' : 'outline'} className="text-[10px] capitalize">{q.status}</Badge>
                {q.status === 'waiting' && <Button size="sm" variant="outline" className="text-xs">Call</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
