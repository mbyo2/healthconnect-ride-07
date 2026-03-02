import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Bed, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BedWardProps {
  hospital: any;
  departments: any[];
  beds: any[];
  onRefresh: () => void;
}

export const BedWardManagement = ({ hospital, departments, beds, onRefresh }: BedWardProps) => {
  const [showAddBed, setShowAddBed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bedForm, setBedForm] = useState({
    bedNumber: '', bedType: 'general', departmentId: '', roomNumber: '', floorNumber: ''
  });

  const addBed = async () => {
    if (!bedForm.bedNumber || !bedForm.departmentId) {
      toast.error('Please fill required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('hospital_beds' as any).insert({
        hospital_id: hospital.id,
        bed_number: bedForm.bedNumber,
        bed_type: bedForm.bedType,
        department_id: bedForm.departmentId,
        room_number: bedForm.roomNumber || null,
        floor_number: bedForm.floorNumber ? parseInt(bedForm.floorNumber) : null,
        status: 'available'
      });
      if (error) throw error;
      toast.success(`Bed ${bedForm.bedNumber} added`);
      setBedForm({ bedNumber: '', bedType: 'general', departmentId: '', roomNumber: '', floorNumber: '' });
      setShowAddBed(false);
      onRefresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to add bed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleBedStatus = async (bed: any) => {
    const newStatus = bed.status === 'available' ? 'maintenance' : 'available';
    try {
      await supabase.from('hospital_beds' as any)
        .update({ status: newStatus })
        .eq('id', bed.id);
      toast.success(`Bed ${bed.bed_number} set to ${newStatus}`);
      onRefresh();
    } catch {
      toast.error('Failed to update bed');
    }
  };

  // Group beds by department
  const bedsByDept = departments?.reduce((acc: any, dept: any) => {
    acc[dept.id] = {
      name: dept.name,
      beds: beds?.filter((b: any) => b.department_id === dept.id) || []
    };
    return acc;
  }, {} as Record<string, { name: string; beds: any[] }>) || {};

  const statusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500/20 border-green-500/30 text-green-700 dark:text-green-400';
      case 'occupied': return 'bg-primary/20 border-primary/30 text-primary';
      case 'maintenance': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-700 dark:text-yellow-400';
      default: return 'bg-muted border-border';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Ward & Bed Management</CardTitle>
            <Button onClick={() => setShowAddBed(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Bed
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500/40" /> Available</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-primary/40" /> Occupied</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-500/40" /> Maintenance</div>
          </div>

          {Object.entries(bedsByDept).map(([deptId, data]: [string, any]) => (
            <div key={deptId} className="mb-6">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                {data.name}
                <Badge variant="outline" className="text-[10px]">{data.beds.length} beds</Badge>
              </h4>
              {data.beds.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {data.beds.map((bed: any) => (
                    <div
                      key={bed.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${statusColor(bed.status)}`}
                      onClick={() => bed.status !== 'occupied' && toggleBedStatus(bed)}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <Bed className="h-3 w-3" />
                        <span className="font-mono font-bold text-xs">{bed.bed_number}</span>
                      </div>
                      <p className="text-[10px] capitalize">{bed.bed_type}</p>
                      {bed.room_number && <p className="text-[10px]">Room {bed.room_number}</p>}
                      <Badge variant="outline" className="text-[9px] mt-1 capitalize">{bed.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No beds in this department</p>
              )}
            </div>
          ))}

          {(!departments || departments.length === 0) && (
            <div className="text-center py-8">
              <Bed className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Add departments first to manage beds</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddBed} onOpenChange={setShowAddBed}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Bed</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bed Number *</Label>
                <Input value={bedForm.bedNumber} onChange={e => setBedForm(p => ({ ...p, bedNumber: e.target.value }))} placeholder="e.g., B-101" />
              </div>
              <div className="space-y-2">
                <Label>Bed Type</Label>
                <Select value={bedForm.bedType} onValueChange={v => setBedForm(p => ({ ...p, bedType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['general', 'semi-private', 'private', 'icu', 'nicu', 'picu', 'isolation', 'maternity'].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select value={bedForm.departmentId} onValueChange={v => setBedForm(p => ({ ...p, departmentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments?.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Room Number</Label>
                <Input value={bedForm.roomNumber} onChange={e => setBedForm(p => ({ ...p, roomNumber: e.target.value }))} placeholder="e.g., 101" />
              </div>
              <div className="space-y-2">
                <Label>Floor</Label>
                <Input type="number" value={bedForm.floorNumber} onChange={e => setBedForm(p => ({ ...p, floorNumber: e.target.value }))} placeholder="e.g., 1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBed(false)}>Cancel</Button>
            <Button onClick={addBed} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Bed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
