import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Clock, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <div className="relative bg-gradient-to-b from-primary/10 via-background to-background pt-20 pb-32 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="container mx-auto px-4 relative">
        <div className="text-center animate-fadeIn">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Healthcare at Your Doorstep
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Connect with qualified healthcare providers for home visits and virtual consultations. 
            Professional care when you need it, where you need it.
          </p>
          <Button 
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse"
            onClick={() => navigate('/search')}
          >
            Find a Provider <ArrowRight className="ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          {[
            {
              icon: Heart,
              title: "Quality Care",
              description: "Verified healthcare professionals with proven track records",
              gradient: "from-pink-500 to-rose-500"
            },
            {
              icon: Clock,
              title: "24/7 Availability",
              description: "Access to healthcare providers around the clock",
              gradient: "from-blue-500 to-cyan-500"
            },
            {
              icon: Shield,
              title: "Secure & Private",
              description: "Your health information is protected and confidential",
              gradient: "from-green-500 to-emerald-500"
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="group bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.gradient} p-2 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-full h-full text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};