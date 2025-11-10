
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useUserRoles } from "@/context/UserRolesContext";
import { getRoleLandingPage } from "@/utils/rolePermissions";

const NotFound = () => {
  const navigate = useNavigate();
  const { availableRoles } = useUserRoles();

  const handleReturnHome = () => {
    const landingPage = getRoleLandingPage(availableRoles.length > 0 ? availableRoles : null);
    navigate(landingPage);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="bg-muted p-4 rounded-full">
            <AlertCircle className="h-12 w-12 text-primary" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Page Not Found</h1>
          <p className="text-muted-foreground">
            The page you are looking for doesn't exist or you don't have permission to access it.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
          <Button onClick={handleReturnHome}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
