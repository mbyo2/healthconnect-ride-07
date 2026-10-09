import { useState } from 'react';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInstitutionContext } from '@/hooks/useInstitutionContext';

export const InstitutionSwitcher = () => {
  const { institution, affiliations, switchInstitution } = useInstitutionContext();
  const [open, setOpen] = useState(false);

  // Only show if user has multiple affiliations
  if (affiliations.length <= 1) return null;

  const handleSwitch = (institutionId: string) => {
    switchInstitution(institutionId);
    setOpen(false);
    // Reload to ensure all components pick up the new institution
    window.location.reload();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-2 px-3 rounded-pill border border-canvas-silk dark:border-slate-700 hover:bg-canvas-bone dark:hover:bg-slate-800"
          aria-label="Switch institution"
        >
          <Building2 className="h-4 w-4 text-primary-500" />
          <span className="max-w-[120px] truncate text-xs font-medium hidden sm:inline">
            {institution?.name || 'Select institution'}
          </span>
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-semibold">
          Switch workspace
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {affiliations.map((affil) => (
          <DropdownMenuItem
            key={affil.id}
            onClick={() => handleSwitch(affil.id)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{affil.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{affil.affiliation}</p>
            </div>
            {institution?.id === affil.id && (
              <Check className="h-4 w-4 text-primary-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
