import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, Stethoscope, Calendar } from "lucide-react";
import { useState } from "react";
import { BookingModal } from "./BookingModal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Provider } from "@/types/provider";

export const ProviderCard = ({
  id,
  first_name,
  last_name,
  specialty,
  rating,
  location,
  availability = "Available Today",
  avatar_url,
  expertise = [],
}: Provider) => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const name = `${first_name} ${last_name}`;

  // Format location for display
  const locationString = location ? `${location[0].toFixed(2)}°N, ${location[1].toFixed(2)}°W` : "Location not available";

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-white/80 backdrop-blur-sm border-gray-200/80">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Avatar className="w-24 h-24 rounded-xl border-2 border-primary/10">
              <AvatarImage src={avatar_url} alt={name} className="object-cover" />
              <AvatarFallback className="bg-primary/5 text-primary font-semibold">
                {first_name[0]}{last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {name}
                  </h3>
                  <div className="flex items-center gap-2 text-primary/80">
                    <Stethoscope className="w-4 h-4" />
                    <span className="text-sm">{specialty}</span>
                  </div>
                </div>
                {rating && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-50">
                    {rating} <Star className="w-3 h-3 fill-yellow-400 stroke-yellow-400" />
                  </Badge>
                )}
              </div>
              
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-gray-500 text-sm">
                  <MapPin className="w-4 h-4 mr-1 text-primary/60" />
                  <span>{locationString}</span>
                </div>
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="w-4 h-4 mr-1 text-primary/60" />
                  <span>{availability}</span>
                </div>
              </div>
            </div>
          </div>
          
          {expertise && expertise.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {expertise.map((exp, index) => (
                <Badge key={index} variant="outline" className="bg-primary/5">
                  {exp}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="mt-4 flex items-center justify-end">
            <Button 
              className="bg-primary hover:bg-primary/90 transition-colors"
              onClick={() => setIsBookingModalOpen(true)}
            >
              Book Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        provider={{ id, name, specialty: specialty || '' }}
      />
    </>
  );
};