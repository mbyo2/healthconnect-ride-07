import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DeptProps {
  hospital: any;
  departments: any[];
  onRefresh: () => void;
}

export const DepartmentManagement = ({ hospital, departments, onRefresh }: DeptProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', code: '', bedCapacity: '10', description: ''
  });

  const addDepartment = async () => {
    if (!form.name || !form.code) {
      toast.error('Please fill required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('hospital_departments' as any).insert({
        hospital_id: hospital.id,
        name: form.name,
        code: form.code.toUpperCase(),
        bed_capacity: parseInt(form.bedCapacity) || 10,
        description: form.description || null
      });
      if (error) throw error;
      toast.success(`Department "${form.name}" added`);
      setForm({ name: '', code: '', bedCapacity: '10', description: '' });
      setShowDialog(false);
      onRefresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to add department');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Department Management</CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Department
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {departments && departments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept: any) => (
                <Card key={dept.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{dept.name}</CardTitle>
                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{dept.code}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Capacity: {dept.bed_capacity} beds</p>
                    {dept.description && (
                      <p className="text-xs text-muted-foreground mt-2">{dept.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No departments configured yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add departments to organize your hospital operations</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Cardiology" />
              </div>
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g., CARD" className="uppercase" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bed Capacity</Label>
              <Input type="number" value={form.bedCapacity} onChange={e => setForm(p => ({ ...p, bedCapacity: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Department description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={addDepartment} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
