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
    <div className="flex items-center justify-center min-h-screen bg-[#f5f7fa] dark:bg-slate-950 px-4 font-sans text-slate-900 dark:text-slate-100">
      <div className="text-center space-y-6 max-w-md bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-sm">
        <div className="flex justify-center">
          <div className="bg-[#e5f0ff] dark:bg-blue-950 p-5 rounded-3xl ring-8 ring-[#e5f0ff]/50 dark:ring-blue-950/50">
            <AlertCircle className="h-12 w-12 text-[#0073ea]" />
          </div>
        </div>
        
        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-[#0073ea] bg-[#e5f0ff] dark:bg-blue-950 px-3 py-1 rounded-full">
            404 Error
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight pt-1">
            Page Not Found
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            The healthcare workspace or resource you are looking for doesn't exist or has been relocated.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="rounded-full h-11 border-2 border-slate-200 dark:border-slate-800 text-xs font-extrabold"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <Button
            onClick={handleReturnHome}
            className="rounded-full h-11 bg-[#0073ea] hover:bg-[#0060c7] text-white text-xs font-extrabold shadow-sm"
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
