import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info } from 'lucide-react';
import type { HospitalPatient } from '@/hooks/useHospitalPatients';
import { InstitutionPatientPicker } from './InstitutionPatientPicker';
import type { InstitutionPatient, PatientSource } from '@/lib/patients';

interface Props {
  /** When provided, the roster picker (search + create-on-missing) is used. */
  institutionId?: string | null;
  patients?: HospitalPatient[];
  loading?: boolean;
  value: string;
  onChange: (id: string) => void;
  label?: string;
  /** Legacy empty-state copy — only used by the no-institution fallback. */
  emptyHint?: string;
  createSource?: PatientSource;
}

/**
 * Patient selector (Patient Unity W3). With an institution context this is
 * the ONE roster picker: it searches `search_institution_patients`
 * (roster ∪ clinical relationships) and — per the CEO's create-on-missing
 * rule — offers "+ Create patient" inline instead of telling staff to go
 * register the patient somewhere else first. The id-based value/onChange
 * contract of the old derivation-backed select is preserved so existing
 * forms keep working unchanged. Without an institution context it falls
 * back to the plain list select over `patients`.
 */
export const HospitalPatientSelect = ({
  institutionId,
  patients,
  loading,
  value,
  onChange,
  label = 'Patient',
  emptyHint = 'Register a patient in OPD Management (or admit one in IPD) first — they will then appear here.',
  createSource = 'registration',
}: Props) => {
  const [picked, setPicked] = useState<InstitutionPatient | null>(null);

  // Resolve the display object for the current id value: the object the
  // user just picked wins; otherwise fall back to the loaded list, then
  // to a minimal placeholder (the id is what the form actually stores).
  const resolved = useMemo<InstitutionPatient | null>(() => {
    if (!value) return null;
    if (picked && picked.id === value) return picked;
    const fromList = (patients || []).find((p) => p.id === value);
    if (fromList) {
      const parts = fromList.name.trim().split(/\s+/);
      return {
        id: fromList.id,
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' '),
        name: fromList.name,
        email: null,
        phone: null,
        dateOfBirth: null,
        onRoster: true,
        source: fromList.source,
      };
    }
    return {
      id: value,
      firstName: '',
      lastName: '',
      name: 'Selected patient',
      email: null,
      phone: null,
      dateOfBirth: null,
      onRoster: true,
      source: null,
    };
  }, [value, picked, patients]);

  if (institutionId) {
    return (
      <InstitutionPatientPicker
        institutionId={institutionId}
        value={resolved}
        onChange={(p) => {
          setPicked(p);
          onChange(p?.id ?? '');
        }}
        label={label}
        createSource={createSource}
      />
    );
  }

  const list = patients || [];
  if (!loading && list.length === 0) {
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
          {list.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
