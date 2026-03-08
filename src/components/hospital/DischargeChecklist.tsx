import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Clock, AlertTriangle, ClipboardCheck, Stethoscope, Pill, UserCheck, GraduationCap, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
  hospital: any;
  admissionId: string;
  patientId: string;
  onComplete?: () => void;
}

interface ChecklistItem {
  key: string;
  label: string;
  icon: any;
  clearedByField: string;
  clearedAtField: string;
}

const checklistItems: ChecklistItem[] = [
  { key: 'medical_clearance', label: 'Medical Clearance', icon: Stethoscope, clearedByField: 'medical_cleared_by', clearedAtField: 'medical_cleared_at' },
  { key: 'discharge_summary_clearance', label: 'Discharge Summary', icon: ClipboardCheck, clearedByField: 'summary_cleared_by', clearedAtField: 'summary_cleared_at' },
  { key: 'medication_reconciliation', label: 'Medication Reconciliation', icon: Pill, clearedByField: 'medication_reconciled_by', clearedAtField: 'medication_reconciled_at' },
  { key: 'nursing_clearance', label: 'Nursing Clearance', icon: UserCheck, clearedByField: 'nursing_cleared_by', clearedAtField: 'nursing_cleared_at' },
  { key: 'patient_education_completed', label: 'Patient/Caregiver Education', icon: GraduationCap, clearedByField: 'education_completed_by', clearedAtField: 'education_completed_at' },
  { key: 'billing_clearance', label: 'Billing Clearance', icon: DollarSign, clearedByField: 'billing_cleared_by', clearedAtField: 'billing_cleared_at' },
];

export const DischargeChecklist = ({ hospital, admissionId, patientId, onComplete }: Props) => {
  const queryClient = useQueryClient();
  const [staffName, setStaffName] = useState('');

  const { data: checklist } = useQuery({
    queryKey: ['discharge-checklist', admissionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('discharge_checklists' as any)
        .select('*')
        .eq('admission_id', admissionId)
        .maybeSingle();

      if (!data) {
        // Create checklist if not exists
        const { data: newChecklist } = await supabase
          .from('discharge_checklists' as any)
          .insert({
            hospital_id: hospital.id,
            admission_id: admissionId,
            patient_id: patientId,
          })
          .select()
          .single();
        return newChecklist as any;
      }
      return data as any;
    },
    enabled: !!admissionId,
  });

  const toggleItem = async (key: string, clearedByField: string, clearedAtField: string) => {
    if (!checklist) return;
    const currentValue = checklist[key];
    const updates: Record<string, any> = {
      [key]: !currentValue,
      [clearedByField]: !currentValue ? (staffName || 'Staff') : null,
      [clearedAtField]: !currentValue ? new Date().toISOString() : null,
    };

    // Check if all items are cleared
    const allKeys = checklistItems.map(i => i.key);
    const allCleared = allKeys.every(k => k === key ? !currentValue : checklist[k]);
    updates.all_cleared = allCleared;

    await supabase.from('discharge_checklists' as any).update(updates).eq('id', checklist.id);
    queryClient.invalidateQueries({ queryKey: ['discharge-checklist'] });

    if (allCleared) {
      toast.success('All discharge clearances completed!');
      onComplete?.();
    }
  };

  if (!checklist) return null;

  const completedCount = checklistItems.filter(i => checklist[i.key]).length;
  const progress = (completedCount / checklistItems.length) * 100;

  return (
    <Card className={checklist.all_cleared ? 'border-emerald-500' : 'border-amber-500/50'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardCheck className={`h-4 w-4 ${checklist.all_cleared ? 'text-emerald-500' : 'text-amber-500'}`} />
            Discharge Checklist
          </CardTitle>
          <Badge variant={checklist.all_cleared ? 'default' : 'secondary'} className="text-[10px]">
            {completedCount}/{checklistItems.length}
          </Badge>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="mb-3">
          <Label className="text-[10px]">Staff Name (for sign-off)</Label>
          <Input value={staffName} onChange={e => setStaffName(e.target.value)} placeholder="Your name" className="h-7 text-xs" />
        </div>
        {checklistItems.map(item => {
          const Icon = item.icon;
          const isChecked = !!checklist[item.key];
          return (
            <div key={item.key}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${isChecked ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'hover:bg-accent/50'}`}
              onClick={() => toggleItem(item.key, item.clearedByField, item.clearedAtField)}
              role="button" tabIndex={0}>
              <div className="flex items-center gap-3">
                <Checkbox checked={isChecked} />
                <Icon className={`h-4 w-4 ${isChecked ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                <div>
                  <span className={`text-xs font-medium ${isChecked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item.label}</span>
                  {isChecked && checklist[item.clearedByField] && (
                    <p className="text-[10px] text-muted-foreground">
                      By: {checklist[item.clearedByField]} • {new Date(checklist[item.clearedAtField]).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              {isChecked ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
