import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const HealthPersonnelApplicationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    licenseNumber: "",
    specialty: "",
    yearsOfExperience: "",
    documents: null as File[] | null,
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

      // Upload documents
      const documentsUrls: string[] = [];
      if (formData.documents) {
        for (const file of formData.documents) {
          const { data, error } = await supabase.storage
            .from("medical_documents")
            .upload(`${user.id}/${file.name}`, file);

          if (error) throw error;
          if (data) documentsUrls.push(data.path);
        }
      }

      // Create application
      const { error } = await supabase
        .from("health_personnel_applications")
        .insert({
          user_id: user.id,
          license_number: formData.licenseNumber,
          specialty: formData.specialty,
          years_of_experience: parseInt(formData.yearsOfExperience),
          documents_url: documentsUrls,
          status: 'pending'
        });

      if (error) throw error;

      toast.success("Application submitted successfully!");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="licenseNumber">License Number</Label>
          <Input
            id="licenseNumber"
            required
            value={formData.licenseNumber}
            onChange={(e) =>
              setFormData({ ...formData, licenseNumber: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialty">Specialty</Label>
          <Input
            id="specialty"
            required
            value={formData.specialty}
            onChange={(e) =>
              setFormData({ ...formData, specialty: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="yearsOfExperience">Years of Experience</Label>
          <Input
            id="yearsOfExperience"
            type="number"
            required
            min="0"
            value={formData.yearsOfExperience}
            onChange={(e) =>
              setFormData({ ...formData, yearsOfExperience: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="documents">Upload Documents</Label>
          <Input
            id="documents"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) =>
              setFormData({
                ...formData,
                documents: e.target.files ? Array.from(e.target.files) : null,
              })
            }
          />
          <p className="text-sm text-gray-500">
            Upload your medical license and other relevant certifications
          </p>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </Button>
      </form>
    </Card>
  );
};