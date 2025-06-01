
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield } from 'lucide-react';

export const CtaSection = () => {
  return (
    <section className="py-20 px-4 trust-gradient text-white">
      <div className="container mx-auto text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white/20 rounded-full">
            <Shield className="h-12 w-12 text-white" />
          </div>
        </div>
        
        <h2 className="text-4xl font-bold mb-6">
          Ready to Take Control of Your Health?
        </h2>
        
        <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto leading-relaxed">
          Join thousands who trust Doc' O Clock for secure, simple healthcare management. 
          Start your journey to better health today.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
          <Button 
            asChild 
            className="bg-white text-trust-600 hover:bg-trust-50 border-0 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Link to="/auth?tab=signup" className="flex items-center gap-2">
              Start Free Today
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          
          <Button 
            asChild 
            variant="outline" 
            className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
          >
            <Link to="/contact">Contact Sales</Link>
          </Button>
        </div>
        
        <div className="flex justify-center items-center gap-8 mt-12 text-sm opacity-80">
          <span>✓ No setup fees</span>
          <span>✓ Cancel anytime</span>
          <span>✓ 30-day money back</span>
        </div>
      </div>
    </section>
  );
};
