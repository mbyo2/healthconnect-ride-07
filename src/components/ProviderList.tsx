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
    <div className="min-h-screen">
      <div className="sticky top-14 z-40 bg-white border-b px-4 py-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search for healthcare providers..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <List className="h-4 w-4" />
            List
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            onClick={() => setViewMode('map')}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            Map
          </Button>
        </div>
      </div>

      <div className="px-4 py-4">
        {viewMode === 'map' ? (
          <div className="h-[calc(100vh-8.5rem)]">
            <ProviderMap />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {mockProviders.map((provider, index) => (
              <ProviderCard key={index} {...provider} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};