import { useState } from "react";
import { ProviderList } from "@/components/ProviderList";
import { Header } from "@/components/Header";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SymptomCollector } from "@/components/SymptomCollector";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasProvidedSymptoms, setHasProvidedSymptoms] = useState(false);
  const [currentSymptoms, setCurrentSymptoms] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("");

  // Simulate initial loading
  useState(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  });

  const handleSymptomsCollected = (symptoms: string, urgency: string) => {
    setCurrentSymptoms(symptoms);
    setUrgencyLevel(urgency);
    setHasProvidedSymptoms(true);
    console.log("Symptoms:", symptoms, "Urgency:", urgency);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-14">
        {!hasProvidedSymptoms ? (
          <SymptomCollector onComplete={handleSymptomsCollected} />
        ) : (
          <ProviderList symptoms={currentSymptoms} urgency={urgencyLevel} />
        )}
      </main>
    </div>
  );
};

export default Index;