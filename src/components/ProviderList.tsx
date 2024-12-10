import { ProviderCard } from "./ProviderCard";
import { Input } from "@/components/ui/input";
import { Search, MapPin, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ProviderMap } from "./ProviderMap";

const mockProviders = [
  {
    name: "Dr. Sarah Johnson",
    specialty: "General Practitioner",
    rating: 4.9,
    location: "Manhattan, NY",
    availability: "Available Today",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Dr. Michael Chen",
    specialty: "Pediatrician",
    rating: 4.8,
    location: "Brooklyn, NY",
    availability: "Available Tomorrow",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Dr. Emily Williams",
    specialty: "Family Medicine",
    rating: 4.7,
    location: "Queens, NY",
    availability: "Available Today",
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=800",
  },
];

export const ProviderList = () => {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search for healthcare providers..."
              className="pl-10 py-6"
            />
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2"
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              onClick={() => setViewMode('map')}
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              Map
            </Button>
          </div>
        </div>

        {viewMode === 'map' ? (
          <ProviderMap />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockProviders.map((provider, index) => (
              <ProviderCard key={index} {...provider} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};