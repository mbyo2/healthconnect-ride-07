
import React from 'react';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, Star, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLogo } from '@/components/ui/AppLogo';

export const Hero = () => {
  return (
    <div className="bg-gradient-to-b from-blue-50 to-white">
      <div className="container-modern py-16">
        {/* Trust indicators row */}
        <div className="flex flex-wrap justify-center items-center gap-6 mb-8 text-sm">
          <div className="flex items-center gap-2 text-green-700">
            <Shield className="h-4 w-4" />
            <span className="font-medium">HIPAA Compliant</span>
          </div>
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">Verified Providers</span>
          </div>
          <div className="flex items-center gap-2 text-orange-600">
            <Star className="h-4 w-4 fill-current" />
            <span className="font-medium">4.8/5 Rating</span>
          </div>
          <div className="flex items-center gap-2 text-blue-600">
            <TrendingUp className="h-4 w-4" />
            <span className="font-medium">50,000+ Users</span>
          </div>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - Content */}
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start mb-6">
              <AppLogo size="lg" className="p-4 bg-blue-50 rounded-2xl border border-blue-200" />
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 text-gray-900 leading-tight">
              Healthcare Made
              <span className="text-blue-600 block">Simple & Secure</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-xl">
              Connect with verified healthcare providers, manage appointments securely, 
              and take control of your health journey with Doc' O Clock.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button asChild variant="amazon" size="xl" className="flex-1 sm:flex-none">
                <Link to="/auth?tab=signup" className="text-center">
                  Get Started Free
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="flex-1 sm:flex-none">
                <Link to="/auth" className="text-center">
                  Sign In
                </Link>
              </Button>
            </div>
            
            {/* Trust statement */}
            <p className="text-sm text-gray-500">
              Trusted by 50,000+ patients worldwide • Free to start • No credit card required
            </p>
          </div>
          
          {/* Right column - Visual */}
          <div className="relative">
            <div className="modern-card p-8 max-w-md mx-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                  D0C
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Emergency Ready</h3>
                <p className="text-gray-600">Healthcare at your fingertips</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Instant Provider Access</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Secure Health Records</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <Star className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">24/7 Support</span>
                </div>
              </div>
            </div>
            
            {/* Floating badges */}
            <div className="absolute -top-4 -right-4 trust-badge">
              Emergency Ready
            </div>
            <div className="absolute -bottom-4 -left-4 trust-badge bg-blue-100 text-blue-800">
              HIPAA Secure
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
