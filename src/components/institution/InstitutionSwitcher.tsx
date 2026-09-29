import { Building2, Check, ChevronDown, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { InstitutionAffiliation } from "@/hooks/useInstitutionContext";

interface Props {
  affiliations: InstitutionAffiliation[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  /** 'dark' for dark banners (pharmacy portal), 'light' for light pages. */
  tone?: "dark" | "light";
}

/**
 * Workspace switcher for users affiliated with more than one institution —
 * e.g. a pharmacist who owns their own auto-provisioned pharmacy and was also
 * invited as staff at another pharmacy. Hidden when there is only one.
 */
export const InstitutionSwitcher = ({ affiliations, activeId, onSwitch, tone = "dark" }: Props) => {
  if (affiliations.length < 2) return null;
  const active = affiliations.find((a) => a.id === activeId) ?? affiliations[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={
            tone === "dark"
              ? "gap-2 max-w-[240px] bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
              : "gap-2 max-w-[240px]"
          }
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate text-xs font-semibold">{active.name}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs">Switch workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {affiliations.map((a) => (
          <DropdownMenuItem
            key={a.id}
            onClick={() => a.id !== active.id && onSwitch(a.id)}
            className="flex items-start gap-2 cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">{a.name}</span>
                {a.id === active.id && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {a.type.replace(/_/g, " ")}
                </Badge>
                <Badge
                  variant={a.affiliation === "admin" ? "default" : "outline"}
                  className="text-[10px] capitalize"
                >
                  {a.affiliation === "admin" ? (
                    "Owner"
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      {a.staffRole ? a.staffRole.replace(/_/g, " ") : "Staff"}
                    </span>
                  )}
                </Badge>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
