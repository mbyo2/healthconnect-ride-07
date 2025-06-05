
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, CheckCircle, Users } from 'lucide-react';

export const CtaSection = () => {
  return (
    <section className="py-16 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      
      <div className="container-modern relative">
        <div className="text-center max-w-4xl mx-auto">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm">
              <Shield className="h-12 w-12 text-white" />
            </div>
          </div>
          
          {/* Headline */}
          <h2 className="text-3xl lg:text-5xl font-bold mb-6 leading-tight">
            Ready to Transform Your
            <span className="block text-orange-300">Healthcare Experience?</span>
          </h2>
          
          {/* Subheadline */}
          <p className="text-xl mb-8 opacity-90 leading-relaxed max-w-2xl mx-auto">
            Join thousands who trust Doc' O Clock for secure, simple healthcare management. 
            Start your journey to better health today.
          </p>
          
          {/* Benefits row */}
          <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-300" />
              <span>No setup fees</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-300" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-300" />
              <span>30-day money back</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-300" />
              <span>50,000+ satisfied users</span>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto mb-8">
            <Button 
              asChild 
              variant="amazon"
              size="xl"
              className="bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <Link to="/auth?tab=signup" className="flex items-center gap-2">
                Start Free Today
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline" 
              size="xl"
              className="border-white/40 text-white hover:bg-white/10 backdrop-blur-sm bg-white/5"
            >
              <Link to="/contact">Learn More</Link>
            </Button>
          </div>
          
          {/* Trust indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-300">50K+</div>
              <div className="text-sm opacity-80">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">99.9%</div>
              <div className="text-sm opacity-80">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-300">4.8★</div>
              <div className="text-sm opacity-80">User Rating</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
