import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookingModal } from "@/components/BookingModal";

interface ProviderCardProps {
  provider: {
    id: string;
    first_name: string;
    last_name: string;
    specialty: string;
    bio?: string;
    avatar_url?: string;
    expertise?: string[];
    location?: {
      latitude: number;
      longitude: number;
    };
    consultation_fee?: number;
    default_service_id?: string;
  };
  onSelect: () => void;
}

const ProviderCard = ({ provider, onSelect }: ProviderCardProps) => {
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={provider.avatar_url || "/placeholder.svg"} alt={`${provider.first_name} ${provider.last_name}`} />
            <AvatarFallback>{provider.first_name?.[0]}{provider.last_name?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">Dr. {provider.first_name} {provider.last_name}</CardTitle>
            <CardDescription>{provider.specialty}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {provider.bio || `Dr. ${provider.first_name} ${provider.last_name} is a healthcare provider specializing in ${provider.specialty}.`}
        </p>
        
        <div className="flex flex-wrap gap-2 mt-3">
          {provider.expertise?.map((exp) => (
            <Badge key={exp} variant="outline" className="bg-secondary/50 text-secondary-foreground">
              {exp}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between p-4 pt-0">
        <Button variant="outline" size="sm" onClick={onSelect}>
          View Profile
        </Button>
        <Button size="sm" onClick={() => setShowBookingModal(true)}>
          Book Appointment
        </Button>
      </CardFooter>
      
      {showBookingModal && (
        <BookingModal 
          isOpen={showBookingModal} 
          onClose={() => setShowBookingModal(false)} 
          provider={provider} 
        />
      )}
    </Card>
  );
};

export default ProviderCard;
