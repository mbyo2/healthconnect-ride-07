import { Navigate } from "react-router-dom";
import { useUserRoles } from "@/context/UserRolesContext";
import { HealthcareInstitutionFormEnhanced } from "@/components/healthcare/HealthcareInstitutionFormEnhanced";

const InstitutionRegistration = () => {
  const { isAdmin, isSuperAdmin, availableRoles, loading } = useUserRoles();

  // Nothing renders until role state resolves — no applicant-form flicker.
  if (loading) {
    return null;
  }

  // Reviewers never fill in the registration form. Admins/superadmins go to
  // the review list; support agents go to their restricted support view
  // (never the PII-bearing applicant forms).
  if (isAdmin || isSuperAdmin || availableRoles.includes('support')) {
    return <Navigate to="/admin-dashboard?tab=applications" replace />;
  }

  return (
    <div className="container mx-auto py-8">
      <HealthcareInstitutionFormEnhanced />
    </div>
  );
};

export default InstitutionRegistration;
