import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MapPin, Quote } from 'lucide-react';
import { usePlatformStats, formatStat } from '@/hooks/usePlatformStats';

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
  const stats = usePlatformStats();

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
    <section className="vf-section bg-canvas-bone border-t border-canvas-silk">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <div className="vf-eyebrow mb-5">
            <Quote className="h-3.5 w-3.5 text-accent-500" />
            Real Stories from Our Users
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-medium text-midnight tracking-tight">
            What Our Users Say
          </h2>
          <p className="text-base text-graphite-500 max-w-xl mx-auto font-normal mt-4 leading-relaxed tracking-wide">
            Join thousands of people who trust Doc' O Clock for their healthcare needs
          </p>
        </div>
        
        {/* Mobile: Single testimonial with dots */}
        <div className="md:hidden">
          <div className="vf-card">
            <div className="flex mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm mb-4 text-graphite-600 leading-relaxed tracking-wide">
              "{testimonials[activeIndex]?.content}"
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-midnight">{testimonials[activeIndex]?.name}</p>
                <div className="flex items-center gap-1 text-xs text-graphite-500">
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
          </div>
          
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
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="vf-card space-y-4 group">
              <div className="flex">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-graphite-600 leading-relaxed tracking-wide group-hover:text-graphite-700 transition-colors">
                "{testimonial.content}"
              </p>
              <div className="pt-3 border-t border-canvas-mist flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium text-xs shrink-0">
                  {testimonial.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-medium text-midnight">{testimonial.name}</p>
                  <div className="flex items-center gap-1 text-xs text-graphite-500">
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
            </div>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-4 md:gap-6 text-sm text-graphite-500">
            <span className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" /> {stats.rating}/5 average rating
            </span>
            <span>•</span>
            <span>{formatStat(stats.patients)} users across Zambia</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">Growing nationwide</span>
          </div>
        </div>
      </div>
    </section>
  );
};
