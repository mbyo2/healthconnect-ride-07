
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const CtaSection = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-10 md:p-16 text-center text-white shadow-xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Experience Better Healthcare?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who have transformed how they access medical care.
            Get started today and connect with top healthcare providers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-white text-blue-700 hover:bg-blue-50 px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => navigate('/search')}
            >
              Find Healthcare Providers
              <ArrowRight className="ml-2" />
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg rounded-full"
              onClick={() => navigate('/auth')}
            >
              Sign Up Free
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
