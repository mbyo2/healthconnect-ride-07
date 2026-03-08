import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Wrench, AlertTriangle, Settings, Plus, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface WorkOrder {
  id: string;
  title: string;
  category: 'electrical' | 'plumbing' | 'hvac' | 'medical_equipment' | 'structural' | 'it_network' | 'biomedical';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'assigned' | 'in_progress' | 'completed';
  location: string;
  assigned_to: string;
  description: string;
  created_at: string;
}

interface VendorContract {
  id: string;
  vendor_name: string;
  service_type: string;
  contract_end: string;
  monthly_cost: number;
  status: 'active' | 'expiring' | 'expired';
}

export const MaintenanceManagerWorkflow = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'electrical' as const, priority: 'medium' as const, location: '', assigned_to: '', description: '' });

  const open = workOrders.filter(w => w.status !== 'completed');
  const critical = workOrders.filter(w => w.priority === 'critical' && w.status !== 'completed');

  const priorityColor = (p: string) => {
    switch (p) { case 'critical': return 'bg-destructive/10 text-destructive'; case 'high': return 'bg-amber-100 text-amber-800'; default: return ''; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maintenance & Facilities</h1>
          <p className="text-muted-foreground">Work orders, asset maintenance & vendor contracts</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button className="gap-1"><Plus className="h-4 w-4" /> New Work Order</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Work Order</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g., AC unit malfunction in Ward 3" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm({...form, category: v as any})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electrical">Electrical</SelectItem><SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem><SelectItem value="medical_equipment">Medical Equipment</SelectItem>
                      <SelectItem value="structural">Structural</SelectItem><SelectItem value="it_network">IT/Network</SelectItem>
                      <SelectItem value="biomedical">Biomedical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm({...form, priority: v as any})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Building/Floor/Room" /></div>
                <div className="space-y-1"><Label>Assign To</Label><Input value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} /></div>
              </div>
              <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} /></div>
              <Button className="w-full" onClick={() => {
                setWorkOrders(prev => [...prev, { id: Date.now().toString(), ...form, status: 'open', created_at: new Date().toISOString() }]);
                setShowAdd(false);
                toast.success('Work order created');
              }}>Submit Work Order</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Wrench className="h-5 w-5 text-primary" /> Open Orders</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{open.length}</p></CardContent></Card>
        <Card className="border-destructive/20 bg-destructive/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-destructive" /> Critical</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-destructive">{critical.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Settings className="h-5 w-5" /> Contracts</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{contracts.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Work Orders</CardTitle></CardHeader>
        <CardContent>
          {workOrders.length === 0 ? <p className="text-muted-foreground text-center py-4">No work orders yet</p> : (
            <div className="space-y-2">
              {workOrders.map(wo => (
                <div key={wo.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{wo.title}</p>
                    <p className="text-sm text-muted-foreground">{wo.category} • {wo.location} • {wo.assigned_to || 'Unassigned'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={priorityColor(wo.priority)}>{wo.priority}</Badge>
                    <Badge variant="outline">{wo.status}</Badge>
                    {wo.status === 'open' && (
                      <Button size="sm" variant="outline" onClick={() => setWorkOrders(prev => prev.map(w => w.id === wo.id ? {...w, status: 'in_progress'} : w))}>Start</Button>
                    )}
                    {wo.status === 'in_progress' && (
                      <Button size="sm" onClick={() => setWorkOrders(prev => prev.map(w => w.id === wo.id ? {...w, status: 'completed'} : w))}>Complete</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
