import { Hero } from "@/components/Hero";
import { ServiceHighlights } from "@/components/ServiceHighlights";
import { Testimonials } from "@/components/Testimonials";
import { CtaSection } from "@/components/CtaSection";
import { RoleBasedWorkflow } from "@/components/workflows/RoleBasedWorkflow";
import { useAuth } from "@/context/AuthContext";
import { SpecializedHelp } from "@/components/home/SpecializedHelp";

const Home = () => {
  const { isAuthenticated } = useAuth();

  // Render authenticated view
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <RoleBasedWorkflow />
      </div>
    );
  }

  // Render public landing page
  return (
    <div className="min-h-screen">
      <Hero />
      <div className="container-modern py-12">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Specialized Care</h2>
        <SpecializedHelp />
      </div>
      <ServiceHighlights />
      <Testimonials />
      <CtaSection />
    </div>
  );
};

export default Home;
