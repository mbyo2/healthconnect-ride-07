import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, X, CheckCircle, AlertCircle } from "lucide-react";
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

export const HealthcareInstitutionForm = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
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
    // New fields for comprehensive review
    list_in_marketplace: true, // Default to true for being listed
    operational_since: "",
    number_of_beds: "",
    number_of_staff: "",
    emergency_services: false,
    ambulance_services: false,
    accreditation_body: "",
    accreditation_number: "",
    tax_id: "",
    business_registration_number: "",
    bank_name: "",
    bank_account_number: "",
    insurance_providers: [] as string[],
    services_offered: [] as string[],
    equipment_available: [] as string[],
    opening_hours: {
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
    if (!formData.name.trim()) {
      newErrors.name = "Institution name is required";
    }
    if (!formData.type) {
      newErrors.type = "Institution type is required";
    }
    if (!formData.license_number.trim()) {
      newErrors.license_number = "License number is required";
    }
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!validateDocuments()) {
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

      // 1. Create the institution record (unverified)
      const institution = {
        ...formData,
        type: formData.type as any,
        admin_id: user.id,
        is_verified: false,
        operating_hours: {},
        documents_url: Object.values(uploadedDocuments)
      };

      const { data: institutionData, error: institutionError } = await supabase
        .from("healthcare_institutions" as any)
        .insert(institution)
        .select("id")
        .single();

      if (institutionError) throw institutionError;

      // Save specialties if clinic type
      if (isClinicType && selectedSpecialties.length > 0 && institutionData) {
        await saveInstitutionSpecialties(
          (institutionData as any).id,
          selectedSpecialties,
          primarySpecialtyId
        );
      }

      // 2. Create the application record
      const application = {
        applicant_id: user.id,
        institution_name: formData.name,
        institution_type: formData.type,
        status: 'pending'
      };

      const { error: appError } = await supabase
        .from('institution_applications' as any)
        .insert(application);

      if (appError) throw appError;

      toast.success("Institution registered successfully! Awaiting verification.");
      navigate("/institution-status");
    } catch (error: any) {
      console.error("Error registering institution:", error);
      toast.error(error.message || "Failed to register institution");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold">Register Healthcare Institution</h2>

      <div className="space-y-4">
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
            required
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <Label htmlFor="type">Institution Type <span className="text-destructive">*</span></Label>
          <Select
            value={formData.type}
            onValueChange={(value) => {
              setFormData({ ...formData, type: value });
              if (errors.type) setErrors({ ...errors, type: undefined });
            }}
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
          {errors.type && (
            <p className="text-sm text-destructive mt-1">{errors.type}</p>
          )}
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
            required
          />
          {errors.license_number && (
            <p className="text-sm text-destructive mt-1">{errors.license_number}</p>
          )}
        </div>

        <div>
          <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => {
              setFormData({ ...formData, address: e.target.value });
              if (errors.address) setErrors({ ...errors, address: undefined });
            }}
            className={errors.address ? "border-destructive" : ""}
            disabled={isSubmitting}
            required
          />
          {errors.address && (
            <p className="text-sm text-destructive mt-1">{errors.address}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="state">State/Province</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              disabled={isSubmitting}
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
            />
          </div>
        </div>

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
            required
          />
          {errors.phone && (
            <p className="text-sm text-destructive mt-1">{errors.phone}</p>
          )}
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
            required
          />
          {errors.email && (
            <p className="text-sm text-destructive mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <Label htmlFor="website">Website (Optional)</Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Document Upload Section */}
      <div className="space-y-4 border-t pt-4 mt-4">
        <h3 className="text-lg font-semibold">Regulatory Documents</h3>
        <p className="text-sm text-muted-foreground">
          Upload required documents for {REGULATORY_REQUIREMENTS[selectedCountry]?.countryName}. 
          All required documents must be uploaded before submission.
        </p>

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
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Registering...
          </>
        ) : (
          "Register Institution"
        )}
      </Button>
    </form>
  );
};

export default HealthcareInstitutionForm;