
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { supabase } from "@/integrations/supabase/client";
import { Check, Clock, XCircle, AlertTriangle } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

const InstitutionStatus = () => {
  const [institution, setInstitution] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInstitutionStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError("You must be logged in to view your institution status");
          setIsLoading(false);
          return;
        }
        
        const { data, error: fetchError } = await supabase
          .from('healthcare_institutions')
          .select('*')
          .eq('admin_id', user.id)
          .maybeSingle();
          
        if (fetchError) {
          console.error("Error fetching institution:", fetchError);
          setError("Failed to fetch institution status");
          setIsLoading(false);
          return;
        }
        
        setInstitution(data);
        setIsLoading(false);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
        setIsLoading(false);
      }
    };
    
    fetchInstitutionStatus();
  }, []);
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">
          Institution Status
        </h1>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Card className="p-6 shadow-lg">
          {!institution ? (
            <div className="text-center space-y-4">
              <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto" />
              <h2 className="text-xl font-semibold">No Institution Found</h2>
              <p className="text-muted-foreground">
                You haven't registered an institution yet. Please complete the registration process.
              </p>
              <Button onClick={() => navigate("/institution-registration")} className="mt-4">
                Register Institution
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              {institution.is_verified ? (
                <Check className="h-16 w-16 text-green-500 mx-auto" />
              ) : (
                <Clock className="h-16 w-16 text-amber-500 mx-auto" />
              )}
              
              <h2 className="text-xl font-semibold">
                {institution.is_verified ? 'Verified' : 'Verification Pending'}
              </h2>
              
              <p className="text-muted-foreground">
                {institution.is_verified 
                  ? "Your institution has been verified! You can now access all features."
                  : "Your institution is pending verification. We'll notify you once it's approved."}
              </p>
              
              {institution.is_verified && (
                <Button onClick={() => navigate("/institution-dashboard")} className="mt-4">
                  Go to Dashboard
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default () => (
  <ProtectedRoute>
    <InstitutionStatus />
  </ProtectedRoute>
);
