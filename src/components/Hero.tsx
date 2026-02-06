import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, Star, MapPin, Phone, Clock, Heart, Users, Stethoscope, Building2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLogo } from '@/components/ui/AppLogo';
import { ZAMBIA_CONFIG, ZAMBIAN_STATS } from '@/config/zambia';

export const Hero = () => {
  const navigate = useNavigate();

  const quickActions = [
    { icon: Stethoscope, label: 'Find Doctor', route: '/marketplace-users', color: 'text-blue-600 dark:text-blue-400' },
    { icon: Building2, label: 'Hospitals', route: '/healthcare-institutions', color: 'text-emerald-600 dark:text-emerald-400' },
    { icon: Heart, label: 'Emergency', route: '/emergency', color: 'text-red-600 dark:text-red-400' },
    { icon: Phone, label: 'Call 991', route: 'tel:991', color: 'text-orange-600 dark:text-orange-400' },
  ];

  return (
    <div className="bg-gradient-to-b from-primary/5 via-blue-50/50 to-background dark:from-primary/10 dark:via-blue-900/10 dark:to-background">
      <div className="container-modern py-12 md:py-16">
        {/* Zambian Trust indicators */}
        <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 mb-8 text-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <MapPin className="h-4 w-4" />
            <span className="font-medium">Proudly Zambian</span>
          </div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Shield className="h-4 w-4" />
            <span className="font-medium">NHIMA Partner</span>
          </div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <Star className="h-4 w-4 fill-current" />
            <span className="font-medium">4.8/5 Rating</span>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <Clock className="h-4 w-4" />
            <span className="font-medium">24/7 Emergency</span>
          </div>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left column - Content */}
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start mb-6">
              <AppLogo size="lg" className="p-4 bg-primary/10 rounded-2xl border border-primary/20" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 md:mb-6 text-foreground leading-tight">
              Healthcare for
              <span className="text-primary block">Every Zambian</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-6 md:mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Connect with trusted doctors, hospitals, and pharmacies across Zambia. 
              Book appointments, order medicine, and get emergency care—all in one app.
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-8 max-w-md mx-auto lg:mx-0">
              <div className="text-center p-2 md:p-3 bg-card rounded-xl border border-border">
                <div className="text-lg md:text-xl font-bold text-primary">{ZAMBIAN_STATS.doctors}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Doctors</div>
              </div>
              <div className="text-center p-2 md:p-3 bg-card rounded-xl border border-border">
                <div className="text-lg md:text-xl font-bold text-emerald-600">{ZAMBIAN_STATS.hospitals}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Hospitals</div>
              </div>
              <div className="text-center p-2 md:p-3 bg-card rounded-xl border border-border">
                <div className="text-lg md:text-xl font-bold text-blue-600">{ZAMBIAN_STATS.pharmacies}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Pharmacies</div>
              </div>
              <div className="text-center p-2 md:p-3 bg-card rounded-xl border border-border">
                <div className="text-lg md:text-xl font-bold text-orange-600">{ZAMBIAN_STATS.provinces}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Provinces</div>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
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
            <p className="text-xs md:text-sm text-muted-foreground">
              Trusted by {ZAMBIAN_STATS.patients} Zambians • Free to start • Pay with Mobile Money
            </p>
          </div>
          
          {/* Right column - Quick Actions & Visual */}
          <div className="relative">
            {/* Quick Action Cards for mobile */}
            <div className="grid grid-cols-2 gap-3 md:hidden mb-6">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => action.route.startsWith('tel:') ? window.location.href = action.route : navigate(action.route)}
                  className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:shadow-lg transition-all active:scale-95"
                >
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                  <span className="font-medium text-sm text-foreground">{action.label}</span>
                </button>
              ))}
            </div>

            {/* Desktop card */}
            <div className="hidden md:block bg-card border border-border rounded-xl shadow-lg p-6 lg:p-8 max-w-md mx-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Heart className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Your Health, Our Priority</h3>
                <p className="text-muted-foreground text-sm">Quality healthcare across all 10 provinces of Zambia</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg">
                  <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-foreground">Find doctors near you</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg">
                  <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-foreground">UTH & major hospitals connected</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-orange-500/10 dark:bg-orange-500/20 rounded-lg">
                  <Phone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-foreground">Emergency: Call 991 instantly</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-primary/10 dark:bg-primary/20 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">NHIMA insurance support</span>
                </div>
              </div>
            </div>
            
            {/* Floating badges */}
            <div className="hidden lg:block absolute -top-4 -right-4 bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-xs font-medium border border-red-500/20">
              🚨 Emergency Ready
            </div>
            <div className="hidden lg:block absolute -bottom-4 -left-4 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-medium border border-emerald-500/20">
              🇿🇲 Made for Zambia
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};