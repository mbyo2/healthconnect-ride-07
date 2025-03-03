
import React from "react";
import { Star } from "lucide-react";

export const Testimonials = () => {
  const testimonials = [
    {
      quote: "This platform has transformed how I access healthcare. Getting a doctor to visit my home when my child was sick was incredibly convenient.",
      author: "Sarah Johnson",
      role: "Parent",
      rating: 5
    },
    {
      quote: "As someone with a busy schedule, the video consultations have been a lifesaver. Quick, efficient, and just as effective as in-person visits.",
      author: "Michael Chen",
      role: "Business Professional",
      rating: 5
    },
    {
      quote: "The specialist I connected with through this platform provided exceptional care. The entire process was smooth from booking to follow-up.",
      author: "Elena Rodriguez",
      role: "Patient",
      rating: 4
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-blue-50/30 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What Our Users Say
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover how our platform is making healthcare more accessible for people like you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-white p-8 rounded-xl shadow-md border border-gray-100 flex flex-col h-full"
            >
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-5 h-5 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
              <blockquote className="flex-grow">
                <p className="text-gray-600 italic leading-relaxed mb-4">"{testimonial.quote}"</p>
              </blockquote>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="font-semibold text-gray-800">{testimonial.author}</p>
                <p className="text-sm text-gray-500">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
