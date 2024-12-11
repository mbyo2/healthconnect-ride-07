import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";

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
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold text-center">How can we help you today?</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Describe your symptoms</label>
          <Textarea
            placeholder="Please describe what you're experiencing..."
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">How urgent is your condition?</label>
          <select
            className="w-full p-2 border rounded-md"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
          >
            <option value="emergency">Emergency - Need immediate attention</option>
            <option value="urgent">Urgent - Need to be seen today</option>
            <option value="non-urgent">Non-urgent - Can wait a few days</option>
          </select>
        </div>
        <Button type="submit" className="w-full">Find Healthcare Providers</Button>
      </form>
    </div>
  );
};