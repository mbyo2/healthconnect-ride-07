import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Droplets, MapPin, Users, Truck, Plus, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { toast } from 'sonner';
import { BarcodeScanner } from '@/components/shared/BarcodeScanner';

interface SampleCollection {
  id: string;
  patient_name: string;
  sample_type: string;
  barcode: string;
  collection_type: 'in_lab' | 'home_visit';
  status: 'pending' | 'collected' | 'in_transit' | 'received';
  address?: string;
  scheduled_time: string;
  collected_at?: string;
}

export const PhlebotomistWorkflow = () => {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [samples, setSamples] = useState<SampleCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [form, setForm] = useState({ patient_name: '', sample_type: 'blood', collection_type: 'in_lab' as const, address: '', scheduled_time: '' });

  const pending = samples.filter(s => s.status === 'pending');
  const homeVisits = samples.filter(s => s.collection_type === 'home_visit' && s.status === 'pending');
  const collected = samples.filter(s => s.status === 'collected' || s.status === 'received');

  const handleBarcodeScan = (code: string) => {
    const sample = samples.find(s => s.barcode === code);
    if (sample) {
      setSamples(prev => prev.map(s => s.id === sample.id ? { ...s, status: 'collected', collected_at: new Date().toISOString() } : s));
      toast.success(`Sample ${code} marked as collected`);
    } else {
      toast.info(`Barcode: ${code} — No matching sample found`);
    }
    setShowScanner(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Phlebotomist Dashboard</h1>
          <p className="text-muted-foreground">Sample collection, barcoding & home visits</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1" onClick={() => setShowScanner(!showScanner)}>
            <Droplets className="h-4 w-4" /> Scan Sample
          </Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button className="gap-1"><Plus className="h-4 w-4" /> New Collection</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Sample Collection</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Patient Name</Label><Input value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} /></div>
                <div className="space-y-1"><Label>Sample Type</Label>
                  <Select value={form.sample_type} onValueChange={v => setForm({...form, sample_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blood">Blood</SelectItem><SelectItem value="urine">Urine</SelectItem>
                      <SelectItem value="stool">Stool</SelectItem><SelectItem value="swab">Swab</SelectItem>
                      <SelectItem value="csf">CSF</SelectItem><SelectItem value="biopsy">Biopsy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Collection Type</Label>
                  <Select value={form.collection_type} onValueChange={v => setForm({...form, collection_type: v as any})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="in_lab">In-Lab</SelectItem><SelectItem value="home_visit">Home Visit</SelectItem></SelectContent>
                  </Select>
                </div>
                {form.collection_type === 'home_visit' && (
                  <div className="space-y-1"><Label>Address</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                )}
                <div className="space-y-1"><Label>Scheduled Time</Label><Input type="time" value={form.scheduled_time} onChange={e => setForm({...form, scheduled_time: e.target.value})} /></div>
                <Button className="w-full" onClick={() => {
                  const barcode = `SMP-${Date.now().toString(36).toUpperCase()}`;
                  setSamples(prev => [...prev, { id: Date.now().toString(), ...form, barcode, status: 'pending', scheduled_time: form.scheduled_time || new Date().toTimeString().slice(0, 5) }]);
                  setShowAdd(false);
                  toast.success(`Sample ${barcode} created`);
                }}>Create & Print Label</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} title="Scan Sample Barcode" />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Droplets className="h-5 w-5 text-primary" /> Pending</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{pending.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Truck className="h-5 w-5" /> Home Visits</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{homeVisits.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><CheckCircle className="h-5 w-5" /> Collected</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{collected.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Collection Queue</CardTitle></CardHeader>
        <CardContent>
          {samples.length === 0 ? <p className="text-muted-foreground text-center py-4">No samples in queue</p> : (
            <div className="space-y-2">
              {samples.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{s.patient_name} — {s.sample_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.barcode} • {s.collection_type === 'home_visit' ? `🏠 ${s.address}` : '🏥 In-Lab'} • {s.scheduled_time}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{s.status}</Badge>
                    {s.status === 'pending' && (
                      <Button size="sm" onClick={() => setSamples(prev => prev.map(x => x.id === s.id ? {...x, status: 'collected', collected_at: new Date().toISOString()} : x))}>
                        Collect
                      </Button>
                    )}
                    {s.status === 'collected' && (
                      <Button size="sm" variant="outline" onClick={() => setSamples(prev => prev.map(x => x.id === s.id ? {...x, status: 'in_transit'} : x))}>
                        Send to Lab
                      </Button>
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
