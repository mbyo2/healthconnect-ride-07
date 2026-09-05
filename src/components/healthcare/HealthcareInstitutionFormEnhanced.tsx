import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, X, CheckCircle, AlertCircle, Building2, FileText, DollarSign, Clock, Stethoscope, Info, Plus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { SpecialtySelector } from "./SpecialtySelector";
import { saveInstitutionSpecialties } from "@/hooks/useClinicSpecialties";
import { REGULATORY_REQUIREMENTS, getCountryRequirements, validateDocumentUpload, type DocumentRequirement } from "@/config/regulatoryRequirements";

type HealthcareInstitution = Database['public']['Tables']['healthcare_institutions']['Insert'];

interface FormErrors {
  name?: string;
  type?: string;
  license_number?: string;
  address?: string;
  phone?: string;
  email?: string;
}

const PROVIDER_TYPES = [
  'hospital',
  'clinic',
  'laboratory',
  'pharmacy',
  'dispensary',
  'pediatric_center',
  'physiotherapy',
  'nursing_home',
  'care_home',
  'diagnostic_center',
  'dental_clinic',
  'eye_clinic',
  'skin_clinic',
  'specialty_clinic',
  'dentist',
  'optician',
  'dermatology_clinic',
  'radiology_center',
] as const;

const COMMON_SERVICES = [
  'Emergency Care', 'Outpatient Services', 'Inpatient Care', 'Surgery', 'Laboratory',
  'Radiology', 'Pharmacy', 'Maternity', 'Pediatrics', 'Dental', 'Physiotherapy',
  'Vaccination', 'Health Screening', 'Ambulance Services', 'ICU'
];

const COMMON_EQUIPMENT = [
  'X-Ray Machine', 'Ultrasound', 'CT Scan', 'MRI', 'ECG Machine',
  'Laboratory Equipment', 'Surgical Equipment', 'ICU Ventilators', 'Defibrillators',
  'Ambulance', 'Dental Equipment', 'Dialysis Machine'
];

const COMMON_LANGUAGES = [
  'English', 'Bemba', 'Nyanja', 'Tonga', 'Lozi', 'Lunda', 'Kaonde', 'Luvale'
];

