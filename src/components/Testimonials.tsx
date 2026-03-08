import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MapPin, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    role: 'Patient',
    city: 'Lusaka',
    content: "Doc' O Clock has made healthcare so much easier for my family. I can book appointments without queuing for hours!",
  },
  {
    name: 'Dr. James K.',
    role: 'Healthcare Provider',
    city: 'Nairobi',
    content: 'This platform helps me reach more patients and manage my practice efficiently. A game-changer for healthcare delivery.',
  },
  {
    name: 'Maria L.',
    role: 'Mother of Two',
    city: 'Lagos',
    content: "The emergency feature is incredible. I found the nearest hospital and got help within minutes.",
  },
  {
    name: 'David N.',
    role: 'Pharmacy Owner',
    city: 'Lusaka',
    content: 'Managing prescriptions and inventory has never been easier. My customers love ordering medicine through the app.',
  },
  {
    name: 'Grace T.',
    role: 'Patient',
    city: 'Dar es Salaam',
    content: 'Living far from major hospitals, this app connects me to doctors via video call. Truly life-changing technology!',
  },
  {
    name: 'Dr. Amina B.',
    role: 'Specialist',
    city: 'Accra',
    content: 'The platform helps me manage referrals and follow up with patients. Healthcare is becoming more accessible for everyone.',
  },
];

interface Testimonial {
  id: string;
  name: string;
  role: string;
  city?: string;
  content: string;
  rating: number;
  avatar_url?: string;
}

export const Testimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const testimonials: Testimonial[] = useMemo(() => 
    TESTIMONIALS.map((t, i) => ({
      id: `testimonial-${i}`,
      name: t.name,
      role: t.role,
      city: t.city,
      content: t.content,
      rating: 5,
    })),
  []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <section className="py-12 md:py-16 px-4 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-xs font-medium mb-4">
            <Quote className="h-3 w-3" />
            Real Stories from Our Users
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-foreground">
            What Our Users Say
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
            Join thousands of people who trust Doc' O Clock for their healthcare needs
          </p>
        </div>
        
        {/* Mobile: Single testimonial with dots */}
        <div className="md:hidden">
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-6">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
              <p className="text-sm mb-4 text-foreground leading-relaxed">
                "{testimonials[activeIndex]?.content}"
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{testimonials[activeIndex]?.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{testimonials[activeIndex]?.role}</span>
                    {testimonials[activeIndex]?.city && (
                      <>
                        <span>•</span>
                        <MapPin className="h-3 w-3" />
                        <span>{testimonials[activeIndex]?.city}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-center gap-2 mt-4">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === activeIndex ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Desktop: Grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="bg-card border-border hover:shadow-lg transition-shadow group">
              <CardContent className="p-6">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-sm mb-4 text-foreground leading-relaxed group-hover:text-foreground/90">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-sm">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{testimonial.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{testimonial.role}</span>
                      {testimonial.city && (
                        <>
                          <span>•</span>
                          <MapPin className="h-3 w-3" />
                          <span>{testimonial.city}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="mt-8 md:mt-12 text-center">
          <div className="inline-flex items-center gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="text-yellow-500">★</span> 4.8/5 average rating
            </span>
            <span>•</span>
            <span>10,000+ users worldwide</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">Growing globally</span>
          </div>
        </div>
      </div>
    </section>
  );
};
