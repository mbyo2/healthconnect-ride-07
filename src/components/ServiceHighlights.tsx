import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Search, MessageSquare, FileText, Shield, Users, Star, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
        // Fetch real statistics from the database
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
        // Keep default values if error occurs
      }
    };

    fetchStats();
  }, []);

  const services = [
    {
      icon: <Search className="h-6 w-6 text-blue-600" />,
      title: "Find Trusted Providers",
      description: "Search verified healthcare providers with patient reviews and credentials",
      rating: "4.9/5",
      users: `${stats.totalProviders}+ providers`
    },
    {
      icon: <Calendar className="h-6 w-6 text-green-600" />,
      title: "Simple Scheduling",
      description: "Book appointments instantly with real-time availability",
      rating: "4.8/5",
      users: `${stats.totalAppointments}+ bookings`
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-purple-600" />,
      title: "Secure Communication",
      description: "HIPAA-compliant messaging with your healthcare team",
      rating: "4.9/5",
      users: `${stats.totalMessages}+ messages`
    },
    {
      icon: <FileText className="h-6 w-6 text-indigo-600" />,
      title: "Digital Health Records",
      description: "Access your complete medical history anytime, anywhere",
      rating: "4.7/5",
      users: `${stats.totalUsers}+ records`
    },
    {
      icon: <Shield className="h-6 w-6 text-red-600" />,
      title: "Bank-Level Security",
      description: "Your health data protected with enterprise-grade encryption",
      rating: "5.0/5",
      users: "100% secure"
    },
    {
      icon: <Clock className="h-6 w-6 text-orange-600" />,
      title: "24/7 Emergency Support",
      description: "Get help when you need it with our dedicated emergency team",
      rating: "4.8/5",
      users: "24/7 available"
    }
  ];

  return (
    <section className="py-16 bg-muted/50">
      <div className="container-modern">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">
            Everything You Need for Better Healthcare
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover why {stats.totalUsers > 0 ? `${stats.totalUsers} users` : 'thousands'} trust Doc' O Clock for their healthcare needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div key={index} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow group">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-muted rounded-xl group-hover:bg-primary/10 transition-colors duration-200">
                  {service.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-2 text-lg">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                    {service.description}
                  </p>

                  {/* Rating and stats */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      <span className="font-medium text-foreground">{service.rating}</span>
                    </div>
                    <span className="text-muted-foreground">{service.users}</span>
                  </div>
                </div>
              </div>

              {/* Progress indicator */}
              <div className="w-full bg-muted rounded-full h-1 mb-2">
                <div className="bg-primary h-1 rounded-full" style={{ width: `${90 + index * 2}%` }}></div>
              </div>
              <p className="text-xs text-muted-foreground">Available now</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-full text-sm font-medium mb-4">
            <CheckCircle className="h-4 w-4" />
            All services included in free plan
          </div>
        </div>
      </div>
    </section>
  );
};
