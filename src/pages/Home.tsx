
import { Hero } from "@/components/Hero";
import { ServiceHighlights } from "@/components/ServiceHighlights";
import { Testimonials } from "@/components/Testimonials";
import { CtaSection } from "@/components/CtaSection";
import { RoleBasedWorkflow } from "@/components/workflows/RoleBasedWorkflow";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Sparkles, AlertTriangle, Pill, Users, Calendar, MessageSquare, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSuccessFeedback } from "@/hooks/use-success-feedback";

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-6 md:py-8">
          <div className="container-modern px-4 md:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="text-xs md:text-sm font-medium">Welcome back!</span>
                </div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Your Healthcare Dashboard</h1>
                <p className="text-blue-100 text-sm md:text-base">Continue your healthcare journey</p>
              </div>
              <Button
                variant="outline"
                size="default"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-full sm:w-auto min-h-[44px]"
                onClick={() => navigate('/emergency')}
              >
                Emergency Help
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="container-modern px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Quick Access</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
                navigate('/emergency');
                showSuccess({ message: "Navigating to Emergency Services" });
              }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-sm">Emergency</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs">Get help now</CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/marketplace')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-sm">Buy Medicine</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs">Order from pharmacies</CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/marketplace-users')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-sm">Find Providers</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs">Connect with doctors</CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/appointments')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-sm">Appointments</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs">Book & manage</CardDescription>
                </CardContent>
              </Card>

            </div>
          </div>

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
