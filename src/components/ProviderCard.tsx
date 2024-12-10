import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock } from "lucide-react";

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
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="relative pb-0">
        <img
          src={image}
          alt={name}
          className="w-full h-48 object-cover rounded-t-lg"
        />
        <Badge className="absolute top-4 right-4 bg-primary text-white">
          {rating} <Star className="ml-1 w-4 h-4 inline" />
        </Badge>
      </CardHeader>
      <CardContent className="pt-4">
        <h3 className="text-xl font-semibold mb-2">{name}</h3>
        <p className="text-gray-600 mb-4">{specialty}</p>
        <div className="flex items-center text-gray-500 mb-2">
          <MapPin className="w-4 h-4 mr-2" />
          <span className="text-sm">{location}</span>
        </div>
        <div className="flex items-center text-gray-500 mb-4">
          <Clock className="w-4 h-4 mr-2" />
          <span className="text-sm">{availability}</span>
        </div>
        <Button className="w-full bg-primary hover:bg-primary/90">
          Book Appointment
        </Button>
      </CardContent>
    </Card>
  );
};