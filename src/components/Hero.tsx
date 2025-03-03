
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Clock, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <div className="relative bg-gradient-to-b from-blue-50/40 via-background to-background pt-24 pb-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -left-24 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto animate-fadeIn">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-blue-700 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm">
            Healthcare at Your Doorstep
          </h1>
          
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Connect with qualified healthcare providers for home visits and virtual consultations. 
            Professional care when you need it, where you need it.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
              onClick={() => navigate('/search')}
            >
              Find a Provider 
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
              size="lg"
              variant="outline"
              className="border-primary/20 hover:border-primary/50 px-8 py-6 text-lg rounded-full backdrop-blur-sm"
              onClick={() => navigate('/auth')}
            >
              Sign Up Now
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-24">
          {[
            {
              icon: Heart,
              title: "Quality Care",
              description: "Verified healthcare professionals with proven track records",
              gradient: "from-rose-400 to-rose-600"
            },
            {
              icon: Clock,
              title: "24/7 Availability",
              description: "Access to healthcare providers around the clock",
              gradient: "from-blue-400 to-blue-600"
            },
            {
              icon: Shield,
              title: "Secure & Private",
              description: "Your health information is protected and confidential",
              gradient: "from-emerald-400 to-emerald-600"
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="group bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
            >
              <div className={`w-14 h-14 rounded-lg bg-gradient-to-r ${feature.gradient} p-3 mb-5 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                <feature.icon className="w-full h-full text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
