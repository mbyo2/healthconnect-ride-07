import { Header } from "@/components/Header";
import { ProviderMap } from "@/components/ProviderMap";
import { ProviderList } from "@/components/ProviderList";
import { Button } from "@/components/ui/button";
import { MapPin, List } from "lucide-react";
import { useState } from "react";
import { Provider } from "@/types/provider";

const mockProviders: Provider[] = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    specialty: "General Practitioner",
    rating: 4.9,
    location: [40.7589, -73.9851], // Manhattan coordinates
    availability: "Available Today",
    expertise: ["General Medicine", "Urgent Care", "Family Medicine"],
    image: "/placeholder.svg"
  },
  {
    id: "2",
    name: "Dr. Michael Chen",
    specialty: "Emergency Medicine",
    rating: 4.8,
    location: [40.6782, -73.9442], // Brooklyn coordinates
    availability: "Available Now",
    expertise: ["Emergency Medicine", "Trauma Care", "Critical Care"],
    image: "/placeholder.svg"
  },
  {
    id: "3",
    name: "Dr. Emily Williams",
    specialty: "Family Medicine",
    rating: 4.7,
    location: [40.7282, -73.7949], // Queens coordinates
    availability: "Available Today",
    expertise: ["Family Medicine", "Pediatrics", "Preventive Care"],
    image: "/placeholder.svg"
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