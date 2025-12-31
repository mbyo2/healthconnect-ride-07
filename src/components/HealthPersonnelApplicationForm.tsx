import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type HealthPersonnelApplication = Database['public']['Tables']['health_personnel_applications']['Insert'];

interface FormErrors {
  license_number?: string;
  specialty?: string;
  years_of_experience?: string;
}

export const HealthPersonnelApplicationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    license_number: "",
    specialty: "",
    years_of_experience: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = () => {
    const newErrors: FormErrors = {};
    if (!formData.license_number.trim()) {
      newErrors.license_number = "License number is required";
    }
    if (!formData.specialty.trim()) {
      newErrors.specialty = "Specialty is required";
    }
    if (!formData.years_of_experience) {
      newErrors.years_of_experience = "Years of experience is required";
    } else if (parseInt(formData.years_of_experience) < 0) {
      newErrors.years_of_experience = "Years of experience must be positive";
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
        toast.error("You must be logged in to submit an application");
        return;
      }

      const application: HealthPersonnelApplication = {
        license_number: formData.license_number,
        specialty: formData.specialty,
        years_of_experience: parseInt(formData.years_of_experience),
        user_id: user.id,
        documents_url: [],
        status: "pending"
      };

      const { error } = await supabase
        .from("health_personnel_applications")
        .insert(application);

      if (error) throw error;

      toast.success("Application submitted successfully!");
      setFormData({
        license_number: "",
        specialty: "",
        years_of_experience: "",
      });
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-lg mx-auto p-4">
      <div>
        <Label htmlFor="license_number">License Number *</Label>
        <Input
          id="license_number"
          placeholder="e.g., MD123456 or RN789012"
          value={formData.license_number}
          onChange={(e) => {
            setFormData({ ...formData, license_number: e.target.value });
            if (errors.license_number) {
              setErrors({ ...errors, license_number: undefined });
            }
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
        <Label htmlFor="specialty">Specialty *</Label>
        <Input
          id="specialty"
          placeholder="e.g., Cardiology, Pediatrics, General Practice"
          value={formData.specialty}
          onChange={(e) => {
            setFormData({ ...formData, specialty: e.target.value });
            if (errors.specialty) {
              setErrors({ ...errors, specialty: undefined });
            }
          }}
          className={errors.specialty ? "border-destructive" : ""}
          disabled={isSubmitting}
          required
        />
        {errors.specialty && (
          <p className="text-sm text-destructive mt-1">{errors.specialty}</p>
        )}
      </div>
      <div>
        <Label htmlFor="years_of_experience">Years of Experience *</Label>
        <Input
          id="years_of_experience"
          type="number"
          placeholder="e.g., 5"
          value={formData.years_of_experience}
          onChange={(e) => {
            setFormData({ ...formData, years_of_experience: e.target.value });
            if (errors.years_of_experience) {
              setErrors({ ...errors, years_of_experience: undefined });
            }
          }}
          className={errors.years_of_experience ? "border-destructive" : ""}
          disabled={isSubmitting}
          required
          min="0"
        />
        {errors.years_of_experience && (
          <p className="text-sm text-destructive mt-1">{errors.years_of_experience}</p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Application"
        )}
      </Button>
    </form>
  );
};