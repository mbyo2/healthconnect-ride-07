import { useState, useEffect } from "react";
import { ProviderList } from "@/components/ProviderList";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SymptomCollector } from "@/components/SymptomCollector";
import { PatientDashboard } from "@/components/patient/PatientDashboard";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Hero } from "@/components/Hero";

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <main className="pt-16 pb-20 animate-fadeIn">
        {!hasProvidedSymptoms ? (
          <div className="space-y-8">
            <Hero />
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 transition-all hover:shadow-xl">
                <SymptomCollector onComplete={handleSymptomsCollected} />
              </div>
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4">
            <ProviderList symptoms={currentSymptoms} urgency={urgencyLevel} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;