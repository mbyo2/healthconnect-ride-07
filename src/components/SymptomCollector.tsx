import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { Card } from "./ui/card";

interface SymptomCollectorProps {
  onComplete: (symptoms: string, urgency: string) => void;
}

export const SymptomCollector = ({ onComplete }: SymptomCollectorProps) => {
  const [symptoms, setSymptoms] = useState("");
  const [urgency, setUrgency] = useState("non-urgent");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) {
      toast.error("Please describe your symptoms");
      return;
    }
    onComplete(symptoms, urgency);
  };

  return (
    <Card className="p-6 shadow-none">
      <h2 className="text-2xl font-bold text-primary mb-6">How can we help you today?</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Describe your symptoms</label>
          <Textarea
            placeholder="Please describe what you're experiencing..."
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            className="min-h-[120px] resize-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">How urgent is your condition?</label>
          <select
            className="w-full p-3 border rounded-lg bg-white"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
          >
            <option value="emergency">Emergency - Need immediate attention</option>
            <option value="urgent">Urgent - Need to be seen today</option>
            <option value="non-urgent">Non-urgent - Can wait a few days</option>
          </select>
        </div>
        <Button 
          type="submit" 
          className="w-full py-6 text-lg font-semibold rounded-xl"
        >
          Find Healthcare Providers
        </Button>
      </form>
    </Card>
  );
};