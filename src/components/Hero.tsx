import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Clock, Shield } from "lucide-react";

export const Hero = () => {
  return (
    <div className="relative bg-gradient-to-b from-primary/10 to-background pt-20 pb-32">
      <div className="container mx-auto px-4">
        <div className="text-center animate-fadeIn">
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
            Healthcare at Your Doorstep
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect with qualified healthcare providers for home visits and virtual consultations. Professional care when you need it, where you need it.
          </p>
          <Button className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg rounded-full">
            Find a Provider <ArrowRight className="ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          {[
            {
              icon: Heart,
              title: "Quality Care",
              description: "Verified healthcare professionals with proven track records",
            },
            {
              icon: Clock,
              title: "24/7 Availability",
              description: "Access to healthcare providers around the clock",
            },
            {
              icon: Shield,
              title: "Secure & Private",
              description: "Your health information is protected and confidential",
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <feature.icon className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};