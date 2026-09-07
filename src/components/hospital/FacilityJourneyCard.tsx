import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFacilityProfile } from "@/config/facilityProfiles";

interface FacilityJourneyCardProps {
  facilityType?: string | null;
}

/**
 * Shows the patient journey this kind of facility runs, so staff know the
 * expected order of steps in their workspace.
 */
export const FacilityJourneyCard = ({ facilityType }: FacilityJourneyCardProps) => {
  const profile = getFacilityProfile(facilityType);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">How patients move through your facility</CardTitle>
          <Badge variant="secondary">{profile.label}</Badge>
        </div>
        <CardDescription>{profile.summary}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {profile.journey.map((step, i) => (
            <li key={step} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};

export default FacilityJourneyCard;
