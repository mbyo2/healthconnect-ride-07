
import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { useSearch } from "@/context/SearchContext";
import { HealthcareProviderType, InsuranceProvider, SpecialtyType } from "@/types/healthcare";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value === "none" ? null : value as HealthcareProviderType);
  };

  const handleSpecialtyChange = (value: string) => {
    setSelectedSpecialty(value === "none" ? null : value as SpecialtyType);
  };

  const handleInsuranceChange = (value: string) => {
    setSelectedInsurance(value === "none" ? null : value as InsuranceProvider);
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

      <Card className="p-4">
        <Accordion type="single" collapsible defaultValue="distance" className="space-y-2">
          <AccordionItem value="distance" className="border-none">
            <AccordionTrigger className="py-2 text-base hover:no-underline">
              Distance Filter
            </AccordionTrigger>
            <AccordionContent className="pt-2">
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
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="specialty" className="border-none">
            <AccordionTrigger className="py-2 text-base hover:no-underline">
              Specialty
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <Select 
                value={selectedSpecialty || "none"} 
                onValueChange={handleSpecialtyChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Specialties</SelectItem>
                  <SelectItem value="General Practice">General Practice</SelectItem>
                  <SelectItem value="Cardiology">Cardiology</SelectItem>
                  <SelectItem value="Neurology">Neurology</SelectItem>
                  <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                  <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                  <SelectItem value="Dermatology">Dermatology</SelectItem>
                  <SelectItem value="Gynecology">Gynecology</SelectItem>
                  <SelectItem value="Oncology">Oncology</SelectItem>
                  <SelectItem value="Psychiatry">Psychiatry</SelectItem>
                  <SelectItem value="Ophthalmology">Ophthalmology</SelectItem>
                  <SelectItem value="Family Medicine">Family Medicine</SelectItem>
                  <SelectItem value="Internal Medicine">Internal Medicine</SelectItem>
                  <SelectItem value="Emergency Medicine">Emergency Medicine</SelectItem>
                  <SelectItem value="Radiology">Radiology</SelectItem>
                  <SelectItem value="Anesthesiology">Anesthesiology</SelectItem>
                  <SelectItem value="Urology">Urology</SelectItem>
                  <SelectItem value="General Dentistry">General Dentistry</SelectItem>
                  <SelectItem value="Orthodontics">Orthodontics</SelectItem>
                </SelectContent>
              </Select>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="insurance" className="border-none">
            <AccordionTrigger className="py-2 text-base hover:no-underline">
              Insurance
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <Select 
                value={selectedInsurance || "none"} 
                onValueChange={handleInsuranceChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select insurance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Insurance Types</SelectItem>
                  <SelectItem value="Medicare">Medicare</SelectItem>
                  <SelectItem value="Medicaid">Medicaid</SelectItem>
                  <SelectItem value="Blue Cross">Blue Cross</SelectItem>
                  <SelectItem value="Cigna">Cigna</SelectItem>
                  <SelectItem value="UnitedHealthcare">UnitedHealthcare</SelectItem>
                  <SelectItem value="Aetna">Aetna</SelectItem>
                  <SelectItem value="Humana">Humana</SelectItem>
                  <SelectItem value="Kaiser Permanente">Kaiser Permanente</SelectItem>
                  <SelectItem value="TRICARE">TRICARE</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <Button type="submit" className="w-full">Search</Button>
    </form>
  );
};
