import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

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
  'pharmacy',
  'nursing_home',
  'dentist'
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
    country: "",
    postal_code: "",
    phone: "",
    email: "",
    website: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

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
        operating_hours: {}
      };

      const { error: institutionError } = await supabase
        .from("healthcare_institutions")
        .insert(institution);

      if (institutionError) throw institutionError;

      // 2. Create the application record
      const application = {
        applicant_id: user.id,
        institution_name: formData.name,
        institution_type: formData.type,
        status: 'pending',
        documents_complete: false,
        verification_complete: false,
        payment_complete: false
      };

      const { error: applicationError } = await supabase
        .from("institution_applications")
        .insert(application);

      if (applicationError) {
        console.error("Error creating application record:", applicationError);
        throw applicationError;
      }

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
          <Label htmlFor="name">Institution Name <span className="text-red-500">*</span></Label>
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
          <Label htmlFor="type">Institution Type <span className="text-red-500">*</span></Label>
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
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-sm text-destructive mt-1">{errors.type}</p>
          )}
        </div>

        <div>
          <Label htmlFor="license_number">License Number <span className="text-red-500">*</span></Label>
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
          <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
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
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              disabled={isSubmitting}
            />
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
          <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
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
          <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
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
    </form >
  );
};