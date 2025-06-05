
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PatientProfileSetup } from "@/components/patient/PatientProfileSetup";
import { HealthPersonnelApplicationForm } from "@/components/HealthPersonnelApplicationForm";
import { Card } from "@/components/ui/card";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking session:", error);
          toast.error("Session error. Please login again.");
          navigate("/login");
          return;
        }
        
        if (!session) {
          console.log("No session found, redirecting to login");
          navigate("/login");
          return;
        }
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (profileError) {
          console.error("Error fetching profile:", profileError);
          toast.error("Failed to fetch profile data");
          return;
        }
        
        setUserRole(profile.role);
        setIsLoading(false);
      } catch (err) {
        console.error("Unexpected error during role check:", err);
        toast.error("An unexpected error occurred");
        navigate("/login");
      }
    };

    checkUserRole();
  }, [navigate]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Route patients to patient-specific profile setup
  if (userRole === 'patient') {
    return <PatientProfileSetup />;
  }

  // Route healthcare personnel to provider application form
  if (userRole === 'health_personnel') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-center mb-6">
            Healthcare Provider Application
          </h1>
          
          <div className="bg-card p-6 rounded-lg shadow-lg mb-6">
            <p className="mb-4">
              Thank you for your interest in becoming a registered healthcare provider on our platform. 
              Please complete the application form below with accurate information.
            </p>
            
            <p className="text-muted-foreground text-sm">
              <strong>Note:</strong> All applications are reviewed by our administrators. 
              You will be notified once your application has been processed.
            </p>
          </div>
          
          <HealthPersonnelApplicationForm />
        </div>
      </div>
    );
  }

  // Fallback for other roles or errors
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Setup</h1>
          <p className="text-muted-foreground">
            Unable to determine user role. Please contact support for assistance.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSetup;
