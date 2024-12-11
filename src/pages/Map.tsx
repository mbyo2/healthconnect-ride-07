import { Header } from "@/components/Header";
import { ProviderMap } from "@/components/ProviderMap";
import { ProviderList } from "@/components/ProviderList";
import { Button } from "@/components/ui/button";
import { MapPin, List } from "lucide-react";
import { useState } from "react";

const mockProviders = [
  {
    name: "Dr. Sarah Johnson",
    specialty: "General Practitioner",
    rating: 4.9,
    location: "Manhattan, NY",
    availability: "Available Today",
    expertise: ["General Medicine", "Urgent Care", "Family Medicine"]
  },
  {
    name: "Dr. Michael Chen",
    specialty: "Emergency Medicine",
    rating: 4.8,
    location: "Brooklyn, NY",
    availability: "Available Now",
    expertise: ["Emergency Medicine", "Trauma Care", "Critical Care"]
  },
  {
    name: "Dr. Emily Williams",
    specialty: "Family Medicine",
    rating: 4.7,
    location: "Queens, NY",
    availability: "Available Today",
    expertise: ["Family Medicine", "Pediatrics", "Preventive Care"]
  },
];

const Map = () => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-14">
        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              onClick={() => setViewMode('map')}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              Map View
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <List className="h-4 w-4" />
              List View
            </Button>
          </div>
          {viewMode === 'map' ? (
            <div className="h-[calc(100vh-8.5rem)]">
              <ProviderMap providers={mockProviders} />
            </div>
          ) : (
            <ProviderList />
          )}
        </div>
      </main>
    </div>
  );
};

export default Map;