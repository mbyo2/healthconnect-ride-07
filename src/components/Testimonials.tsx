
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';

export const Testimonials = () => {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Patient",
      content: "Doc' O Clock made it so easy to find the right doctor and book my appointment. The platform is user-friendly and secure.",
      rating: 5
    },
    {
      name: "Dr. Michael Chen",
      role: "Healthcare Provider",
      content: "Managing my practice has never been easier. The scheduling system and patient communication tools are excellent.",
      rating: 5
    },
    {
      name: "Emma Wilson",
      role: "Patient",
      content: "I love how I can access all my medical records in one place and communicate with my doctor securely.",
      rating: 5
    }
  ];

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">What Our Users Say</h2>
          <p className="text-muted-foreground">
            Trusted by thousands of patients and healthcare providers
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm mb-4">"{testimonial.content}"</p>
                <div>
                  <p className="font-medium">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
