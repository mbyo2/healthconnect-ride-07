import { useState, useEffect } from "react";
import { ProviderList } from "@/components/ProviderList";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SymptomCollector } from "@/components/SymptomCollector";
import { PatientDashboard } from "@/components/patient/PatientDashboard";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasProvidedSymptoms, setHasProvidedSymptoms] = useState(false);
  const [currentSymptoms, setCurrentSymptoms] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserRole(profile.role);
          console.log("User role:", profile.role);
        }
      }
      setIsLoading(false);
    };

    fetchUserRole();
  }, []);

  const handleSymptomsCollected = (symptoms: string, urgency: string) => {
    setCurrentSymptoms(symptoms);
    setUrgencyLevel(urgency);
    setHasProvidedSymptoms(true);
    navigate('/map');
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (userRole === 'health_personnel') {
    return <PatientDashboard />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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