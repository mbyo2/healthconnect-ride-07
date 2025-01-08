import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export interface SymptomCollectorProps {
  onSymptomSubmit: (symptoms: string, urgency: string) => void;
}

export const SymptomCollector = ({ onSymptomSubmit }: SymptomCollectorProps) => {
  const [symptoms, setSymptoms] = useState("");
  const [urgency, setUrgency] = useState("low");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSymptomSubmit(symptoms, urgency);
    setSymptoms("");
    setUrgency("low");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="symptoms" className="block text-sm font-medium mb-1">
          Describe your symptoms
        </label>
        <Input
          id="symptoms"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="Enter your symptoms..."
          required
        />
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
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <Button type="submit">Submit Symptoms</Button>
    </form>
  );
};