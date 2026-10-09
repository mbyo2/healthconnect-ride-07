import {
  Stethoscope, HeartPulse, Baby, Sparkles, Flower2, Bone,
  Brain, BrainCircuit, Eye, Smile, Activity, Siren, LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { useSearch } from "@/context/SearchContext";
import { SpecialtyType } from "@/types/healthcare";
import { cn } from "@/lib/utils";

interface Tile {
  specialty: SpecialtyType | null; // null = "All specialties" (clears the filter)
  label: string;
  icon: LucideIcon;
}

// Visual specialty browsing (reference images 1+4): a tap sets the specialty
// filter and refreshes results. Tapping the active tile again clears it.
const TILES: Tile[] = [
  { specialty: null, label: "All", icon: LayoutGrid },
  { specialty: "General Practice", label: "General Practice", icon: Stethoscope },
  { specialty: "Cardiology", label: "Cardiology", icon: HeartPulse },
  { specialty: "Pediatrics", label: "Pediatrics", icon: Baby },
  { specialty: "Dermatology", label: "Dermatology", icon: Sparkles },
  { specialty: "Gynecology", label: "Gynecology", icon: Flower2 },
  { specialty: "Orthopedics", label: "Orthopedics", icon: Bone },
  { specialty: "Neurology", label: "Neurology", icon: Brain },
  { specialty: "Psychiatry", label: "Psychiatry", icon: BrainCircuit },
  { specialty: "Ophthalmology", label: "Eye Care", icon: Eye },
  { specialty: "General Dentistry", label: "Dental", icon: Smile },
  { specialty: "Internal Medicine", label: "Internal Med.", icon: Activity },
  { specialty: "Emergency Medicine", label: "Emergency", icon: Siren },
];

export function SpecialtyTiles() {
  const { selectedSpecialty, setSelectedSpecialty, refreshProviders } = useSearch();

  const handleTap = (tile: Tile) => {
    const next = tile.specialty === selectedSpecialty ? null : tile.specialty;
    setSelectedSpecialty(next);
    refreshProviders();
  };

  return (
    <section aria-label="Browse by specialty" className="vf-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-base text-midnight">Browse by specialty</h2>
        {selectedSpecialty && (
          <button
            onClick={() => { setSelectedSpecialty(null); refreshProviders(); }}
            className="text-xs font-bold text-primary-600 hover:text-primary-500 min-h-[32px] px-2"
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5" role="group" aria-label="Specialties">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          const isActive =
            tile.specialty === null
              ? !selectedSpecialty
              : selectedSpecialty === tile.specialty;
          return (
            <button
              key={tile.label}
              onClick={() => handleTap(tile)}
              aria-pressed={isActive}
              aria-label={`Filter by ${tile.label}`}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border-2 p-3 sm:p-4 min-h-[92px] transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isActive
                  ? "border-primary-500 bg-primary-500/10 shadow-sm"
                  : "border-canvas-silk dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary-500/50 hover:bg-primary-500/5"
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                  isActive
                    ? "bg-primary-500 text-white"
                    : "bg-primary-500/10 text-primary-600 dark:text-primary-400"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span
                className={cn(
                  "text-[11px] sm:text-xs font-bold text-center leading-tight",
                  isActive ? "text-primary-700 dark:text-primary-300" : "text-graphite-600 dark:text-slate-300"
                )}
              >
                {tile.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
