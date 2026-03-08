import { useClinicSpecialtyCatalog, type ClinicSpecialty } from "@/hooks/useClinicSpecialties";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";

interface SpecialtySelectorProps {
  selected: string[];
  primaryId?: string;
  onSelectionChange: (ids: string[]) => void;
  onPrimaryChange: (id: string) => void;
  disabled?: boolean;
}

export const SpecialtySelector = ({
  selected,
  primaryId,
  onSelectionChange,
  onPrimaryChange,
  disabled,
}: SpecialtySelectorProps) => {
  const { data: specialties, isLoading } = useClinicSpecialtyCatalog();

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      const next = selected.filter((s) => s !== id);
      onSelectionChange(next);
      if (primaryId === id && next.length) onPrimaryChange(next[0]);
    } else {
      const next = [...selected, id];
      onSelectionChange(next);
      if (!primaryId || !next.includes(primaryId)) onPrimaryChange(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading specialties…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">
        Clinic Specialties <span className="text-muted-foreground font-normal">(select all that apply)</span>
      </Label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {specialties?.map((s) => (
          <label
            key={s.id}
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors
              ${selected.includes(s.id) ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}
              ${disabled ? "opacity-50 pointer-events-none" : ""}`}
          >
            <Checkbox
              checked={selected.includes(s.id)}
              onCheckedChange={() => toggle(s.id)}
              disabled={disabled}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">{s.name}</span>
              {s.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>

      {selected.length > 1 && (
        <div className="space-y-2 pt-2">
          <Label className="text-sm font-semibold">Primary Specialty</Label>
          <RadioGroup value={primaryId} onValueChange={onPrimaryChange}>
            <div className="flex flex-wrap gap-2">
              {selected.map((sid) => {
                const spec = specialties?.find((s) => s.id === sid);
                if (!spec) return null;
                return (
                  <label key={sid} className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value={sid} disabled={disabled} />
                    <Badge variant={primaryId === sid ? "default" : "outline"} className="text-xs">
                      {spec.name}
                    </Badge>
                  </label>
                );
              })}
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );
};
