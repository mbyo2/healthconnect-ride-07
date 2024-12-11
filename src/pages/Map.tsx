import { Header } from "@/components/Header";
import { ProviderMap } from "@/components/ProviderMap";

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
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-14">
        <div className="h-[calc(100vh-8.5rem)]">
          <ProviderMap providers={mockProviders} />
        </div>
      </main>
    </div>
  );
};

export default Map;
