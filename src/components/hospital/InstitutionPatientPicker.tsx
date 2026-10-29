import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import {
  searchInstitutionPatients,
  type InstitutionPatient,
  type PatientSource,
} from "@/lib/patients";
import { PatientQuickCreateDialog } from "./PatientQuickCreateDialog";

interface Props {
  institutionId?: string | null;
  value: InstitutionPatient | null;
  onChange: (patient: InstitutionPatient | null) => void;
  label?: string;
  createSource?: PatientSource;
}

/**
 * The one patient picker (Patient Unity W2): searches the institution roster
 * ∪ established clinical relationships via search_institution_patients, and —
 * per the CEO's create-on-missing rule — always offers "+ Create patient",
 * which opens the quick-create modal over the current workflow and selects
 * the new record on save. Selecting a patient carries the master id, never
 * just the name.
 */
export const InstitutionPatientPicker = ({
  institutionId,
  value,
  onChange,
  label = "Patient",
  createSource = "registration",
}: Props) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InstitutionPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [openList, setOpenList] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!openList || !institutionId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchInstitutionPatients(institutionId, query));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, openList, institutionId]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpenList(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (value) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 dark:border-primary-800 dark:bg-primary-950/30">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{value.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[value.phone, value.dateOfBirth ? `DOB ${value.dateOfBirth}` : null]
                .filter(Boolean)
                .join(" · ") || "Linked patient record"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Change
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5" ref={wrapRef}>
      <Label>{label}</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpenList(true);
          }}
          onFocus={() => setOpenList(true)}
          placeholder="Search this facility's patients…"
          className="pl-8"
          disabled={!institutionId}
        />
        {openList && institutionId && (
          <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover shadow-md">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </div>
            ) : results.length > 0 ? (
              results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/60"
                  onClick={() => {
                    onChange(p);
                    setOpenList(false);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[p.phone, p.dateOfBirth ? `DOB ${p.dateOfBirth}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {p.onRoster ? (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">Roster</Badge>
                  ) : p.source ? (
                    <Badge variant="outline" className="shrink-0 text-[10px] capitalize">{p.source}</Badge>
                  ) : null}
                </button>
              ))
            ) : (
              <p className="px-3 py-2.5 text-sm text-muted-foreground">
                {query.trim()
                  ? `No patient matches “${query.trim()}”.`
                  : "No patients on this facility's roster yet."}
              </p>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2 border-t px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-muted/60"
              onClick={() => {
                setOpenList(false);
                setShowCreate(true);
              }}
            >
              <UserPlus className="h-4 w-4" />
              {query.trim() ? `Create patient “${query.trim()}”` : "Create new patient"}
            </button>
          </div>
        )}
      </div>
      {institutionId && (
        <PatientQuickCreateDialog
          institutionId={institutionId}
          open={showCreate}
          onOpenChange={setShowCreate}
          initialName={query}
          source={createSource}
          onCreated={(p) => onChange(p)}
        />
      )}
    </div>
  );
};
