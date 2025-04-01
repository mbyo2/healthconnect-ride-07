
import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, MapPin, FilterX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSearch } from "@/context/SearchContext";
import { HealthcareProviderType, InsuranceProvider, SpecialtyType } from "@/types/healthcare";
import { useVoiceCommands } from "@/hooks/use-voice-commands";

export const SearchFilters = () => {
  const {
    searchTerm,
    setSearchTerm,
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
    refreshProviders,
  } = useSearch();
  
  const { speak } = useVoiceCommands();

  const [isFilterChanged, setIsFilterChanged] = React.useState(false);
  
  // Detect when any filter changes
  useEffect(() => {
    setIsFilterChanged(true);
  }, [searchTerm, selectedType, selectedSpecialty, selectedInsurance, maxDistance, useUserLocation]);
  
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedType(null);
    setSelectedSpecialty(null);
    setSelectedInsurance(null);
    setMaxDistance(50);
    setUseUserLocation(false);
    
    if (refreshProviders) {
      refreshProviders();
    }
    
    setIsFilterChanged(false);
    
    // Announce filter reset for screen readers
    if (speak) {
      speak("Filters have been reset");
    }
  };
  
  const handleSearch = () => {
    if (refreshProviders) {
      refreshProviders();
      setIsFilterChanged(false);
    }
    
    // Announce search for screen readers
    if (speak) {
      speak(`Searching for ${searchTerm || "all providers"}${selectedType ? ` filtered by type ${selectedType}` : ""}${selectedSpecialty ? ` with specialty ${selectedSpecialty}` : ""}`);
    }
  };
  
  const providerTypes: HealthcareProviderType[] = [
    "doctor",
    "nurse",
    "hospital",
    "clinic",
    "pharmacy",
    "nursing_home",
    "dentist",
  ];

  const specialtyTypes: SpecialtyType[] = [
    "General Practice",
    "Cardiology", 
    "Neurology",
    "Pediatrics",
    "Orthopedics",
    "Dermatology",
    "Gynecology",
    "Oncology", 
    "Psychiatry",
    "Ophthalmology",
    "Family Medicine",
    "Internal Medicine",
    "Emergency Medicine",
    "Radiology",
    "Anesthesiology",
    "Urology",
    "General Dentistry",
    "Orthodontics"
  ];

  const insuranceProviders: InsuranceProvider[] = [
    "Medicare",
    "Medicaid", 
    "Blue Cross",
    "Cigna",
    "UnitedHealthcare",
    "Aetna",
    "Humana",
    "Kaiser Permanente",
    "TRICARE",
    "Other",
    "None"
  ];

  return (
    <div className="bg-card border rounded-lg p-4 shadow-sm space-y-4">
      <h2 className="text-lg font-medium mb-4">Search Filters</h2>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search" className="text-sm font-medium">
            Search
          </Label>
          <div className="flex gap-2">
            <Input
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or specialty"
              className="flex-1"
              aria-label="Search by name or specialty"
            />
            <Button 
              onClick={handleSearch} 
              size="icon"
              aria-label="Apply search filters"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="provider-type" className="text-sm font-medium">
            Provider Type
          </Label>
          <Select
            value={selectedType || ""}
            onValueChange={(value) => setSelectedType(value as HealthcareProviderType || null)}
          >
            <SelectTrigger id="provider-type" aria-label="Select provider type">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              {providerTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialty" className="text-sm font-medium">
            Specialty
          </Label>
          <Select
            value={selectedSpecialty || ""}
            onValueChange={(value) => setSelectedSpecialty(value as SpecialtyType || null)}
          >
            <SelectTrigger id="specialty" aria-label="Select specialty">
              <SelectValue placeholder="Any Specialty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Specialty</SelectItem>
              {specialtyTypes.map((specialty) => (
                <SelectItem key={specialty} value={specialty}>
                  {specialty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="insurance" className="text-sm font-medium">
            Insurance
          </Label>
          <Select
            value={selectedInsurance || ""}
            onValueChange={(value) => setSelectedInsurance(value as InsuranceProvider || null)}
          >
            <SelectTrigger id="insurance" aria-label="Select accepted insurance">
              <SelectValue placeholder="Any Insurance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Insurance</SelectItem>
              {insuranceProviders.map((insurance) => (
                <SelectItem key={insurance} value={insurance}>
                  {insurance}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="distance" className="text-sm font-medium">
              Maximum Distance
            </Label>
            <Badge variant="outline">{maxDistance} km</Badge>
          </div>
          <Slider
            id="distance"
            min={5}
            max={100}
            step={5}
            value={[maxDistance]}
            onValueChange={(value) => setMaxDistance(value[0])}
            aria-label={`Set maximum distance to ${maxDistance} kilometers`}
          />
        </div>

        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="use-location" className="text-sm font-medium cursor-pointer">
            Use My Location
          </Label>
          <Switch
            id="use-location"
            checked={useUserLocation}
            onCheckedChange={setUseUserLocation}
            aria-label={useUserLocation ? "Stop using my location" : "Use my current location"}
          />
        </div>
        
        <div className="pt-2 flex gap-2">
          <Button
            variant="outline" 
            className="w-full" 
            onClick={handleResetFilters}
            disabled={!isFilterChanged}
            aria-label="Reset all filters"
          >
            <FilterX className="h-4 w-4 mr-2" />
            Reset Filters
          </Button>
          <Button 
            className="w-full" 
            onClick={handleSearch}
            aria-label="Apply filters and search"
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>
    </div>
  );
};
