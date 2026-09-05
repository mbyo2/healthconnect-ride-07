import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, ShieldCheck, Building2, Activity, Globe } from "lucide-react";
import { InsuranceProvider } from "@/types/healthcare";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Column names exactly as defined in migration 20260904_provider_institution_enhancements
type InstitutionFormData = {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  operating_hours: Record<string, { open: string; close: string; closed: boolean }>;
  // Insurance (existing field on the table)
  accepted_insurance_providers: string[];
  // New marketplace field
  list_in_marketplace: boolean;
  // New operational fields (correct migration names)
  services_offered: string[];
  equipment_available: string[];     // migration uses equipment_available, not specialized_equipment
  specialties: string[];             // migration uses specialties (array), not services_specialties
  languages_spoken: string[];
  number_of_beds: string;            // integer in DB, string in form for input handling
  number_of_staff: string;
  emergency_services: boolean;
  ambulance_services: boolean;
  is_24_7: boolean;
  // Accreditation
  accreditation_body: string;
  accreditation_number: string;
  accreditation_expiry_date: string;
  // Location extras
  city: string;
  country: string;
  website_url: string;
};

const DEFAULT_HOURS = DAYS.reduce((acc, day) => {
  acc[day] = { open: "09:00", close: "17:00", closed: day === "Sunday" };
  return acc;
}, {} as Record<string, { open: string; close: string; closed: boolean }>);

const SERVICE_OPTIONS = [
  "Emergency Care", "Outpatient Care", "Inpatient Care", "Surgery",
  "Maternity & Obstetrics", "Pediatrics", "Dentistry", "Radiology & Imaging",
  "Laboratory Services", "Pharmacy", "Physiotherapy & Rehab", "Mental Health",
  "Oncology", "Cardiology", "Dialysis / Renal Care", "ICU / Critical Care",
];

const EQUIPMENT_OPTIONS = [
  "MRI Scanner", "CT Scanner", "X-Ray Machine", "Ultrasound", "ECG Machine",
  "Ventilators", "Dialysis Machines", "ICU Equipment", "Ambulance",
  "Digital Mammography", "Endoscopy Unit", "Operating Theatre",
];

const LANGUAGE_OPTIONS = [
  "English", "Bemba", "Nyanja", "Tonga", "Lozi", "Lunda", "Kaonde", "Luvale",
];

