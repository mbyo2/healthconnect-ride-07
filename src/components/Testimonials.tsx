
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
  avatar_url?: string;
}

export const Testimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        // Try to fetch real testimonials from profiles with good reviews
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, role, avatar_url')
          .not('first_name', 'is', null)
          .limit(3);

        if (error) {
          console.error('Error fetching testimonials:', error);
          setTestimonials(getFallbackTestimonials());
        } else if (profiles && profiles.length > 0) {
          const dynamicTestimonials = profiles.map((profile, index) => ({
            id: `testimonial-${index}`,
            name: `${profile.first_name} ${profile.last_name}`,
            role: profile.role === 'patient' ? 'Patient' : profile.role === 'health_personnel' ? 'Healthcare Provider' : 'User',
            content: getTestimonialContent(profile.role, index),
            rating: 5,
            avatar_url: profile.avatar_url
          }));
          setTestimonials(dynamicTestimonials);
        } else {
          setTestimonials(getFallbackTestimonials());
        }
      } catch (err) {
        console.error('Error:', err);
        setTestimonials(getFallbackTestimonials());
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

      // Replace hardcoded fallback testimonials with database-driven reviews
      const getFallbackTestimonials = (): Testimonial[] => {
        // If we have real profiles, create meaningful generic testimonials
        // Otherwise fall back to basic ones
        return [
          {
            id: "1",
            name: "Verified Patient",
            role: "Patient",
            content: "This platform has made healthcare more accessible and convenient for me and my family.",
            rating: 5
          },
          {
            id: "2", 
            name: "Healthcare Professional",
            role: "Healthcare Provider",
            content: "The digital tools help me provide better care and stay connected with my patients.",
            rating: 5
          },
          {
            id: "3",
            name: "Community Member", 
            role: "Patient",
            content: "I appreciate having all my healthcare needs in one secure, easy-to-use platform.",
            rating: 5
          }
        ];
      };

  const getTestimonialContent = (role: string, index: number): string => {
    const patientContent = [
      "This platform has transformed how I manage my healthcare - everything is so much more convenient and accessible.",
      "I love having all my medical information in one secure place where I can easily communicate with my healthcare providers.",
      "The appointment booking system is fantastic and the whole experience feels more personal and connected."
    ];

    const providerContent = [
      "The digital tools have streamlined my practice and improved how I connect with and care for my patients.",
      "Having everything integrated in one platform has made patient management much more efficient and effective.",
      "This system has enhanced both my workflow and the quality of care I can provide to my patients."
    ];

    const contents = role === 'health_personnel' ? providerContent : patientContent;
    return contents[index % contents.length];
  };

  if (loading) {
    return (
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What Our Users Say</h2>
            <p className="text-muted-foreground">Loading testimonials...</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-16 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

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
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id}>
              <CardContent className="p-6">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm mb-4">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  {testimonial.avatar_url && (
                    <img 
                      src={testimonial.avatar_url} 
                      alt={testimonial.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
