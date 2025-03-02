
import { Provider } from "@/types/provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProviderListProps {
  providers: Provider[];
  onProviderSelect?: (provider: Provider) => void;
  selectedProvider?: Provider | null;
}

export const ProviderList = ({ providers, onProviderSelect, selectedProvider }: ProviderListProps) => {
  const navigate = useNavigate();

  const handleViewProfile = (providerId: string) => {
    navigate(`/provider/${providerId}`);
  };

  return (
    <div className="space-y-4">
      {providers.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">No providers found matching your criteria.</p>
        </Card>
      ) : (
        providers.map((provider) => (
          <Card
            key={provider.id}
            className={`p-4 cursor-pointer transition-colors ${
              selectedProvider?.id === provider.id
                ? "border-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => onProviderSelect?.(provider)}
          >
            <div className="flex items-start gap-4">
              {provider.avatar_url ? (
                <img
                  src={provider.avatar_url}
                  alt={`Dr. ${provider.first_name} ${provider.last_name}`}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold">
                  {provider.first_name[0]}{provider.last_name[0]}
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold">
                  Dr. {provider.first_name} {provider.last_name}
                </h3>
                <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                {provider.bio && (
                  <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                    {provider.bio}
                  </p>
                )}
                {provider.expertise && provider.expertise.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {provider.expertise.map((exp) => (
                      <span
                        key={exp}
                        className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm">
                  {provider.distance !== undefined && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{provider.distance} km</span>
                    </div>
                  )}
                  {provider.rating && (
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-amber-500" />
                      <span>{provider.rating}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProfile(provider.id);
                }}
              >
                View Profile
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
