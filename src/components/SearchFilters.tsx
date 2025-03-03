
import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { useSearch } from "@/context/SearchContext";
import { HealthcareProviderType } from "@/types/healthcare";

export const SearchFilters = () => {
  const {
    searchTerm,
    setSearchTerm,
    selectedType,
    setSelectedType,
    maxDistance,
    setMaxDistance,
    useUserLocation,
    setUseUserLocation,
    refreshProviders,
  } = useSearch();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value === "none" ? null : value as HealthcareProviderType);
  };

  const handleDistanceChange = (values: number[]) => {
    setMaxDistance(values[0]);
  };

  const handleLocationToggle = () => {
    setUseUserLocation(!useUserLocation);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refreshProviders();
  };

  return (
    <form onSubmit={handleSearch} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search by name or specialty..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="flex-1"
        />
        <Select 
          value={selectedType || "none"} 
          onValueChange={handleTypeChange}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Provider type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All Types</SelectItem>
            <SelectItem value="doctor">Doctors</SelectItem>
            <SelectItem value="dentist">Dentists</SelectItem>
            <SelectItem value="nurse">Nurses</SelectItem>
            <SelectItem value="pharmacy">Pharmacies</SelectItem>
            <SelectItem value="hospital">Hospitals</SelectItem>
            <SelectItem value="clinic">Clinics</SelectItem>
            <SelectItem value="nursing_home">Nursing Homes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="p-4 bg-card rounded-md shadow-sm border">
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="distance-filter" className="text-sm font-medium">
            Distance: {maxDistance === 50 ? 'Any distance' : `${maxDistance} km or less`}
          </Label>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
            type="button"
            onClick={handleLocationToggle}
          >
            <MapPin className="h-4 w-4" />
            {useUserLocation ? 'Using your location' : 'Use my location'}
          </Button>
        </div>
        <Slider
          id="distance-filter"
          value={[maxDistance]}
          max={50}
          min={1}
          step={1}
          onValueChange={handleDistanceChange}
        />
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>1 km</span>
          <span>50 km</span>
        </div>
      </div>

      <Button type="submit" className="w-full">Search</Button>
    </form>
  );
};
