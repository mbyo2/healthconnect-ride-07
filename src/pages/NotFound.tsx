import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
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
    <div className="flex items-center justify-center min-h-screen bg-canvas px-4 font-sans text-midnight">
      <div className="text-center space-y-6 max-w-md bg-card border border-border rounded-2xl p-8 sm:p-10 shadow-sm">
        <div className="flex justify-center">
          <div className="bg-primary-50 dark:bg-blue-950 p-5 rounded-2xl ring-8 ring-primary-100/50 dark:ring-blue-950/50">
            <AlertCircle className="h-12 w-12 text-primary-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-500 bg-primary-50 dark:bg-blue-950 px-3 py-1 rounded-full">
            404 Error
          </span>
          <h1 className="text-3xl font-bold text-foreground tracking-tight pt-1">
            Page Not Found
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            The healthcare workspace or resource you are looking for doesn't exist or has been relocated.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="rounded-full h-11 border border-border text-xs font-semibold"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <Button
            onClick={handleReturnHome}
            className="rounded-full h-11 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold shadow-sm"
          >
            <Home className="h-4 w-4 mr-2" />
            Return to Workspace
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
