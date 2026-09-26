import { Navigate } from "react-router-dom";
import { useUserRoles } from "@/context/UserRolesContext";
import { HealthcareInstitutionFormEnhanced } from "@/components/healthcare/HealthcareInstitutionFormEnhanced";

const InstitutionRegistration = () => {
  const { isAdmin, isSuperAdmin, loading } = useUserRoles();

  // Reviewers never fill in the registration form — they review the list of
  // submitted applications.
  if (!loading && (isAdmin || isSuperAdmin)) {
    return <Navigate to="/admin-dashboard?tab=applications" replace />;
  }

  return (
    <div className="container mx-auto py-8">
      <HealthcareInstitutionFormEnhanced />
    </div>
  );
};

export default InstitutionRegistration;
