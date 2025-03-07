
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { HealthPersonnelApplicationForm } from "@/components/HealthPersonnelApplicationForm";

const HealthcareApplication = () => {
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
};

export default () => (
  <ProtectedRoute>
    <HealthcareApplication />
  </ProtectedRoute>
);
