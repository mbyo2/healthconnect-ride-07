import { ProviderCard } from "./ProviderCard";
import { Input } from "@/components/ui/input";
import { Search, MapPin, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ProviderMap } from "./ProviderMap";
import { Provider } from "@/types/provider";

interface ProviderListProps {
  symptoms?: string;
  urgency?: string;
}

const mockProviders: Provider[] = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    specialty: "General Practitioner",
    rating: 4.9,
    location: [40.7589, -73.9851], // Manhattan coordinates
    availability: "Available Today",
    expertise: ["General Medicine", "Urgent Care", "Family Medicine"]
  },
  {
    id: "2",
    name: "Dr. Michael Chen",
    specialty: "Emergency Medicine",
    rating: 4.8,
    location: [40.6782, -73.9442], // Brooklyn coordinates
    availability: "Available Now",
    expertise: ["Emergency Medicine", "Trauma Care", "Critical Care"]
  },
  {
    id: "3",
    name: "Dr. Emily Williams",
    specialty: "Family Medicine",
    rating: 4.7,
    location: [40.7282, -73.7949], // Queens coordinates
    availability: "Available Today",
    expertise: ["Family Medicine", "Pediatrics", "Preventive Care"]
  },
];

export const ProviderList = ({ symptoms = "", urgency = "non-urgent" }: ProviderListProps) => {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [filteredProviders, setFilteredProviders] = useState(mockProviders);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Filter providers based on symptoms and urgency
    let filtered = [...mockProviders];
    
    if (urgency === "emergency") {
      filtered = filtered.filter(provider => 
        provider.expertise.includes("Emergency Medicine") || 
        provider.availability === "Available Now"
      );
    }

    if (symptoms) {
      // Simple keyword matching (in a real app, this would be more sophisticated)
      filtered = filtered.filter(provider =>
        provider.expertise.some(exp => 
          symptoms.toLowerCase().includes(exp.toLowerCase())
        )
      );
    }

    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(provider =>
        provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.specialty.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProviders(filtered);
  }, [symptoms, urgency, searchTerm]);

  return (
    <div className="min-h-screen">
      <div className="sticky top-14 z-40 bg-white border-b px-4 py-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search for healthcare providers..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
            <ProviderMap providers={filteredProviders} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredProviders.map((provider, index) => (
              <ProviderCard key={index} {...provider} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
