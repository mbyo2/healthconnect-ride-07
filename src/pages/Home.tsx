
import { Hero } from "@/components/Hero";
import { ServiceHighlights } from "@/components/ServiceHighlights";
import { Testimonials } from "@/components/Testimonials";
import { CtaSection } from "@/components/CtaSection";
import { RoleBasedWorkflow } from "@/components/workflows/RoleBasedWorkflow";
import { useAuth } from "@/context/AuthContext";

const Home = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <div className="min-h-screen">
        <RoleBasedWorkflow />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Hero />
      <ServiceHighlights />
      <Testimonials />
      <CtaSection />
    </div>
  );
};

export default Home;
