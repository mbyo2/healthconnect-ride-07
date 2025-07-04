import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MapPin, Star, Clock, Phone } from "lucide-react";
import { useLocation } from "react-router-dom";

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const location = useLocation();

  // Sample data - in real app this would come from API
  const searchResults = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      specialty: "Cardiologist",
      rating: 4.8,
      distance: "0.5 miles",
      availableToday: true,
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=face"
    },
    {
      id: 2,
      name: "City General Hospital",
      specialty: "Emergency Care",
      rating: 4.6,
      distance: "1.2 miles",
      availableToday: true,
      image: "https://images.unsplash.com/photo-1587351021355-a479a299d2f9?w=100&h=100&fit=crop"
    },
    {
      id: 3,
      name: "Dr. Michael Chen",
      specialty: "Pediatrician",
      rating: 4.9,
      distance: "2.1 miles",
      availableToday: false,
      image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face"
    }
  ];

  const filters = [
    { id: "all", label: "All", count: 12 },
    { id: "doctors", label: "Doctors", count: 8 },
    { id: "hospitals", label: "Hospitals", count: 3 },
    { id: "clinics", label: "Clinics", count: 4 }
  ];

  useEffect(() => {
    // Get search query from URL params if coming from header search
    const urlParams = new URLSearchParams(location.search);
    const query = urlParams.get('q');
    if (query) {
      setSearchQuery(query);
    }
  }, [location]);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-trust-600 to-trust-400 bg-clip-text text-transparent">
            Find Care
          </h1>
          <p className="text-muted-foreground">
            Search for doctors, hospitals, and clinics near you
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search doctors, specialties, hospitals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 border-trust-200 focus:border-trust-400"
          />
          <Button size="icon" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <Button
            key={filter.id}
            variant={selectedFilter === filter.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter(filter.id)}
            className="whitespace-nowrap"
          >
            {filter.label} ({filter.count})
          </Button>
        ))}
      </div>

      {/* Search Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Search Results</h2>
          <Button variant="ghost" size="sm">
            <MapPin className="h-4 w-4 mr-1" />
            Map View
          </Button>
        </div>

        {searchResults.map((result) => (
          <Card key={result.id} className="border-trust-100 hover:shadow-trust-lg transition-all duration-200 cursor-pointer">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <img
                  src={result.image}
                  alt={result.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-trust-700">{result.name}</h3>
                      <p className="text-sm text-muted-foreground">{result.specialty}</p>
                    </div>
                    {result.availableToday && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        <Clock className="h-3 w-3 mr-1" />
                        Today
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {result.rating}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {result.distance}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1">
                      Book Now
                    </Button>
                    <Button size="sm" variant="outline">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SearchPage;