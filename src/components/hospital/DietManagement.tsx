import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Utensils, AlertTriangle, CheckCircle2, Plus, Loader2 } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { usePatientNames } from '@/hooks/usePatientNames';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const DietManagement = ({ hospital }: { hospital: any }) => {
  const [showPrescribeDiet, setShowPrescribeDiet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    patient_name: '',
    diet_type: 'Regular',
    restrictions: '',
    allergies: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
    calories_per_day: '',
    meals_per_day: '3',
  });

  const { data: plans, loading, error, refresh } = useHospitalModule<any>(
    'diet_plans', 'hospital_id', hospital?.id, { orderBy: 'start_date', ascending: false }
  );
  const { nameFor } = usePatientNames(plans.map(p => p.patient_id));

  const today = new Date().toISOString().slice(0, 10);
  const activePlans = plans.filter(p => !p.end_date || p.end_date >= today);
  const withAllergies = plans.filter(p => p.allergies && String(p.allergies).trim().length > 0);

  const asList = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String);
    return String(value).split(',').map(s => s.trim()).filter(Boolean);
  };

  const handlePrescribeDiet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.diet_type || !form.start_date) return;
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from('diet_plans' as any) as any).insert({
        hospital_id: hospital.id,
        diet_type: form.diet_type,
        restrictions: form.restrictions ? form.restrictions.split(',').map(s => s.trim()) : [],
        allergies: form.allergies,
        start_date: form.start_date,
        end_date: form.end_date || null,
        notes: form.notes,
        calories_per_day: form.calories_per_day ? Number(form.calories_per_day) : null,
        meals_per_day: Number(form.meals_per_day) || 3,
      });
      if (err) throw err;
      toast.success('Diet plan prescribed successfully');
      setShowPrescribeDiet(false);
      setForm({ patient_name: '', diet_type: 'Regular', restrictions: '', allergies: '', start_date: new Date().toISOString().split('T')[0], end_date: '', notes: '', calories_per_day: '', meals_per_day: '3' });
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to prescribe diet plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Diet & Nutrition</h3>
          <p className="text-sm text-muted-foreground">Prescribed inpatient diet plans and restrictions</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
          <Button size="sm" onClick={() => setShowPrescribeDiet(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Prescribe Diet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Utensils className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{activePlans.length}</p>
          <p className="text-xs text-muted-foreground">Active Plans</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{withAllergies.length}</p>
          <p className="text-xs text-muted-foreground">With Allergies</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{plans.length}</p>
          <p className="text-xs text-muted-foreground">Total Plans</p>
        </CardContent></Card>
      </div>

      {loading ? (
        <ListSkeleton count={4} variant="row" />
      ) : error ? (
        <EmptyState icon={Utensils} title="Could not load diet plans" description={error} actionLabel="Retry" onAction={refresh} />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No diet plans prescribed"
          description="Prescribe a diet plan for admitted inpatients."
          actionLabel="Prescribe Diet"
          onAction={() => setShowPrescribeDiet(true)}
        />
      ) : (
        <div className="space-y-3">
          {plans.map(p => (
            <Card key={p.id}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground">{nameFor(p.patient_id) || 'Hospital Patient'}</span>
                  <Badge variant="secondary" className="text-[10px]">{p.diet_type || 'Regular'}</Badge>
                  {(!p.end_date || p.end_date >= today) && <Badge variant="default" className="text-[10px]">Active</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  From {p.start_date || '—'}{p.end_date ? ` to ${p.end_date}` : ''}
                  {p.calories_per_day ? ` • ${p.calories_per_day} kcal/day` : ''}
                  {p.meals_per_day ? ` • ${p.meals_per_day} meals/day` : ''}
                </p>
                {asList(p.restrictions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {asList(p.restrictions).map((r, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px]">{r}</Badge>
                    ))}
                  </div>
                )}
                {p.allergies && (
                  <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Allergies: {asList(p.allergies).join(', ')}
                  </p>
                )}
                {p.notes && <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Prescribe Diet Dialog */}
      <Dialog open={showPrescribeDiet} onOpenChange={setShowPrescribeDiet}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Prescribe Diet Plan</DialogTitle></DialogHeader>
          <form onSubmit={handlePrescribeDiet} className="space-y-3 py-2">
            <div>
              <Label>Diet Type *</Label>
              <select className="w-full h-10 border rounded-md px-3 bg-background text-sm" value={form.diet_type} onChange={e => setForm({...form, diet_type: e.target.value})}>
                {['Regular', 'Low Sodium', 'Diabetic / Low Sugar', 'Low Fat', 'High Protein', 'Renal Diet', 'Liquid Diet', 'Soft Diet', 'Nil By Mouth (NBM)', 'Vegetarian', 'Kosher / Halal'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} required />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Calories/Day</Label>
                <Input type="number" value={form.calories_per_day} onChange={e => setForm({...form, calories_per_day: e.target.value})} placeholder="e.g. 1800" />
              </div>
              <div>
                <Label>Meals/Day</Label>
                <Input type="number" value={form.meals_per_day} onChange={e => setForm({...form, meals_per_day: e.target.value})} placeholder="3" />
              </div>
            </div>
            <div>
              <Label>Food Restrictions (comma separated)</Label>
              <Input value={form.restrictions} onChange={e => setForm({...form, restrictions: e.target.value})} placeholder="e.g. No red meat, No dairy" />
            </div>
            <div>
              <Label>Known Allergies</Label>
              <Input value={form.allergies} onChange={e => setForm({...form, allergies: e.target.value})} placeholder="e.g. Peanuts, Shellfish" />
            </div>
            <div>
              <Label>Additional Notes</Label>
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Dietitian notes or meal timing instructions" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowPrescribeDiet(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Prescribe Diet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
