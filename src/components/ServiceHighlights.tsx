
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Search, MessageSquare, FileText, Shield, Users } from 'lucide-react';

export const ServiceHighlights = () => {
  const services = [
    {
      icon: <Search className="h-8 w-8 text-trust-500" />,
      title: "Find Trusted Providers",
      description: "Search verified healthcare providers with patient reviews and credentials"
    },
    {
      icon: <Calendar className="h-8 w-8 text-trust-500" />,
      title: "Simple Scheduling",
      description: "Book appointments instantly with real-time availability"
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-trust-500" />,
      title: "Secure Communication",
      description: "HIPAA-compliant messaging with your healthcare team"
    },
    {
      icon: <FileText className="h-8 w-8 text-trust-500" />,
      title: "Digital Health Records",
      description: "Access your complete medical history anytime, anywhere"
    },
    {
      icon: <Shield className="h-8 w-8 text-trust-500" />,
      title: "Bank-Level Security",
      description: "Your health data protected with enterprise-grade encryption"
    },
    {
      icon: <Users className="h-8 w-8 text-trust-500" />,
      title: "24/7 Support",
      description: "Get help when you need it with our dedicated support team"
    }
  ];

  return (
    <section className="py-20 px-4 bg-white dark:bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-trust-900 dark:text-trust-100">
            Healthcare Made Simple & Secure
          </h2>
          <p className="text-trust-700 dark:text-trust-300 max-w-2xl mx-auto text-lg">
            Everything you need to manage your health in one trusted platform
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card key={index} className="trust-card border-0 hover:border-trust-200">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-trust-50 dark:bg-trust-900/20 rounded-full">
                    {service.icon}
                  </div>
                </div>
                <CardTitle className="text-trust-900 dark:text-trust-100 text-xl">
                  {service.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-trust-600 dark:text-trust-400 leading-relaxed">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
