import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearch } from "@/context/SearchContext";
import { HealthcareProviderType, SpecialtyType, InsuranceProvider } from "@/types/healthcare";
import { Filter, MapPin, Video, Home, DollarSign, Languages } from "lucide-react";
import { useState } from "react";

const LANGUAGE_OPTIONS = [
  "English", "Bemba", "Nyanja", "Tonga", "Lozi", "Lunda", "Kaonde", "Luvale",
];

export const SearchFilters = () => {
  const {
    selectedType, setSelectedType,
    selectedSpecialty, setSelectedSpecialty,
    selectedInsurance, setSelectedInsurance,
    maxDistance, setMaxDistance,
    useUserLocation, setUseUserLocation,
    telemedicineOnly, setTelemedicineOnly,
    homeVisitsOnly, setHomeVisitsOnly,
    selectedLanguage, setSelectedLanguage,
    feeMax, setFeeMax,
    refreshProviders,
  } = useSearch();

  const [showFilters, setShowFilters] = useState(false);

  const applyFilters = () => refreshProviders();

  const clearAll = () => {
    setSelectedType(null);
    setSelectedSpecialty(null);
    setSelectedInsurance(null);
    setMaxDistance(50);
    setTelemedicineOnly(false);
    setHomeVisitsOnly(false);
    setSelectedLanguage(null);
    setFeeMax(null);
    refreshProviders();
  };

  const activeCount = [
    selectedType && selectedType !== 'all' as any,
    selectedSpecialty && selectedSpecialty !== 'all' as any,
    selectedInsurance && selectedInsurance !== 'all' as any,
    telemedicineOnly,
    homeVisitsOnly,
    selectedLanguage,
    feeMax !== null && feeMax > 0,
  ].filter(Boolean).length;

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
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-[#0073ea] text-white text-[10px] font-black">
              {activeCount}
            </span>
          )}
        </Button>

        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Switch checked={useUserLocation} onCheckedChange={setUseUserLocation} />
          <Label className="text-sm">Use my location</Label>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-4 space-y-5">
            {/* Row 1: Type / Specialty / Insurance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Provider Type</Label>
                <Select
                  value={selectedType || "all"}
                  onValueChange={v => { setSelectedType(v as HealthcareProviderType); applyFilters(); }}
                >
                  <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="doctor">Doctor / Specialist</SelectItem>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="clinic">Clinic</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="diagnostic_center">Diagnostic Center / Lab</SelectItem>
                    <SelectItem value="imaging_center">Radiology & Imaging</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Specialty</Label>
                <Select
                  value={selectedSpecialty || "all"}
                  onValueChange={v => { setSelectedSpecialty(v as SpecialtyType); applyFilters(); }}
                >
                  <SelectTrigger><SelectValue placeholder="All specialties" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All specialties</SelectItem>
                    <SelectItem value="General Practice">General Practice</SelectItem>
                    <SelectItem value="Cardiology">Cardiology</SelectItem>
                    <SelectItem value="Dermatology">Dermatology</SelectItem>
                    <SelectItem value="Neurology">Neurology</SelectItem>
                    <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                    <SelectItem value="Psychiatry">Psychiatry</SelectItem>
                    <SelectItem value="Oncology">Oncology</SelectItem>
                    <SelectItem value="Endocrinology">Endocrinology</SelectItem>
                    <SelectItem value="Gastroenterology">Gastroenterology</SelectItem>
                    <SelectItem value="General Dentistry">General Dentistry</SelectItem>
                    <SelectItem value="Emergency Medicine">Emergency Medicine</SelectItem>
                    <SelectItem value="Pathology & Diagnostics">Pathology & Diagnostics</SelectItem>
                    <SelectItem value="Radiology & Imaging">Radiology & Imaging</SelectItem>
                    <SelectItem value="Phlebotomy & Home Tests">Phlebotomy & Home Tests</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Insurance</Label>
                <Select
                  value={selectedInsurance || "all"}
                  onValueChange={v => { setSelectedInsurance(v as InsuranceProvider); applyFilters(); }}
                >
                  <SelectTrigger><SelectValue placeholder="All insurance" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All insurance networks</SelectItem>
                    <SelectItem value="none">Self-Pay / Cash Only</SelectItem>
                    <SelectItem value="NHIMA">NHIMA (National Health Insurance)</SelectItem>
                    <SelectItem value="Madison">Madison Health Insurance</SelectItem>
                    <SelectItem value="Prudential">Prudential Life & Health</SelectItem>
                    <SelectItem value="Old Mutual">Old Mutual</SelectItem>
                    <SelectItem value="AXA">AXA</SelectItem>
                    <SelectItem value="BlueCross">BlueCross</SelectItem>
                    <SelectItem value="MetLife">MetLife</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Language */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Languages className="h-4 w-4" /> Language Spoken
              </Label>
              <Select
                value={selectedLanguage || "all"}
                onValueChange={v => { setSelectedLanguage(v === "all" ? null : v); applyFilters(); }}
              >
                <SelectTrigger className="max-w-xs"><SelectValue placeholder="Any language" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any language</SelectItem>
                  {LANGUAGE_OPTIONS.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 3: Fee range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" />
                Max Consultation Fee (ZMW){feeMax ? `: K${feeMax}` : ": Any"}
              </Label>
              <Slider
                value={[feeMax ?? 2000]}
                onValueChange={([v]) => setFeeMax(v)}
                onValueCommit={applyFilters}
                min={50}
                max={2000}
                step={50}
                className="max-w-xs"
              />
              {feeMax && (
                <button
                  onClick={() => { setFeeMax(null); applyFilters(); }}
                  className="text-xs text-[#0073ea] hover:underline"
                >
                  Remove fee limit
                </button>
              )}
            </div>

            {/* Row 4: Distance */}
            <div className="space-y-2">
              <Label>Maximum Distance: {maxDistance} km</Label>
              <Slider
                value={[maxDistance]}
                onValueChange={([value]) => setMaxDistance(value)}
                onValueCommit={applyFilters}
                max={100}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            {/* Row 5: Service toggles */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 p-3 border rounded-xl border-[#e6e9ef] min-w-[180px]">
                <Video className="h-4 w-4 text-[#0073ea]" />
                <Label className="cursor-pointer flex-1 text-sm">Telemedicine available</Label>
                <Switch
                  checked={telemedicineOnly}
                  onCheckedChange={v => { setTelemedicineOnly(v); applyFilters(); }}
                />
              </div>
              <div className="flex items-center gap-2 p-3 border rounded-xl border-[#e6e9ef] min-w-[180px]">
                <Home className="h-4 w-4 text-[#00c875]" />
                <Label className="cursor-pointer flex-1 text-sm">Home visits available</Label>
                <Switch
                  checked={homeVisitsOnly}
                  onCheckedChange={v => { setHomeVisitsOnly(v); applyFilters(); }}
                />
              </div>
            </div>

            {/* Clear button */}
            <div className="flex items-center justify-between pt-1">
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear all filters
              </Button>
              {activeCount > 0 && (
                <span className="text-xs text-[#676879]">{activeCount} filter{activeCount > 1 ? 's' : ''} active</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
