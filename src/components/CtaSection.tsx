
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const CtaSection = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-16 md:py-20 relative overflow-hidden px-4">
      {/* Background gradients */}
      <div className="absolute -top-24 -right-24 w-72 md:w-96 h-72 md:h-96 bg-blue-400/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-72 md:w-96 h-72 md:h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto relative z-10">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 rounded-2xl p-6 md:p-10 lg:p-16 text-center text-white shadow-xl">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
            Ready to Experience Better Healthcare?
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-blue-100 mb-6 md:mb-8 max-w-2xl mx-auto">
            Join thousands of users who have transformed how they access medical care.
            Get started today and connect with top healthcare providers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-white text-blue-700 hover:bg-blue-50 dark:hover:bg-white/90 px-5 py-4 md:px-8 md:py-6 text-base md:text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
              onClick={() => navigate('/search')}
            >
              Find Healthcare
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white/10 px-5 py-4 md:px-8 md:py-6 text-base md:text-lg rounded-full w-full sm:w-auto"
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