export const HealthcareInstitutionFormEnhanced = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState("basic");
  
  const [formData, setFormData] = useState({
    // Basic Information
    name: "",
    type: "",
    license_number: "",
    address: "",
    city: "",
    state: "",
    country: "ZM",
    postal_code: "",
    phone: "",
    email: "",
    website: "",
    
    // Marketplace Listing Control
    list_in_marketplace: true,
    
    // Operational Details
    operational_since: "",
    number_of_beds: "",
    number_of_staff: "",
    emergency_services: false,
    ambulance_services: false,
    is_24_7: false,
    
    // Accreditation & Compliance
    accreditation_body: "",
    accreditation_number: "",
    accreditation_expiry_date: "",
    tax_id: "",
    business_registration_number: "",
    
    // Financial Information
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    swift_code: "",
    
    // Services & Capabilities
    services_offered: [] as string[],
    equipment_available: [] as string[],
    languages_spoken: [] as string[],
    
    // Operating Hours
    operating_hours: {
      monday: { open: "08:00", close: "17:00", closed: false },
      tuesday: { open: "08:00", close: "17:00", closed: false },
      wednesday: { open: "08:00", close: "17:00", closed: false },
      thursday: { open: "08:00", close: "17:00", closed: false },
      friday: { open: "08:00", close: "17:00", closed: false },
      saturday: { open: "08:00", close: "13:00", closed: false },
      sunday: { open: "", close: "", closed: true },
    },
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [primarySpecialtyId, setPrimarySpecialtyId] = useState<string>();
  const [selectedCountry, setSelectedCountry] = useState<string>("ZM");
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, string>>({});
  const [documentValidation, setDocumentValidation] = useState<{ valid: boolean; missing: string[] }>({ valid: true, missing: [] });
  
  // Multi-value inputs
  const [customService, setCustomService] = useState("");
  const [customEquipment, setCustomEquipment] = useState("");
  const [customLanguage, setCustomLanguage] = useState("");

  const isClinicType = ['clinic', 'dental_clinic', 'eye_clinic', 'skin_clinic', 'specialty_clinic'].includes(formData.type);
  const isInstitutionType = ['hospital', 'clinic', 'nursing_home'].includes(formData.type);
  const isPharmacyType = formData.type === 'pharmacy';

  const getEntityType = (): 'healthcareProfessionals' | 'pharmacies' | 'institutions' => {
    if (isPharmacyType) return 'pharmacies';
    if (isInstitutionType) return 'institutions';
    return 'institutions';
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = "Institution name is required";
    if (!formData.type) newErrors.type = "Institution type is required";
    if (!formData.license_number.trim()) newErrors.license_number = "License number is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDocumentUpload = async (requirement: DocumentRequirement, file: File) => {
    if (requirement.fileType && !requirement.fileType.includes(file.type)) {
      toast.error(`Invalid file type. Allowed: ${requirement.fileType.join(', ')}`);
      return;
    }

    if (requirement.maxSizeMB && file.size > requirement.maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Maximum size: ${requirement.maxSizeMB}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setUploadedDocuments(prev => ({ ...prev, [requirement.id]: base64 }));
      toast.success(`${requirement.name} uploaded successfully`);
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = (requirementId: string) => {
    setUploadedDocuments(prev => {
      const updated = { ...prev };
      delete updated[requirementId];
      return updated;
    });
  };

  const validateDocuments = () => {
    const requirements = getCountryRequirements(selectedCountry, getEntityType());
    const validation = validateDocumentUpload(uploadedDocuments, requirements);
    setDocumentValidation(validation);
    return validation.valid;
  };

  const toggleArrayItem = (array: string[], item: string, setter: (value: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const addCustomItem = (value: string, array: string[], setter: (value: string[]) => void, clearInput: () => void) => {
    if (value.trim() && !array.includes(value.trim())) {
      setter([...array, value.trim()]);
      clearInput();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setCurrentTab("basic");
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (!validateDocuments()) {
      setCurrentTab("documents");
      toast.error("Please upload all required documents");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to register an institution");
        return;
      }

      // Create the institution record
      const institution = {
        admin_id: user.id,
        name: formData.name,
        type: formData.type as any,
        license_number: formData.license_number,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postal_code: formData.postal_code,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        list_in_marketplace: formData.list_in_marketplace,
        operational_since: formData.operational_since || null,
        number_of_beds: formData.number_of_beds ? parseInt(formData.number_of_beds) : null,
        number_of_staff: formData.number_of_staff ? parseInt(formData.number_of_staff) : null,
        emergency_services: formData.emergency_services,
        ambulance_services: formData.ambulance_services,
        is_24_7: formData.is_24_7,
        accreditation_body: formData.accreditation_body || null,
        accreditation_number: formData.accreditation_number || null,
        accreditation_expiry_date: formData.accreditation_expiry_date || null,
        tax_id: formData.tax_id || null,
        business_registration_number: formData.business_registration_number || null,
        bank_name: formData.bank_name || null,
        bank_account_number: formData.bank_account_number || null,
        bank_account_name: formData.bank_account_name || null,
        swift_code: formData.swift_code || null,
        services_offered: formData.services_offered,
        equipment_available: formData.equipment_available,
        languages_spoken: formData.languages_spoken,
        operating_hours: formData.operating_hours,
        verified: false,
        status: 'pending',
      };

      const { data: institutionData, error: institutionError } = await supabase
        .from("healthcare_institutions")
        .insert(institution)
        .select("id")
        .single();

      if (institutionError) throw institutionError;

      // Save specialties if clinic type
      if (isClinicType && selectedSpecialties.length > 0 && institutionData) {
        await saveInstitutionSpecialties(
          institutionData.id,
          selectedSpecialties,
          primarySpecialtyId
        );
      }

      // Create application_extended_data record with documents
      const { error: extendedError } = await supabase
        .from('application_extended_data')
        .insert({
          application_id: institutionData.id,
          application_type: 'institution',
          extended_data: {
            uploaded_documents: uploadedDocuments,
            submission_date: new Date().toISOString(),
          },
          verification_checklist: [],
          admin_notes: [],
        });

      if (extendedError) console.error("Error saving extended data:", extendedError);

      toast.success(
        formData.list_in_marketplace
          ? "Institution registered successfully! Your application is being reviewed for public listing."
          : "Institution registered successfully! You'll have HMS access once approved (not publicly listed)."
      );
      
      navigate("/institution-status");
    } catch (error: any) {
      console.error("Error registering institution:", error);
      toast.error(error.message || "Failed to register institution");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-5xl mx-auto p-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Register Healthcare Institution</h2>
        <p className="text-muted-foreground">
          Complete all sections to register your institution. Choose whether to list in the public marketplace or use HMS only.
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">
            <Building2 className="h-4 w-4 mr-2" />
            Basic
          </TabsTrigger>
          <TabsTrigger value="operational">
            <Stethoscope className="h-4 w-4 mr-2" />
            Operational
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <FileText className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSign className="h-4 w-4 mr-2" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="documents">
            <Upload className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* BASIC INFORMATION TAB */}
        <TabsContent value="basic" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Marketplace Listing
              </CardTitle>
              <CardDescription>
                Choose whether your institution will be publicly searchable
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg border">
                <Checkbox
                  id="list_in_marketplace"
                  checked={formData.list_in_marketplace}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, list_in_marketplace: checked as boolean })
                  }
                  disabled={isSubmitting}
                />
                <div className="space-y-1 flex-1">
                  <label
                    htmlFor="list_in_marketplace"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    List my institution in public marketplace
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {formData.list_in_marketplace ? (
                      <span className="text-green-600">
                        ✓ Your institution will be searchable by patients and appear in public listings.
                      </span>
                    ) : (
                      <span className="text-amber-600">
                        ○ HMS-only access without public listing. Basic compliance information still required.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Essential details about your institution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Institution Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                  className={errors.name ? "border-destructive" : ""}
                  disabled={isSubmitting}
                  placeholder="e.g., City General Hospital"
                />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="type">Institution Type <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => {
                    setFormData({ ...formData, type: value });
                    if (errors.type) setErrors({ ...errors, type: undefined });
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={errors.type ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-sm text-destructive mt-1">{errors.type}</p>}
              </div>

              {isClinicType && (
                <SpecialtySelector
                  selected={selectedSpecialties}
                  primaryId={primarySpecialtyId}
                  onSelectionChange={setSelectedSpecialties}
                  onPrimaryChange={setPrimarySpecialtyId}
                  disabled={isSubmitting}
                />
              )}

              <div>
                <Label htmlFor="license_number">License Number <span className="text-destructive">*</span></Label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={(e) => {
                    setFormData({ ...formData, license_number: e.target.value });
                    if (errors.license_number) setErrors({ ...errors, license_number: undefined });
                  }}
                  className={errors.license_number ? "border-destructive" : ""}
                  disabled={isSubmitting}
                  placeholder="Official license number"
                />
                {errors.license_number && <p className="text-sm text-destructive mt-1">{errors.license_number}</p>}
              </div>

              <div>
                <Label htmlFor="address">Physical Address <span className="text-destructive">*</span></Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => {
                    setFormData({ ...formData, address: e.target.value });
                    if (errors.address) setErrors({ ...errors, address: undefined });
                  }}
                  className={errors.address ? "border-destructive" : ""}
                  disabled={isSubmitting}
                  placeholder="Street address, building name, etc."
                  rows={2}
                />
                {errors.address && <p className="text-sm text-destructive mt-1">{errors.address}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="e.g., Lusaka"
                  />
                </div>

                <div>
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="e.g., Lusaka Province"
                  />
                </div>

                <div>
                  <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
                  <Select
                    value={selectedCountry}
                    onValueChange={(value) => {
                      setFormData({ ...formData, country: value });
                      setSelectedCountry(value);
                      setUploadedDocuments({});
                      validateDocuments();
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REGULATORY_REQUIREMENTS).map(([code, country]) => (
                        <SelectItem key={code} value={code}>
                          {country.countryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="e.g., 10101"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (errors.phone) setErrors({ ...errors, phone: undefined });
                    }}
                    className={errors.phone ? "border-destructive" : ""}
                    disabled={isSubmitting}
                    placeholder="+260 XXX XXXXXX"
                  />
                  {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    className={errors.email ? "border-destructive" : ""}
                    disabled={isSubmitting}
                    placeholder="contact@hospital.com"
                  />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="website">Website (Optional)</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="https://www.hospital.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OPERATIONAL TAB */}
        <TabsContent value="operational" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Operational Details</CardTitle>
              <CardDescription>
                {formData.list_in_marketplace 
                  ? "Information about your facility's operations and capabilities"
                  : "Basic operational information (optional for HMS-only institutions)"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="operational_since">Operational Since</Label>
                  <Input
                    id="operational_since"
                    type="date"
                    value={formData.operational_since}
                    onChange={(e) => setFormData({ ...formData, operational_since: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="number_of_beds">Number of Beds</Label>
                  <Input
                    id="number_of_beds"
                    type="number"
                    min="0"
                    value={formData.number_of_beds}
                    onChange={(e) => setFormData({ ...formData, number_of_beds: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="e.g., 50"
                  />
                </div>

                <div>
                  <Label htmlFor="number_of_staff">Number of Staff</Label>
                  <Input
                    id="number_of_staff"
                    type="number"
                    min="0"
                    value={formData.number_of_staff}
                    onChange={(e) => setFormData({ ...formData, number_of_staff: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="e.g., 25"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Services Available</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emergency_services"
                    checked={formData.emergency_services}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, emergency_services: checked as boolean })
                    }
                    disabled={isSubmitting}
                  />
                  <label htmlFor="emergency_services" className="text-sm font-medium cursor-pointer">
                    Emergency Services Available
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ambulance_services"
                    checked={formData.ambulance_services}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, ambulance_services: checked as boolean })
                    }
                    disabled={isSubmitting}
                  />
                  <label htmlFor="ambulance_services" className="text-sm font-medium cursor-pointer">
                    Ambulance Services Available
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_24_7"
                    checked={formData.is_24_7}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_24_7: checked as boolean })
                    }
                    disabled={isSubmitting}
                  />
                  <label htmlFor="is_24_7" className="text-sm font-medium cursor-pointer">
                    Open 24/7
                  </label>
                </div>
              </div>

              <div>
                <Label>Services Offered</Label>
                <p className="text-sm text-muted-foreground mb-2">Select common services or add custom ones</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COMMON_SERVICES.map((service) => (
                    <Badge
                      key={service}
                      variant={formData.services_offered.includes(service) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        toggleArrayItem(
                          formData.services_offered,
                          service,
                          (services) => setFormData({ ...formData, services_offered: services })
                        )
                      }
                    >
                      {service}
                      {formData.services_offered.includes(service) && (
                        <X className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom service"
                    value={customService}
                    onChange={(e) => setCustomService(e.target.value)}
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomItem(
                          customService,
                          formData.services_offered,
                          (services) => setFormData({ ...formData, services_offered: services }),
                          () => setCustomService("")
                        );
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      addCustomItem(
                        customService,
                        formData.services_offered,
                        (services) => setFormData({ ...formData, services_offered: services }),
                        () => setCustomService("")
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Equipment Available</Label>
                <p className="text-sm text-muted-foreground mb-2">Select equipment or add custom items</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COMMON_EQUIPMENT.map((equipment) => (
                    <Badge
                      key={equipment}
                      variant={formData.equipment_available.includes(equipment) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        toggleArrayItem(
                          formData.equipment_available,
                          equipment,
                          (items) => setFormData({ ...formData, equipment_available: items })
                        )
                      }
                    >
                      {equipment}
                      {formData.equipment_available.includes(equipment) && (
                        <X className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom equipment"
                    value={customEquipment}
                    onChange={(e) => setCustomEquipment(e.target.value)}
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomItem(
                          customEquipment,
                          formData.equipment_available,
                          (items) => setFormData({ ...formData, equipment_available: items }),
                          () => setCustomEquipment("")
                        );
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      addCustomItem(
                        customEquipment,
                        formData.equipment_available,
                        (items) => setFormData({ ...formData, equipment_available: items }),
                        () => setCustomEquipment("")
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Languages Spoken</Label>
                <p className="text-sm text-muted-foreground mb-2">Select languages or add others</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COMMON_LANGUAGES.map((language) => (
                    <Badge
                      key={language}
                      variant={formData.languages_spoken.includes(language) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        toggleArrayItem(
                          formData.languages_spoken,
                          language,
                          (langs) => setFormData({ ...formData, languages_spoken: langs })
                        )
                      }
                    >
                      {language}
                      {formData.languages_spoken.includes(language) && (
                        <X className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add another language"
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomItem(
                          customLanguage,
                          formData.languages_spoken,
                          (langs) => setFormData({ ...formData, languages_spoken: langs }),
                          () => setCustomLanguage("")
                        );
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      addCustomItem(
                        customLanguage,
                        formData.languages_spoken,
                        (langs) => setFormData({ ...formData, languages_spoken: langs }),
                        () => setCustomLanguage("")
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {!formData.is_24_7 && (
                <div>
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Operating Hours
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">Set your weekly schedule</p>
                  <div className="space-y-2">
                    {Object.entries(formData.operating_hours).map(([day, hours]) => (
                      <div key={day} className="flex items-center gap-4">
                        <div className="w-24 capitalize font-medium text-sm">{day}</div>
                        <Checkbox
                          checked={!hours.closed}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              operating_hours: {
                                ...formData.operating_hours,
                                [day]: { ...hours, closed: !checked },
                              },
                            })
                          }
                          disabled={isSubmitting}
                        />
                        <span className="text-sm text-muted-foreground">Open</span>
                        {!hours.closed && (
                          <>
                            <Input
                              type="time"
                              value={hours.open}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  operating_hours: {
                                    ...formData.operating_hours,
                                    [day]: { ...hours, open: e.target.value },
                                  },
                                })
                              }
                              disabled={isSubmitting}
                              className="w-32"
                            />
                            <span className="text-sm text-muted-foreground">to</span>
                            <Input
                              type="time"
                              value={hours.close}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  operating_hours: {
                                    ...formData.operating_hours,
                                    [day]: { ...hours, close: e.target.value },
                                  },
                                })
                              }
                              disabled={isSubmitting}
                              className="w-32"
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPLIANCE TAB */}
        <TabsContent value="compliance" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Accreditation & Compliance</CardTitle>
              <CardDescription>Regulatory and compliance information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="accreditation_body">Accreditation Body</Label>
                <Input
                  id="accreditation_body"
                  value={formData.accreditation_body}
                  onChange={(e) => setFormData({ ...formData, accreditation_body: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="e.g., Health Professions Council of Zambia"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accreditation_number">Accreditation Number</Label>
                  <Input
                    id="accreditation_number"
                    value={formData.accreditation_number}
                    onChange={(e) => setFormData({ ...formData, accreditation_number: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="Official accreditation number"
                  />
                </div>

                <div>
                  <Label htmlFor="accreditation_expiry_date">Accreditation Expiry Date</Label>
                  <Input
                    id="accreditation_expiry_date"
                    type="date"
                    value={formData.accreditation_expiry_date}
                    onChange={(e) => setFormData({ ...formData, accreditation_expiry_date: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tax_id">Tax Identification Number</Label>
                  <Input
                    id="tax_id"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="TPIN or Tax ID"
                  />
                </div>

                <div>
                  <Label htmlFor="business_registration_number">Business Registration Number</Label>
                  <Input
                    id="business_registration_number"
                    value={formData.business_registration_number}
                    onChange={(e) => setFormData({ ...formData, business_registration_number: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="PACRA or business reg. number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FINANCIAL TAB */}
        <TabsContent value="financial" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
              <CardDescription>
                Banking details for payment processing (required for marketplace listing)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!formData.list_in_marketplace && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <Info className="h-4 w-4 inline mr-2" />
                    Financial information is optional for HMS-only institutions but recommended for future payment processing.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="e.g., Zanaco"
                />
              </div>

              <div>
                <Label htmlFor="bank_account_name">Account Name</Label>
                <Input
                  id="bank_account_name"
                  value={formData.bank_account_name}
                  onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="Account holder name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank_account_number">Account Number</Label>
                  <Input
                    id="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="Bank account number"
                  />
                </div>

                <div>
                  <Label htmlFor="swift_code">SWIFT/BIC Code (Optional)</Label>
                  <Input
                    id="swift_code"
                    value={formData.swift_code}
                    onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="For international transfers"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Documents</CardTitle>
              <CardDescription>
                Upload required documents for {REGULATORY_REQUIREMENTS[selectedCountry]?.countryName}.
                All required documents must be uploaded before submission.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getCountryRequirements(selectedCountry, getEntityType()).map((requirement) => (
                <div key={requirement.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Label className="flex items-center gap-2">
                        {requirement.name}
                        {requirement.required && <span className="text-destructive">*</span>}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">{requirement.description}</p>
                      {requirement.maxSizeMB && (
                        <p className="text-xs text-muted-foreground">Max size: {requirement.maxSizeMB}MB</p>
                      )}
                    </div>
                    {uploadedDocuments[requirement.id] ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(requirement.id)}
                          disabled={isSubmitting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {requirement.required && !uploadedDocuments[requirement.id] && (
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                    )}
                  </div>

                  {!uploadedDocuments[requirement.id] && (
                    <div className="relative">
                      <Input
                        type="file"
                        id={`doc-${requirement.id}`}
                        accept={requirement.fileType?.join(',')}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDocumentUpload(requirement, file);
                        }}
                        disabled={isSubmitting}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`doc-${requirement.id}`)?.click()}
                        disabled={isSubmitting}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {!documentValidation.valid && documentValidation.missing.length > 0 && (
                <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                  <p className="text-sm font-semibold text-destructive mb-2">Missing Required Documents:</p>
                  <ul className="text-sm text-destructive list-disc list-inside space-y-1">
                    {documentValidation.missing.map((doc) => (
                      <li key={doc}>{doc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const tabs = ["basic", "operational", "compliance", "financial", "documents"];
            const currentIndex = tabs.indexOf(currentTab);
            if (currentIndex > 0) setCurrentTab(tabs[currentIndex - 1]);
          }}
          disabled={isSubmitting || currentTab === "basic"}
        >
          Previous
        </Button>

        {currentTab !== "documents" ? (
          <Button
            type="button"
            onClick={() => {
              const tabs = ["basic", "operational", "compliance", "financial", "documents"];
              const currentIndex = tabs.indexOf(currentTab);
              if (currentIndex < tabs.length - 1) setCurrentTab(tabs[currentIndex + 1]);
            }}
            disabled={isSubmitting}
          >
            Next
          </Button>
        ) : (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        )}
      </div>
    </form>
  );
};

export default HealthcareInstitutionFormEnhanced;
