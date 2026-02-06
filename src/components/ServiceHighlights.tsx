import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Search, MessageSquare, FileText, Shield, Clock, CheckCircle, Pill, Building2, Phone, CreditCard, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ZAMBIAN_STATS } from '@/config/zambia';

export const ServiceHighlights = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAppointments: 0,
    totalMessages: 0,
    totalProviders: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersCount, appointmentsCount, messagesCount, providersCount] = await Promise.all([
          supabase.from('profiles' as any).select('id', { count: 'exact', head: true }),
          supabase.from('appointments' as any).select('id', { count: 'exact', head: true }),
          supabase.from('messages' as any).select('id', { count: 'exact', head: true }),
          supabase.from('profiles' as any).select('id', { count: 'exact', head: true }).eq('role', 'health_personnel')
        ]);

        setStats({
          totalUsers: usersCount.count || 0,
          totalAppointments: appointmentsCount.count || 0,
          totalMessages: messagesCount.count || 0,
          totalProviders: providersCount.count || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  const services = [
    {
      icon: <Search className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      title: "Find Trusted Doctors",
      description: "Search verified healthcare providers across all 10 provinces of Zambia",
      stat: ZAMBIAN_STATS.doctors,
      statLabel: "doctors"
    },
    {
      icon: <Building2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
      title: "Connected Hospitals",
      description: "Access to UTH, Levy Mwanawasa, and major hospitals nationwide",
      stat: ZAMBIAN_STATS.hospitals,
      statLabel: "hospitals"
    },
    {
      icon: <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
      title: "Easy Scheduling",
      description: "Book appointments instantly with real-time availability",
      stat: `${stats.totalAppointments || '1000'}+`,
      statLabel: "bookings"
    },
    {
      icon: <Pill className="h-6 w-6 text-orange-600 dark:text-orange-400" />,
      title: "Pharmacy Network",
      description: "Order medicine online from registered pharmacies with delivery",
      stat: ZAMBIAN_STATS.pharmacies,
      statLabel: "pharmacies"
    },
    {
      icon: <CreditCard className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
      title: "Mobile Money Payments",
      description: "Pay easily with MTN, Airtel, or Zamtel Mobile Money",
      stat: "3",
      statLabel: "providers"
    },
    {
      icon: <Video className="h-6 w-6 text-red-600 dark:text-red-400" />,
      title: "Video Consultations",
      description: "See a doctor from anywhere in Zambia via secure video call",
      stat: "24/7",
      statLabel: "available"
    },
    {
      icon: <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />,
      title: "NHIMA Support",
      description: "Integrated with National Health Insurance for covered services",
      stat: "100%",
      statLabel: "secure"
    },
    {
      icon: <Phone className="h-6 w-6 text-red-600 dark:text-red-400" />,
      title: "Emergency Response",
      description: "Quick access to ambulance (991), police (999), and hospitals",
      stat: "24/7",
      statLabel: "emergency"
    }
  ];

  return (
    <section className="py-12 md:py-16 bg-muted/50">
      <div className="container-modern">
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-xs font-medium mb-4">
            <CheckCircle className="h-3 w-3" />
            Built for Zambia
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4 text-foreground">
            Everything You Need for Better Healthcare
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Connecting {ZAMBIAN_STATS.patients} Zambians to quality healthcare across all provinces
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="bg-card border border-border rounded-xl p-4 md:p-6 hover:shadow-lg transition-all group"
            >
              <div className="flex flex-col gap-3">
                <div className="p-2 md:p-3 bg-muted rounded-xl group-hover:bg-primary/10 transition-colors w-fit">
                  {service.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm md:text-base mb-1 md:mb-2">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground text-xs md:text-sm leading-relaxed mb-2 md:mb-3 line-clamp-2">
                    {service.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-primary">{service.stat}</span>
                    <span className="text-muted-foreground">{service.statLabel}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-8 md:mt-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            Free to start • Pay only for services you use
          </div>
        </div>
      </div>
    </section>
  );
};
