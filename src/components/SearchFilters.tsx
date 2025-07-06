import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearch } from "@/context/SearchContext";
import { HealthcareProviderType, SpecialtyType, InsuranceProvider } from "@/types/healthcare";
import { Filter, MapPin } from "lucide-react";
import { useState } from "react";

export const SearchFilters = () => {
  const {
    selectedType,
    setSelectedType,
    selectedSpecialty,
    setSelectedSpecialty,
    selectedInsurance,
    setSelectedInsurance,
    maxDistance,
    setMaxDistance,
    useUserLocation,
    setUseUserLocation,
    refreshProviders
  } = useSearch();

  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = () => {
    refreshProviders();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
        
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Switch
            checked={useUserLocation}
            onCheckedChange={setUseUserLocation}
          />
          <Label className="text-sm">Use my location</Label>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Provider Type */}
              <div className="space-y-2">
                <Label>Provider Type</Label>
                <Select
                  value={selectedType || ""}
                  onValueChange={(value) => {
                    setSelectedType(value as HealthcareProviderType);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="clinic">Clinic</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Specialty */}
              <div className="space-y-2">
                <Label>Specialty</Label>
                <Select
                  value={selectedSpecialty || ""}
                  onValueChange={(value) => {
                    setSelectedSpecialty(value as SpecialtyType);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All specialties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All specialties</SelectItem>
                    <SelectItem value="cardiology">Cardiology</SelectItem>
                    <SelectItem value="pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="general_practice">General Practice</SelectItem>
                    <SelectItem value="emergency_medicine">Emergency Medicine</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Insurance */}
              <div className="space-y-2">
                <Label>Insurance</Label>
                <Select
                  value={selectedInsurance || ""}
                  onValueChange={(value) => {
                    setSelectedInsurance(value as InsuranceProvider);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All insurance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All insurance</SelectItem>
                    <SelectItem value="none">No Insurance</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Distance Slider */}
            <div className="space-y-2">
              <Label>Maximum Distance: {maxDistance} km</Label>
              <Slider
                value={[maxDistance]}
                onValueChange={([value]) => setMaxDistance(value)}
                onValueCommit={handleFilterChange}
                max={100}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            {/* Clear Filters */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedType(null);
                setSelectedSpecialty(null);
                setSelectedInsurance(null);
                setMaxDistance(50);
                handleFilterChange();
              }}
            >
              Clear all filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};