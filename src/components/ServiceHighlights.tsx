
import React from "react";
import { 
  Stethoscope, 
  Video, 
  Home, 
  Calendar, 
  Pill, 
  PenTool
} from "lucide-react";

export const ServiceHighlights = () => {
  const services = [
    {
      icon: <Stethoscope className="h-10 w-10 text-blue-500" />,
      title: "Specialist Consultations",
      description: "Connect with medical specialists across various fields."
    },
    {
      icon: <Video className="h-10 w-10 text-indigo-500" />,
      title: "Video Appointments",
      description: "Get medical advice from the comfort of your home."
    },
    {
      icon: <Home className="h-10 w-10 text-emerald-500" />,
      title: "Home Visits",
      description: "Healthcare professionals at your doorstep when needed."
    },
    {
      icon: <Calendar className="h-10 w-10 text-purple-500" />,
      title: "Easy Scheduling",
      description: "Book appointments that fit your busy schedule."
    },
    {
      icon: <Pill className="h-10 w-10 text-rose-500" />,
      title: "Prescription Management",
      description: "Manage and renew your prescriptions seamlessly."
    },
    {
      icon: <PenTool className="h-10 w-10 text-amber-500" />,
      title: "Medical Records",
      description: "Keep all your medical history in one secure place."
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-muted/50 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Comprehensive Healthcare Services
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our platform connects you with a wide range of healthcare services 
            tailored to meet your specific needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index}
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100"
            >
              <div className="mb-4">{service.icon}</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">{service.title}</h3>
              <p className="text-gray-600">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
