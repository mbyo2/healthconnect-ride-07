import { useState } from "react";
import { SymptomCollector } from "@/components/SymptomCollector";
import { toast } from "sonner";

export const Index = () => {
  const handleSymptomSubmit = (symptoms: string, urgency: string) => {
    console.log("Symptoms submitted:", { symptoms, urgency });
    toast.success("Symptoms recorded successfully");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome to Your Health Portal</h1>
      <SymptomCollector onSymptomSubmit={handleSymptomSubmit} />
    </div>
  );
};

export default Index;