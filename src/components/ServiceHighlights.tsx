import React from 'react';
import { Calendar, Search, Shield, Clock, CheckCircle, Pill, Building2, Phone, CreditCard, Video } from 'lucide-react';
import { usePlatformStats, formatStat } from '@/hooks/usePlatformStats';

export const ServiceHighlights = () => {
  const stats = usePlatformStats();

  const services = [
    {
      icon: <Search className="h-5 w-5 text-primary-500" />,
      title: "Find Trusted Doctors",
      description: "Search verified healthcare providers in your area and beyond",
      stat: formatStat(stats.doctors),
      statLabel: "doctors"
    },
    {
      icon: <Building2 className="h-5 w-5 text-primary-500" />,
      title: "Connected Hospitals",
      description: "Access major hospitals and clinics on the platform",
      stat: formatStat(stats.hospitals),
      statLabel: "hospitals"
    },
    {
      icon: <Calendar className="h-5 w-5 text-primary-500" />,
      title: "Easy Scheduling",
      description: "Book appointments instantly with real-time availability",
      stat: formatStat(stats.appointments),
      statLabel: "bookings"
    },
    {
      icon: <Pill className="h-5 w-5 text-primary-500" />,
      title: "Pharmacy Network",
      description: "Order medicine online from registered pharmacies with delivery",
      stat: formatStat(stats.pharmacies),
      statLabel: "pharmacies"
    },
    {
      icon: <CreditCard className="h-5 w-5 text-primary-500" />,
      title: "Flexible Payments",
      description: "Pay with mobile money, cards, or insurance",
      stat: "5+",
      statLabel: "methods"
    },
    {
      icon: <Video className="h-5 w-5 text-primary-500" />,
      title: "Video Consultations",
      description: "See a doctor from anywhere via secure video call",
      stat: "24/7",
      statLabel: "available"
    },
    {
      icon: <Shield className="h-5 w-5 text-success-500" />,
      title: "Insurance Support",
      description: "Integrated with major insurance providers for covered services",
      stat: "100%",
      statLabel: "secure"
    },
    {
      icon: <Phone className="h-5 w-5 text-accent-500" />,
      title: "Emergency Response",
      description: "Quick access to ambulance, police, and nearby hospitals",
      stat: "24/7",
      statLabel: "emergency"
    }
  ];

  return (
    <section className="vf-section bg-white border-t border-canvas-silk">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <div className="vf-eyebrow mb-5">
            <CheckCircle className="h-3.5 w-3.5 text-success-500" />
            Comprehensive Healthcare Platform
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-medium text-midnight tracking-tight">
            Everything You Need for Better Healthcare
          </h2>
          <p className="text-base text-graphite-500 max-w-xl mx-auto font-normal mt-4 leading-relaxed tracking-wide">
            Connecting {formatStat(stats.patients)} users to quality healthcare providers across Zambia
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="vf-card space-y-3 group"
            >
              <div className="p-2.5 rounded-2xl bg-primary-50 w-fit border border-primary-100 group-hover:bg-primary-100 transition-colors">
                {service.icon}
              </div>
              <div>
                <h3 className="font-medium text-midnight text-sm md:text-base mb-2">
                  {service.title}
                </h3>
                <p className="text-graphite-500 text-xs md:text-sm leading-relaxed mb-3 line-clamp-2 tracking-wide">
                  {service.description}
                </p>
                <div className="flex items-baseline gap-1.5 text-xs">
                  <span className="font-display text-lg text-primary-500">{service.stat}</span>
                  <span className="text-graphite-400 tracking-wide">{service.statLabel}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-success-50 text-success-600 text-sm font-medium border border-success-100">
            <CheckCircle className="h-4 w-4" />
            Free to start • Pay only for services you use
          </div>
        </div>
      </div>
    </section>
  );
};
