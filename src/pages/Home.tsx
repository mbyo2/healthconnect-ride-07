
import { Hero } from "@/components/Hero";
import { ServiceHighlights } from "@/components/ServiceHighlights";
import { Testimonials } from "@/components/Testimonials";
import { CtaSection } from "@/components/CtaSection";
import { RoleBasedWorkflow } from "@/components/workflows/RoleBasedWorkflow";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, AlertTriangle, Pill, Users, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSuccessFeedback } from "@/hooks/use-success-feedback";
import { SpecializedHelp } from "@/components/home/SpecializedHelp";
import { WalletCard } from "@/components/home/WalletCard";

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        {/* Welcome Banner - Premium Gradient & Glassmorphism */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white py-8 md:py-12">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />

          <div className="container-modern relative px-4 md:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-blue-100" />
                  <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-blue-50">Welcome back!</span>
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight">
                  Your Healthcare Dashboard
                </h1>
                <p className="text-blue-100/90 text-sm md:text-base max-w-md">
                  Personalized care and real-time health insights, all in one place.
                </p>
              </div>
              <Button
                variant="outline"
                size="lg"
                className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 hover:border-white/40 w-full sm:w-auto font-bold shadow-lg transition-all active:scale-95"
                onClick={() => navigate('/emergency')}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Emergency Help
              </Button>
            </div>
          </div>
        </div>

        <div className="container-modern px-4 md:px-6 lg:px-8 -mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <section>
                <h2 className="text-lg font-bold mb-3 text-gray-800">Specialized Help</h2>
                <SpecializedHelp />
              </section>
            </div>
            <div className="lg:col-span-1">
              <WalletCard />
            </div>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="container-modern px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Quick Access</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">

              <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-none shadow-sm bg-white/80 backdrop-blur-sm hover:-translate-y-1 active:scale-95" onClick={() => {
                navigate('/emergency');
                showSuccess({ message: "Navigating to Emergency Services" });
              }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-rose-50 rounded-lg group-hover:bg-rose-100 transition-colors">
                      <AlertTriangle className="h-5 w-5 text-rose-600" />
                    </div>
                    <CardTitle className="text-sm font-bold">Emergency</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs font-medium">Get help now</CardDescription>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-none shadow-sm bg-white/80 backdrop-blur-sm hover:-translate-y-1 active:scale-95" onClick={() => navigate('/marketplace')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                      <Pill className="h-5 w-5 text-emerald-600" />
                    </div>
                    <CardTitle className="text-sm font-bold">Buy Medicine</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs font-medium">Order from pharmacies</CardDescription>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-none shadow-sm bg-white/80 backdrop-blur-sm hover:-translate-y-1 active:scale-95" onClick={() => navigate('/marketplace-users')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <CardTitle className="text-sm font-bold">Find Providers</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs font-medium">Connect with doctors</CardDescription>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-none shadow-sm bg-white/80 backdrop-blur-sm hover:-translate-y-1 active:scale-95" onClick={() => navigate('/appointments')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <CardTitle className="text-sm font-bold">Appointments</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs font-medium">Book & manage</CardDescription>
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