const InstitutionSettings = () => {
  const { user } = useAuth();
  const { institution: contextInst, loading: instLoading, refreshInstitution } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [institution, setInstitution] = useState<any>(null);
  const [formData, setFormData] = useState<InstitutionFormData>({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    currency: "ZMW",
    operating_hours: DEFAULT_HOURS,
    accepted_insurance_providers: [],
    list_in_marketplace: false,
    services_offered: [],
    equipment_available: [],
    specialties: [],
    languages_spoken: [],
    number_of_beds: "",
    number_of_staff: "",
    emergency_services: false,
    ambulance_services: false,
    is_24_7: false,
    accreditation_body: "",
    accreditation_number: "",
    accreditation_expiry_date: "",
    city: "",
    country: "Zambia",
    website_url: "",
  });

  useEffect(() => {
    if (contextInst) {
      setInstitution(contextInst);

      // Merge saved operating_hours over defaults so every day is always populated
      const saved = (contextInst as any).operating_hours || {};
      const hours = { ...DEFAULT_HOURS };
      DAYS.forEach(day => {
        if (saved[day]) hours[day] = { ...hours[day], ...saved[day] };
      });

      setFormData({
        name: contextInst.name || "",
        address: contextInst.address || "",
        phone: contextInst.phone || "",
        email: contextInst.email || "",
        website: (contextInst as any).website || "",
        currency: contextInst.currency || "ZMW",
        operating_hours: hours,
        accepted_insurance_providers: contextInst.accepted_insurance_providers || [],
        list_in_marketplace: (contextInst as any).list_in_marketplace ?? false,
        services_offered: (contextInst as any).services_offered || [],
        equipment_available: (contextInst as any).equipment_available || [],
        specialties: (contextInst as any).specialties || [],
        languages_spoken: (contextInst as any).languages_spoken || [],
        number_of_beds: String((contextInst as any).number_of_beds || ""),
        number_of_staff: String((contextInst as any).number_of_staff || ""),
        emergency_services: (contextInst as any).emergency_services ?? false,
        ambulance_services: (contextInst as any).ambulance_services ?? false,
        is_24_7: (contextInst as any).is_24_7 ?? false,
        accreditation_body: (contextInst as any).accreditation_body || "",
        accreditation_number: (contextInst as any).accreditation_number || "",
        accreditation_expiry_date: (contextInst as any).accreditation_expiry_date || "",
        city: (contextInst as any).city || "",
        country: (contextInst as any).country || "Zambia",
        website_url: (contextInst as any).website || "",
      });

      setLoading(false);
    } else if (!instLoading) {
      setLoading(false);
    }
  }, [contextInst, instLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleHoursChange = (day: string, field: "open" | "close" | "closed", value: any) => {
    setFormData(prev => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: { ...prev.operating_hours[day], [field]: value },
      },
    }));
  };

  const handleInsuranceToggle = (provider: string) => {
    setFormData(prev => {
      const current = prev.accepted_insurance_providers;
      return {
        ...prev,
        accepted_insurance_providers: current.includes(provider)
          ? current.filter(p => p !== provider)
          : [...current, provider],
      };
    });
  };

  const handleArrayToggle = (
    field: "services_offered" | "equipment_available" | "specialties" | "languages_spoken",
    value: string
  ) => {
    setFormData(prev => {
      const current = prev[field];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value],
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("healthcare_institutions")
        .update({
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          currency: formData.currency,
          city: formData.city,
          country: formData.country,
          operating_hours: formData.operating_hours,
          accepted_insurance_providers: formData.accepted_insurance_providers,
          // New fields — exact migration column names
          list_in_marketplace: formData.list_in_marketplace,
          services_offered: formData.services_offered,
          equipment_available: formData.equipment_available,
          specialties: formData.specialties,
          languages_spoken: formData.languages_spoken,
          number_of_beds: formData.number_of_beds ? parseInt(formData.number_of_beds, 10) : null,
          number_of_staff: formData.number_of_staff ? parseInt(formData.number_of_staff, 10) : null,
          emergency_services: formData.emergency_services,
          ambulance_services: formData.ambulance_services,
          is_24_7: formData.is_24_7,
          accreditation_body: formData.accreditation_body || null,
          accreditation_number: formData.accreditation_number || null,
          accreditation_expiry_date: formData.accreditation_expiry_date || null,
        })
        .eq("id", institution.id);

      if (error) throw error;
      await refreshInstitution?.();
      toast.success("Settings saved successfully");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Institution Settings</h1>

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── General Information ── */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Institution Name</Label>
                <Input id="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={formData.phone} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" type="url" value={formData.website} onChange={handleChange} placeholder="https://" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={formData.city} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Preferred Currency</Label>
                <Select value={formData.currency} onValueChange={v => setFormData(p => ({ ...p, currency: v }))}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZMW">Zambian Kwacha (ZMW)</SelectItem>
                    <SelectItem value="USD">US Dollar (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" value={formData.address} onChange={handleChange} required />
            </div>
          </CardContent>
        </Card>

        {/* ── Marketplace Visibility ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Marketplace Visibility
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-1 flex-1 pr-4">
                <Label htmlFor="list_in_marketplace" className="text-base font-medium cursor-pointer">
                  List in Public Marketplace
                </Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, patients searching for healthcare facilities will find your institution.
                  Disable this to use the platform for internal HMS operations only.
                </p>
              </div>
              <Switch
                id="list_in_marketplace"
                checked={formData.list_in_marketplace}
                onCheckedChange={checked => {
                  setFormData(p => ({ ...p, list_in_marketplace: checked }));
                  toast.info(
                    checked
                      ? "Institution will appear in public searches after saving."
                      : "Institution will be hidden from public searches after saving.",
                    { duration: 4000 }
                  );
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Operational Details ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Operational Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="number_of_beds">Number of Beds</Label>
                <Input
                  id="number_of_beds"
                  type="number"
                  min="0"
                  value={formData.number_of_beds}
                  onChange={handleChange}
                  placeholder="e.g. 120"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number_of_staff">Total Staff Count</Label>
                <Input
                  id="number_of_staff"
                  type="number"
                  min="0"
                  value={formData.number_of_staff}
                  onChange={handleChange}
                  placeholder="e.g. 85"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="emergency_services" className="cursor-pointer">Emergency Services</Label>
                <Switch
                  id="emergency_services"
                  checked={formData.emergency_services}
                  onCheckedChange={v => setFormData(p => ({ ...p, emergency_services: v }))}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="ambulance_services" className="cursor-pointer">Ambulance Services</Label>
                <Switch
                  id="ambulance_services"
                  checked={formData.ambulance_services}
                  onCheckedChange={v => setFormData(p => ({ ...p, ambulance_services: v }))}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="is_24_7" className="cursor-pointer">Open 24 / 7</Label>
                <Switch
                  id="is_24_7"
                  checked={formData.is_24_7}
                  onCheckedChange={v => setFormData(p => ({ ...p, is_24_7: v }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Operating Hours ── */}
        <Card>
          <CardHeader>
            <CardTitle>Operating Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DAYS.map(day => (
                <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-3 p-2 rounded-lg hover:bg-accent/40">
                  <div className="w-24 font-medium text-sm">{day}</div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!formData.operating_hours[day]?.closed}
                      onCheckedChange={checked => handleHoursChange(day, "closed", !checked)}
                    />
                    <span className="text-sm text-muted-foreground w-14">
                      {formData.operating_hours[day]?.closed ? "Closed" : "Open"}
                    </span>
                  </div>
                  {!formData.operating_hours[day]?.closed && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={formData.operating_hours[day]?.open || "09:00"}
                        onChange={e => handleHoursChange(day, "open", e.target.value)}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={formData.operating_hours[day]?.close || "17:00"}
                        onChange={e => handleHoursChange(day, "close", e.target.value)}
                        className="w-32"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Services Offered ── */}
        <Card>
          <CardHeader>
            <CardTitle>Services Offered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {SERVICE_OPTIONS.map(service => (
                <div key={service} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-accent/50 transition-colors">
                  <Checkbox
                    id={`svc-${service}`}
                    checked={formData.services_offered.includes(service)}
                    onCheckedChange={() => handleArrayToggle("services_offered", service)}
                  />
                  <Label htmlFor={`svc-${service}`} className="text-sm cursor-pointer">{service}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Equipment Available ── */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {EQUIPMENT_OPTIONS.map(item => (
                <div key={item} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-accent/50 transition-colors">
                  <Checkbox
                    id={`eq-${item}`}
                    checked={formData.equipment_available.includes(item)}
                    onCheckedChange={() => handleArrayToggle("equipment_available", item)}
                  />
                  <Label htmlFor={`eq-${item}`} className="text-sm cursor-pointer">{item}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Languages Spoken ── */}
        <Card>
          <CardHeader>
            <CardTitle>Languages Spoken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {LANGUAGE_OPTIONS.map(lang => (
                <div key={lang} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-accent/50 transition-colors">
                  <Checkbox
                    id={`lang-${lang}`}
                    checked={formData.languages_spoken.includes(lang)}
                    onCheckedChange={() => handleArrayToggle("languages_spoken", lang)}
                  />
                  <Label htmlFor={`lang-${lang}`} className="text-sm cursor-pointer">{lang}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Accreditation ── */}
        <Card>
          <CardHeader>
            <CardTitle>Accreditation & Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accreditation_body">Accrediting Body</Label>
                <Input
                  id="accreditation_body"
                  value={formData.accreditation_body}
                  onChange={handleChange}
                  placeholder="e.g. HPCZ, ISO 9001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accreditation_number">Accreditation Number</Label>
                <Input
                  id="accreditation_number"
                  value={formData.accreditation_number}
                  onChange={handleChange}
                  placeholder="Certificate / reference number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accreditation_expiry_date">Accreditation Expiry Date</Label>
                <Input
                  id="accreditation_expiry_date"
                  type="date"
                  value={formData.accreditation_expiry_date}
                  onChange={handleChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Insurance Providers ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Accepted Insurance Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(InsuranceProvider)
                .filter(p => p !== InsuranceProvider.NONE)
                .map(provider => (
                  <div
                    key={provider}
                    className="flex items-center space-x-2 p-2 border rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      id={`ins-${provider}`}
                      checked={formData.accepted_insurance_providers.includes(provider)}
                      onCheckedChange={() => handleInsuranceToggle(provider)}
                    />
                    <Label htmlFor={`ins-${provider}`} className="text-sm cursor-pointer">{provider}</Label>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Save ── */}
        <Button type="submit" disabled={saving} className="w-full md:w-auto">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </form>
    </div>
  );
};

export default InstitutionSettings;
