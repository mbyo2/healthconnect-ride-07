import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";

export interface SymptomCollectorProps {
  onSymptomSubmit?: (symptoms: string, urgency: string, analysis?: string) => void;
}

export const SymptomCollector = ({ onSymptomSubmit }: SymptomCollectorProps) => {
  const [symptoms, setSymptoms] = useState("");
  const [urgency, setUrgency] = useState("low");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ symptoms?: string }>({});
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const { profile } = useAuth();

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
    
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setAiAnalysis("");

    try {
      // Get AI analysis from MedGemma
      const { data, error } = await supabase.functions.invoke('medgemma-health-analysis', {
        body: {
          analysisType: 'symptom_analysis',
          data: {
            symptoms,
            urgency,
            age: profile?.date_of_birth ? 
              new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : undefined,
            gender: profile?.gender
          }
        }
      });

      if (error) throw error;

      const analysis = data.analysis;
      setAiAnalysis(analysis);
      
      toast.success("AI analysis completed", {
        description: "MedGemma has analyzed your symptoms"
      });

      if (onSymptomSubmit) {
        onSymptomSubmit(symptoms, urgency, analysis);
      }
      
      // Reset form
      setSymptoms("");
      setUrgency("low");
    } catch (error) {
      console.error("Error analyzing symptoms:", error);
      toast.error("Failed to analyze symptoms. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
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
            placeholder="Enter your symptoms in detail..."
            className={errors.symptoms ? "border-destructive" : ""}
            disabled={isSubmitting}
            required
          />
          {errors.symptoms && (
            <p className="text-sm text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.symptoms}
            </p>
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
            <option value="low">Low - Can wait for appointment</option>
            <option value="medium">Medium - Should see doctor soon</option>
            <option value="high">High - Need urgent care</option>
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
              Analyzing with AI...
            </>
          ) : (
            "Get AI Analysis"
          )}
        </Button>
      </form>

      {aiAnalysis && (
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-primary">🤖</span> MedGemma AI Analysis
            </h3>
            <div className="prose prose-sm max-w-none text-foreground">
              <p className="whitespace-pre-wrap">{aiAnalysis}</p>
            </div>
            <div className="mt-4 p-3 bg-muted rounded-md text-xs text-muted-foreground">
              ⚠️ This AI analysis is for informational purposes only and does not constitute medical advice. 
              Always consult with a qualified healthcare professional for medical decisions.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
