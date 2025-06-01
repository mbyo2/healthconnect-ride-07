
import React from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Heart, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Hero = () => {
  return (
    <section className="relative py-20 px-4 trust-section">
      <div className="container mx-auto text-center">
        {/* Trust indicators */}
        <div className="flex justify-center items-center gap-6 mb-8">
          <div className="flex items-center gap-2 text-trust-600">
            <Shield className="h-5 w-5" />
            <span className="text-sm font-medium">HIPAA Compliant</span>
          </div>
          <div className="flex items-center gap-2 text-trust-600">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Verified Providers</span>
          </div>
        </div>
        
        {/* Main hero content */}
        <div className="flex justify-center mb-6">
          <div className="p-6 bg-trust-100 rounded-full">
            <Heart className="h-16 w-16 text-trust-600" />
          </div>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 text-trust-900 dark:text-trust-100">
          Doc' O Clock
        </h1>
        
        <p className="text-xl text-trust-700 dark:text-trust-300 mb-8 max-w-2xl mx-auto leading-relaxed">
          Your trusted healthcare platform. Connect with verified providers, 
          manage appointments securely, and take control of your health journey.
        </p>
        
        {/* Simple, clear CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
          <Button asChild className="simple-button-primary">
            <Link to="/auth?tab=signup">Get Started Free</Link>
          </Button>
          <Button asChild className="simple-button-secondary">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
        
        {/* Trust statement */}
        <p className="text-sm text-trust-600 mt-8">
          Join 50,000+ patients who trust Doc' O Clock with their healthcare
        </p>
      </div>
    </section>
  );
};
