import { Provider } from "@/types/provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, CalendarPlus, Video, CheckCircle, Clock } from "lucide-react";
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

  const handleBookNow = (e: React.MouseEvent, providerId: string) => {
    e.stopPropagation();
    navigate(`/provider/${providerId}`);
  };

  if (providers.length === 0) {
    return (
      <Card className="p-8 text-center bg-muted/30">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No providers found</h3>
          <p className="text-muted-foreground text-sm">
            Try adjusting your search filters or expanding your search area.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {providers.map((provider) => (
        <Card
          key={provider.id}
          className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
            selectedProvider?.id === provider.id
              ? "ring-2 ring-primary border-primary"
              : "hover:border-primary/50"
          }`}
          onClick={() => onProviderSelect?.(provider)}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Provider Image */}
            <div className="flex-shrink-0">
              {provider.avatar_url ? (
                <img
                  src={provider.avatar_url}
                  alt={`Dr. ${provider.first_name} ${provider.last_name}`}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                  {provider.first_name?.[0]}{provider.last_name?.[0]}
                </div>
              )}
            </div>

            {/* Provider Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">
                    Dr. {provider.first_name} {provider.last_name}
                  </h3>
                  <p className="text-primary font-medium text-sm">{provider.specialty || 'General Practitioner'}</p>
                </div>
                
                {/* Rating Badge */}
                {provider.rating && (
                  <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    {provider.rating.toFixed(1)}
                  </Badge>
                )}
              </div>

              {/* Quick Info Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Video className="h-3 w-3 mr-1" />
                  Video Visits
                </Badge>
                {provider.distance !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    {provider.distance.toFixed(1)} km
                  </Badge>
                )}
              </div>

              {/* Bio Preview */}
              {provider.bio && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {provider.bio}
                </p>
              )}

              {/* Expertise Tags */}
              {provider.expertise && provider.expertise.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {provider.expertise.slice(0, 3).map((exp) => (
                    <span
                      key={exp}
                      className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full"
                    >
                      {exp}
                    </span>
                  ))}
                  {provider.expertise.length > 3 && (
                    <span className="text-xs text-muted-foreground px-2 py-1">
                      +{provider.expertise.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Availability & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                <div className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Available Today</span>
                </div>
                
                <div className="flex gap-2">
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
                  <Button 
                    size="sm"
                    onClick={(e) => handleBookNow(e, provider.id)}
                    className="gap-1"
                  >
                    <CalendarPlus className="h-3 w-3" />
                    Book Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
