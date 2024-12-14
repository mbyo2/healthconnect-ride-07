import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, Stethoscope, Calendar } from "lucide-react";
import { useState } from "react";
import { BookingModal } from "./BookingModal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ProviderCardProps {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  location: [number, number];
  availability?: string;
  image: string;
  price?: string;
  experience?: string;
  expertise?: string[];
}

export const ProviderCard = ({
  name,
  specialty,
  rating,
  location,
  availability = "Available Today",
  image,
  price = "$100/visit",
  experience = "5+ years",
}: ProviderCardProps) => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Format location for display
  const locationString = `${location[0].toFixed(2)}°N, ${location[1].toFixed(2)}°W`;

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={image} alt={name} className="object-cover" />
              <AvatarFallback>{name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{name}</h3>
                  <div className="flex items-center gap-2 text-primary">
                    <Stethoscope className="w-4 h-4" />
                    <span className="text-sm">{specialty}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  {rating} <Star className="w-3 h-3 fill-yellow-400" />
                </Badge>
              </div>
              
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-gray-500 text-sm">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{locationString}</span>
                </div>
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{availability}</span>
                </div>
                <div className="flex items-center text-gray-500 text-sm">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{experience}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="text-lg font-semibold text-primary">{price}</div>
            <Button 
              className="bg-primary hover:bg-primary/90"
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
        provider={{ name, specialty }}
      />
    </>
  );
};