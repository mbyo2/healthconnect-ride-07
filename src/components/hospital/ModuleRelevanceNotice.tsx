import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { facilityTypeLabel, type HmsModule, type ModuleRelevance } from "@/config/facilityProfiles";

interface ModuleRelevanceNoticeProps {
  facilityType?: string | null;
  facilityId?: string | null;
  module: HmsModule;
  moduleLabel: string;
  relevance: ModuleRelevance;
  children: React.ReactNode;
}

const storageKey = (facilityId?: string | null, module?: string) =>
  `dc:module-ack:${facilityId || "unknown"}:${module}`;

/**
 * Wraps an HMS module. When the module is not typical for this kind of
 * facility we explain that first, but never block it — the facility can
 * open it anyway and the choice is remembered.
 */
export const ModuleRelevanceNotice = ({
  facilityType,
  facilityId,
  module,
  moduleLabel,
  relevance,
  children,
}: ModuleRelevanceNoticeProps) => {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    try {
      setAcknowledged(localStorage.getItem(storageKey(facilityId, module)) === "1");
    } catch {
      setAcknowledged(false);
    }
  }, [facilityId, module]);

  if (relevance !== "atypical" || acknowledged) {
    return <>{children}</>;
  }

  const acknowledge = () => {
    try {
      localStorage.setItem(storageKey(facilityId, module), "1");
    } catch {
      /* storage may be unavailable */
    }
    setAcknowledged(true);
  };

  return (
    <div className="mx-auto max-w-2xl py-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Info className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold">{moduleLabel} is not usually part of a {facilityTypeLabel(facilityType).toLowerCase()}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Facilities like yours normally run without this section, so we keep it out of your
        way. If you do use it, open it and it will stay open from now on.
      </p>
      <Button className="mt-5" onClick={acknowledge}>
        Open {moduleLabel} anyway
      </Button>
    </div>
  );
};

export default ModuleRelevanceNotice;
