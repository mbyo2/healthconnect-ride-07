import { Button } from "@/components/ui/button";
import { Construction, RefreshCw } from "lucide-react";

export const Maintenance = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <Construction className="h-16 w-16 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Under Maintenance</h1>
          <p className="text-muted-foreground">
            We're currently performing scheduled maintenance to improve your experience. 
            Please check back in a few minutes.
          </p>
        </div>
        
        <Button onClick={() => window.location.reload()} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Page
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Expected completion: 15 minutes
        </div>
      </div>
    </div>
  );
};