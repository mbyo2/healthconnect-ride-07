import { Navigate } from "react-router-dom";
import { useUserRoles } from "@/context/UserRolesContext";
import { HealthPersonnelApplicationForm } from "@/components/HealthPersonnelApplicationForm";

const HealthcareApplication = () => {
  const { isAdmin, isSuperAdmin, availableRoles, loading } = useUserRoles();

  // Nothing renders until role state resolves — no applicant-form flicker.
  if (loading) {
    return null;
  }

  // Reviewers never fill in the application form. Admins/superadmins go to
  // the review list; support agents go to their restricted support view
  // (never the PII-bearing applicant forms). Providers see the provider form
  // here; institutions use /institution-registration instead.
  if (isAdmin || isSuperAdmin || availableRoles.includes('support')) {
    return <Navigate to="/admin-dashboard?tab=providers" replace />;
  }

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
            <strong>Note:</strong> After submission, your application goes to admin review.
            You can track its status on the application status page.
          </p>
        </div>

        <HealthPersonnelApplicationForm />
      </div>
    </div>
  );
};

// Remove ProtectedRoute wrapper to make this publicly accessible
export default HealthcareApplication;
