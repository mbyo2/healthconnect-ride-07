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
      {
        isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Application"
        )
      }
      </Button >
    </form >
  );
};