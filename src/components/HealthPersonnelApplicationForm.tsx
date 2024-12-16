import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type HealthPersonnelApplication = Database['public']['Tables']['health_personnel_applications']['Insert'];

export const HealthPersonnelApplicationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    license_number: "",
    specialty: "",
    years_of_experience: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="license_number">License Number</Label>
        <Input
          id="license_number"
          value={formData.license_number}
          onChange={(e) =>
            setFormData({ ...formData, license_number: e.target.value })
          }
          required
        />
      </div>
      <div>
        <Label htmlFor="specialty">Specialty</Label>
        <Input
          id="specialty"
          value={formData.specialty}
          onChange={(e) =>
            setFormData({ ...formData, specialty: e.target.value })
          }
          required
        />
      </div>
      <div>
        <Label htmlFor="years_of_experience">Years of Experience</Label>
        <Input
          id="years_of_experience"
          type="number"
          value={formData.years_of_experience}
          onChange={(e) =>
            setFormData({ ...formData, years_of_experience: e.target.value })
          }
          required
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
};