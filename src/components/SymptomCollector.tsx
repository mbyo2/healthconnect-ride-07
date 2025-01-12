import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";

export interface SymptomCollectorProps {
  onSymptomSubmit: (symptoms: string, urgency: string) => void;
}

export const SymptomCollector = ({ onSymptomSubmit }: SymptomCollectorProps) => {
  const [symptoms, setSymptoms] = useState("");
  const [urgency, setUrgency] = useState("low");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ symptoms?: string }>({});

  const validateForm = () => {
    const newErrors: { symptoms?: string } = {};
    if (!symptoms.trim()) {
      newErrors.symptoms = "Please describe your symptoms";
    } else if (symptoms.length < 10) {
      newErrors.symptoms = "Please provide more detail about your symptoms";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!validateForm()) {
        return;
      }

      await onSymptomSubmit(symptoms, urgency);
      setSymptoms("");
      setUrgency("low");
      toast.success("Symptoms submitted successfully");
    } catch (error) {
      toast.error("Failed to submit symptoms. Please try again.");
      console.error("Error submitting symptoms:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-lg mx-auto p-4">
      <div>
        <label htmlFor="symptoms" className="block text-sm font-medium mb-1">
          Describe your symptoms
        </label>
        <Input
          id="symptoms"
          value={symptoms}
          onChange={(e) => {
            setSymptoms(e.target.value);
            if (errors.symptoms) {
              setErrors({});
            }
          }}
          placeholder="Enter your symptoms..."
          className={errors.symptoms ? "border-destructive" : ""}
          disabled={isSubmitting}
          required
        />
        {errors.symptoms && (
          <p className="text-sm text-destructive mt-1">{errors.symptoms}</p>
        )}
      </div>
      <div>
        <label htmlFor="urgency" className="block text-sm font-medium mb-1">
          Urgency Level
        </label>
        <select
          id="urgency"
          value={urgency}
          onChange={(e) => setUrgency(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
          disabled={isSubmitting}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
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
          "Submit Symptoms"
        )}
      </Button>
    </form>
  );
};