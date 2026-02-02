import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, Star, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLogo } from '@/components/ui/AppLogo';

export const Hero = () => {
  return (
    <div className="bg-gradient-to-b from-primary/5 to-background dark:from-primary/10 dark:to-background">
      <div className="container-modern py-16">
        {/* Trust indicators row */}
        <div className="flex flex-wrap justify-center items-center gap-6 mb-8 text-sm">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Shield className="h-4 w-4" />
            <span className="font-medium">HIPAA Compliant</span>
          </div>
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">Verified Providers</span>
          </div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <Star className="h-4 w-4 fill-current" />
            <span className="font-medium">4.8/5 Rating</span>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="h-4 w-4" />
            <span className="font-medium">50,000+ Users</span>
          </div>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - Content */}
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start mb-6">
              <AppLogo size="lg" className="p-4 bg-primary/10 rounded-2xl border border-primary/20" />
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 text-foreground leading-tight">
              Healthcare Made
              <span className="text-primary block">Simple & Secure</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-xl">
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
            <p className="text-sm text-muted-foreground">
              Trusted by 50,000+ patients worldwide • Free to start • No credit card required
            </p>
          </div>
          
          {/* Right column - Visual */}
          <div className="relative">
            <div className="bg-card border border-border rounded-xl shadow-lg p-8 max-w-md mx-auto">
              <div className="text-center mb-6">
                <img 
                  src="/d0c-icon.svg" 
                  alt="Doc' O Clock" 
                  className="w-16 h-16 mx-auto mb-4 object-contain"
                />
                <h3 className="text-xl font-semibold text-foreground mb-2">Emergency Ready</h3>
                <p className="text-muted-foreground">Healthcare at your fingertips</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-500/10 dark:bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-foreground">Instant Provider Access</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-primary/10 dark:bg-primary/20 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">Secure Health Records</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-orange-500/10 dark:bg-orange-500/20 rounded-lg">
                  <Star className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-foreground">24/7 Support</span>
                </div>
              </div>
            </div>
            
            {/* Floating badges */}
            <div className="absolute -top-4 -right-4 bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-xs font-medium border border-green-500/20">
              Emergency Ready
            </div>
            <div className="absolute -bottom-4 -left-4 bg-primary/10 dark:bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-medium border border-primary/20">
              HIPAA Secure
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
