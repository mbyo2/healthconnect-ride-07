import { useState } from "react";
import { ProviderList } from "@/components/ProviderList";
import { Header } from "@/components/Header";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SymptomCollector } from "@/components/SymptomCollector";
import { PatientDashboard } from "@/components/patient/PatientDashboard";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasProvidedSymptoms, setHasProvidedSymptoms] = useState(false);
  const [currentSymptoms, setCurrentSymptoms] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("");
  const navigate = useNavigate();

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
    // Redirect to map view after symptom collection
    navigate('/map');
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
          <>
            <ProviderList symptoms={currentSymptoms} urgency={urgencyLevel} />
            <PatientDashboard />
          </>
        )}
      </main>
    </div>
  );
};

export default Index;