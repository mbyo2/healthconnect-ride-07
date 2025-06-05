
import { Hero } from "@/components/Hero";
import { ServiceHighlights } from "@/components/ServiceHighlights";
import { Testimonials } from "@/components/Testimonials";
import { CtaSection } from "@/components/CtaSection";
import { RoleBasedWorkflow } from "@/components/workflows/RoleBasedWorkflow";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-6">
          <div className="container-modern">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-medium">Welcome back!</span>
                </div>
                <h1 className="text-2xl font-bold">Your Healthcare Dashboard</h1>
                <p className="text-blue-100">Continue your healthcare journey</p>
              </div>
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => navigate('/emergency')}
              >
                Emergency Help
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="container-modern py-8">
          <RoleBasedWorkflow />
        </div>
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
