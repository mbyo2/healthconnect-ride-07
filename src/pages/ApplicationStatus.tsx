
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { supabase } from "@/integrations/supabase/client";
import { Check, Clock, XCircle, AlertTriangle } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

const ApplicationStatus = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: application, isLoading } = useQuery({
    queryKey: ['health-personnel-application'],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error("You must be logged in to view your application status");
        }
        
        const { data, error: fetchError } = await supabase
          .from('health_personnel_applications')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (fetchError) {
          console.error("Error fetching application:", fetchError);
          throw new Error("Failed to fetch application status");
        }
        
        return data;
      } catch (err: any) {
        setError(err.message);
        return null;
      }
    }
  });
  
  // Subscribe to real-time notifications for this application
  useEffect(() => {
    if (!application) return;
    
    const channel = supabase
      .channel('application-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${application.user_id}`
        },
        (payload) => {
          // Show toast notification when a new notification is received
          toast(payload.new.title, {
            description: payload.new.message,
          });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [application]);
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check className="h-16 w-16 text-green-500" />;
      case 'pending':
        return <Clock className="h-16 w-16 text-amber-500" />;
      case 'rejected':
        return <XCircle className="h-16 w-16 text-red-500" />;
      default:
        return <AlertTriangle className="h-16 w-16 text-gray-500" />;
    }
  };
  
  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'approved':
        return "Your application has been approved! You can now access the provider dashboard.";
      case 'pending':
        return "Your application is currently under review. We'll notify you once a decision has been made.";
      case 'rejected':
        return "Your application was not approved. Please review the feedback below.";
      default:
        return "No application found. Please submit an application to become a healthcare provider.";
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">
          Application Status
        </h1>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Card className="p-6 shadow-lg">
          {!application ? (
            <div className="text-center space-y-4">
              <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto" />
              <h2 className="text-xl font-semibold">No Application Found</h2>
              <p className="text-muted-foreground">
                You haven't submitted an application yet. Please complete an application to become a healthcare provider.
              </p>
              <Button onClick={() => navigate("/healthcare-application")} className="mt-4">
                Submit Application
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              {renderStatusIcon(application.status)}
              <h2 className="text-xl font-semibold">
                Application Status:
              </h2>
              <div className="flex justify-center">
                <StatusBadge 
                  status={application.status} 
                  itemId={application.id} 
                  tableName="health_personnel_applications"
                  className="text-sm font-medium px-3 py-1"
                />
              </div>
              <p className="text-muted-foreground">
                {getStatusMessage(application.status)}
              </p>
              
              {application.status === 'approved' && (
                <Button onClick={() => navigate("/provider-dashboard")} className="mt-4">
                  Go to Dashboard
                </Button>
              )}
              
              {application.status === 'rejected' && application.review_notes && (
                <div className="mt-4 bg-muted p-4 rounded-md text-left">
                  <h3 className="font-medium mb-2">Feedback:</h3>
                  <p>{application.review_notes}</p>
                </div>
              )}
              
              {application.status === 'rejected' && (
                <Button onClick={() => navigate("/healthcare-application")} className="mt-4">
                  Submit New Application
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
    <ApplicationStatus />
  </ProtectedRoute>
);
