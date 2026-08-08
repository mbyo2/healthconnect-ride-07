import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Utensils, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { usePatientNames } from '@/hooks/usePatientNames';

export const DietManagement = ({ hospital }: { hospital: any }) => {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Diet & Nutrition</h3>
          <p className="text-sm text-muted-foreground">Prescribed inpatient diet plans and restrictions</p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
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
        <EmptyState icon={Utensils} title="No diet plans prescribed" description="Diet orders raised for admitted patients appear here." />
      ) : (
        <div className="space-y-3">
          {plans.map(p => (
            <Card key={p.id}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground">{nameFor(p.patient_id)}</span>
                  <Badge variant="secondary" className="text-[10px]">{p.diet_type || 'Regular'}</Badge>
                  {(!p.end_date || p.end_date >= today) && <Badge variant="default" className="text-[10px]">Active</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  From {p.start_date || '—'}{p.end_date ? ` to ${p.end_date}` : ''}
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
    </div>
  );
};
