
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Search, MessageSquare, FileText, Package, Shield } from 'lucide-react';

export const ServiceHighlights = () => {
  const services = [
    {
      icon: <Search className="h-8 w-8 text-primary" />,
      title: "Find Providers",
      description: "Search and connect with qualified healthcare providers in your area"
    },
    {
      icon: <Calendar className="h-8 w-8 text-primary" />,
      title: "Easy Scheduling",
      description: "Book appointments with just a few clicks, available 24/7"
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-primary" />,
      title: "Secure Messaging",
      description: "Communicate securely with your healthcare providers"
    },
    {
      icon: <FileText className="h-8 w-8 text-primary" />,
      title: "Digital Records",
      description: "Access your medical records and prescriptions digitally"
    },
    {
      icon: <Package className="h-8 w-8 text-primary" />,
      title: "Pharmacy Integration",
      description: "Manage prescriptions and connect with pharmacies"
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "HIPAA Compliant",
      description: "Your health information is protected with industry-standard security"
    }
  ];

  return (
    <section className="py-16 px-4 bg-muted/50">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Healthcare Made Simple</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Experience seamless healthcare management with our comprehensive platform
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="mb-2">{service.icon}</div>
                <CardTitle>{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{service.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
