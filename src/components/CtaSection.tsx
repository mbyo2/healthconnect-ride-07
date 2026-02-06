import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, CheckCircle, MapPin, Phone, CreditCard } from 'lucide-react';
import { ZAMBIAN_STATS, ZAMBIA_CONFIG } from '@/config/zambia';

export const CtaSection = () => {
  return (
    <section className="py-12 md:py-16 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      
      <div className="container-modern relative">
        <div className="text-center max-w-4xl mx-auto">
          {/* Icon with Zambian flag colors accent */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm relative">
              <Shield className="h-10 md:h-12 w-10 md:w-12 text-white" />
              <div className="absolute -top-1 -right-1 text-lg">🇿🇲</div>
            </div>
          </div>
          
          {/* Headline */}
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-4 md:mb-6 leading-tight">
            Healthcare for
            <span className="block text-orange-300">Every Zambian</span>
          </h2>
          
          {/* Subheadline */}
          <p className="text-base md:text-xl mb-6 md:mb-8 opacity-90 leading-relaxed max-w-2xl mx-auto px-4">
            Join {ZAMBIAN_STATS.patients} Zambians who trust Doc' O Clock for quality healthcare. 
            Find doctors, order medicine, and get emergency care—all in one app.
          </p>
          
          {/* Benefits row - Zambian focused */}
          <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center gap-3 md:gap-6 mb-6 md:mb-8 text-xs md:text-sm px-4">
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="h-4 w-4 text-green-300 flex-shrink-0" />
              <span className="whitespace-nowrap">Free to start</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <CreditCard className="h-4 w-4 text-yellow-300 flex-shrink-0" />
              <span className="whitespace-nowrap">Mobile Money</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <MapPin className="h-4 w-4 text-emerald-300 flex-shrink-0" />
              <span className="whitespace-nowrap">All 10 provinces</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <Phone className="h-4 w-4 text-red-300 flex-shrink-0" />
              <span className="whitespace-nowrap">24/7 Emergency</span>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-sm sm:max-w-md mx-auto mb-6 md:mb-8 px-4">
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
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
          
          {/* Trust indicators - Zambian stats */}
          <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-xl sm:max-w-2xl mx-auto px-4">
            <div className="text-center">
              <div className="text-lg md:text-2xl font-bold text-emerald-300">{ZAMBIAN_STATS.doctors}</div>
              <div className="text-[10px] md:text-sm opacity-80 leading-tight">Doctors</div>
            </div>
            <div className="text-center">
              <div className="text-lg md:text-2xl font-bold text-blue-300">{ZAMBIAN_STATS.hospitals}</div>
              <div className="text-[10px] md:text-sm opacity-80 leading-tight">Hospitals</div>
            </div>
            <div className="text-center">
              <div className="text-lg md:text-2xl font-bold text-orange-300">{ZAMBIAN_STATS.pharmacies}</div>
              <div className="text-[10px] md:text-sm opacity-80 leading-tight">Pharmacies</div>
            </div>
            <div className="text-center">
              <div className="text-lg md:text-2xl font-bold text-yellow-300">4.8★</div>
              <div className="text-[10px] md:text-sm opacity-80 leading-tight">Rating</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
