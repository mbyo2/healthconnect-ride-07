import { Hero } from "@/components/Hero";
import { ServiceHighlights } from "@/components/ServiceHighlights";
import { Testimonials } from "@/components/Testimonials";
import { CtaSection } from "@/components/CtaSection";
import { RoleBasedWorkflow } from "@/components/workflows/RoleBasedWorkflow";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { useRoleDashboard } from "@/hooks/useRoleDashboard";
import { SpecializedHelp } from "@/components/home/SpecializedHelp";
import { SkeletonPatientHome } from "@/components/ui/skeleton-kit";

const Home = () => {
  const { isAuthenticated } = useAuth();
  const { isPatient, loading } = useUserRoles();
  
  // Auto-redirect non-patient roles to their specific dashboard
  const { isLoading, shouldRedirect } = useRoleDashboard({ 
    redirectOnAuth: true,
    // Only redirect if user is NOT a patient — patients stay on /home
    skip: isPatient || loading
  });

  // Show the patient-home skeleton while determining role redirect —
  // patients (the audience that stays on /home) see the exact layout
  // they are about to get; other roles redirect away from it.
  if (isAuthenticated && (isLoading || shouldRedirect || loading)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6" role="status" aria-label="Loading your dashboard">
          <SkeletonPatientHome />
        </div>
      </div>
    );
  }

  // Render authenticated patient view
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <RoleBasedWorkflow />
      </div>
    );
  }

  // Render public landing page
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <div className="container-modern py-12 bg-background">
        <h2 className="text-2xl font-bold mb-6 text-foreground">Specialized Care</h2>
        <SpecializedHelp />
      </div>
      <ServiceHighlights />
      <Testimonials />
      <CtaSection />
    </div>
  );
};

export default Home;
