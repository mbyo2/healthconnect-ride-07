
import { HealthPersonnelApplicationForm } from "@/components/HealthPersonnelApplicationForm";

const HealthcareApplication = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">
          Healthcare Provider Registration
        </h1>
        
        <div className="bg-card p-6 rounded-lg shadow-lg mb-6">
          <p className="mb-4">
            Join our platform as a registered healthcare provider. 
            Complete the registration form below to create your provider account.
          </p>
          
          <p className="text-muted-foreground text-sm">
            <strong>Note:</strong> After successful registration, you will be automatically 
            logged in and redirected to your provider dashboard.
          </p>
        </div>
        
        <HealthPersonnelApplicationForm />
      </div>
    </div>
  );
};

// Remove ProtectedRoute wrapper to make this publicly accessible
export default HealthcareApplication;
