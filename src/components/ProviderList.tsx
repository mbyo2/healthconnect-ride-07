import { ProviderCard } from "./ProviderCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="relative mb-8">
        <Search className="absolute left-3 top-3 text-gray-400" />
        <Input
          placeholder="Search for healthcare providers..."
          className="pl-10 py-6"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProviders.map((provider, index) => (
          <ProviderCard key={index} {...provider} />
        ))}
      </div>
    </div>
  );
};