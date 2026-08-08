import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info } from 'lucide-react';
import type { HospitalPatient } from '@/hooks/useHospitalPatients';

interface Props {
  patients: HospitalPatient[];
  loading?: boolean;
  value: string;
  onChange: (id: string) => void;
  label?: string;
  /** What the user must do first when no patient exists yet. */
  emptyHint?: string;
}

/**
 * Patient selector backed by real facility records. When the facility has no
 * patients yet it explains the prerequisite step instead of showing a dead control.
 */
export const HospitalPatientSelect = ({
  patients,
  loading,
  value,
  onChange,
  label = 'Patient',
  emptyHint = 'Register a patient in OPD Management (or admit one in IPD) first — they will then appear here.',
}: Props) => {
  if (!loading && patients.length === 0) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="flex gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">{emptyHint}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger>
          <SelectValue placeholder={loading ? 'Loading patients…' : 'Select a patient'} />
        </SelectTrigger>
        <SelectContent>
          {patients.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
