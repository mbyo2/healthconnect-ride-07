import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Search, X } from "lucide-react";

export interface EntityOption {
  id: string;
  label: string;
  sublabel?: string;
}

export interface EntityCreateDialogContext {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The search text the user typed — prefill for the create form. */
  initialTerm: string;
  /** Call with the created record; the select adopts it and closes. */
  onCreated: (option: EntityOption) => void;
}

interface EntitySelectProps {
  label?: string;
  placeholder?: string;
  value: EntityOption | null;
  onChange: (option: EntityOption | null) => void;
  /** Debounced search; receives the current term (may be empty). */
  search: (term: string) => Promise<EntityOption[]>;
  /** Human name of the entity, e.g. "priced service" — used in copy. */
  entityName: string;
  /**
   * Create-on-missing (CEO Odoo rule, 2026-10-29): when provided, a
   * "+ Create <entity>" row is always offered; it opens this dialog in a
   * modal over the current form and resumes with the new record selected.
   */
  renderCreateDialog?: (ctx: EntityCreateDialogContext) => ReactNode;
  /**
   * Shown in place of the create affordance when this user may not create
   * the entity — plain language saying who can add it (never a raw error).
   */
  createUnavailableNote?: string;
  /** Let the user commit the typed term itself as a free-text value. */
  allowFreeText?: boolean;
  disabled?: boolean;
}

/**
 * The reusable create-on-missing select (Patient Unity W4). Modelled on
 * DepartmentSelect's inline create and the InstitutionPatientPicker:
 * search first; on no match, offer "+ Create <entity>: '<term>'" which
 * opens creation in a modal over the current workflow; on save the new
 * record is auto-selected and the workflow continues — never a dead-end.
 */
export const EntitySelect = ({
  label,
  placeholder,
  value,
  onChange,
  search,
  entityName,
  renderCreateDialog,
  createUnavailableNote,
  allowFreeText = false,
  disabled = false,
}: EntitySelectProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [openList, setOpenList] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!openList || disabled) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await search(query));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, openList, disabled]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpenList(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const term = query.trim();
  const exactMatch = term
    ? results.some((r) => r.label.toLowerCase() === term.toLowerCase())
    : false;

  if (value) {
    return (
      <div className="space-y-1.5">
        {label && <Label>{label}</Label>}
        <div className="flex items-center justify-between gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 dark:border-primary-800 dark:bg-primary-950/30">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{value.label}</p>
            {value.sublabel && (
              <p className="truncate text-xs text-muted-foreground">{value.sublabel}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            disabled={disabled}
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
      {label && <Label>{label}</Label>}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpenList(true);
          }}
          onFocus={() => setOpenList(true)}
          placeholder={placeholder || `Search ${entityName}…`}
          className="pl-8"
          disabled={disabled}
        />
        {openList && !disabled && (
          <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover shadow-md">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </div>
            ) : results.length > 0 ? (
              results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/60"
                  onClick={() => {
                    onChange(r);
                    setOpenList(false);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{r.label}</span>
                    {r.sublabel && (
                      <span className="block truncate text-xs text-muted-foreground">{r.sublabel}</span>
                    )}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2.5 text-sm text-muted-foreground">
                {term
                  ? `No ${entityName} matches “${term}”.`
                  : `No ${entityName} records yet.`}
              </p>
            )}
            {allowFreeText && term && !exactMatch && (
              <button
                type="button"
                className="flex w-full items-center gap-2 border-t px-3 py-2.5 text-left text-sm hover:bg-muted/60"
                onClick={() => {
                  onChange({ id: term, label: term });
                  setOpenList(false);
                }}
              >
                Use “{term}”
              </button>
            )}
            {renderCreateDialog ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 border-t px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-muted/60"
                onClick={() => {
                  setOpenList(false);
                  setShowCreate(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {term ? `Create ${entityName}: “${term}”` : `Create new ${entityName}`}
              </button>
            ) : createUnavailableNote ? (
              <p className="border-t px-3 py-2.5 text-xs text-muted-foreground">
                {createUnavailableNote}
              </p>
            ) : null}
          </div>
        )}
      </div>
      {renderCreateDialog?.({
        open: showCreate,
        onOpenChange: setShowCreate,
        initialTerm: term,
        onCreated: (option) => {
          setShowCreate(false);
          onChange(option);
        },
      })}
    </div>
  );
};

export default EntitySelect;
