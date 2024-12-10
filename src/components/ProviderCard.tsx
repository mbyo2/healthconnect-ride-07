import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { BookingModal } from "./BookingModal";

interface ProviderCardProps {
  name: string;
  specialty: string;
  rating: number;
  location: string;
  availability: string;
  image: string;
}

export const ProviderCard = ({
  name,
  specialty,
  rating,
  location,
  availability,
  image,
}: ProviderCardProps) => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex gap-4 p-4">
          <img
            src={image}
            alt={name}
            className="w-20 h-20 object-cover rounded-lg"
          />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{name}</h3>
                <p className="text-sm text-gray-600">{specialty}</p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                {rating} <Star className="w-3 h-3" />
              </Badge>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center text-gray-500 text-sm">
                <MapPin className="w-4 h-4 mr-1" />
                <span>{location}</span>
              </div>
              <div className="flex items-center text-gray-500 text-sm">
                <Clock className="w-4 h-4 mr-1" />
                <span>{availability}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">
          <Button 
            className="w-full"
            onClick={() => setIsBookingModalOpen(true)}
          >
            Book Appointment
          </Button>
        </div>
      </Card>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        provider={{ name, specialty }}
      />
    </>
  );
};