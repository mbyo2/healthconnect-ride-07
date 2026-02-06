import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MapPin, Quote } from 'lucide-react';
import { ZAMBIAN_TESTIMONIALS } from '@/config/zambia';

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

  // Create testimonials from Zambian config
  const testimonials: Testimonial[] = useMemo(() => 
    ZAMBIAN_TESTIMONIALS.slice(0, 6).map((t, i) => ({
      id: `zambian-${i}`,
      name: t.name,
      role: t.role,
      city: t.city,
      content: t.content,
      rating: 5,
    })),
  []);

  // Auto-rotate testimonials on mobile
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
            Real Stories from Zambians
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-foreground">
            What Our Users Say
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
            Join thousands of Zambians who trust Doc' O Clock for their healthcare needs
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
          
          {/* Dots indicator */}
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
        
        {/* Desktop: Grid of testimonials */}
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
            <span>10,000+ users across Zambia</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">All 10 provinces covered</span>
          </div>
        </div>
      </div>
    </section>
  );
};
