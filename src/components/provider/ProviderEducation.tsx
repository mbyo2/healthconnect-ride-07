
import React from "react";
import { Card } from "@/components/ui/card";
import { GraduationCap, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProviderEducationProps {
  providerId: string | undefined;
}

export const ProviderEducation: React.FC<ProviderEducationProps> = ({ providerId }) => {
  // This would fetch from an education table in a real implementation
  const education = [
    {
      id: "1",
      degree: "Doctor of Medicine (MD)",
      institution: "University of Zambia School of Medicine",
      year: "2010 - 2014",
      description: "Graduated with honors"
    },
    {
      id: "2",
      degree: "Residency in Internal Medicine",
      institution: "University Teaching Hospital, Lusaka",
      year: "2014 - 2017",
      description: "Specialized in cardiovascular health"
    },
    {
      id: "3",
      degree: "Fellowship in Cardiology",
      institution: "Groote Schuur Hospital, Cape Town",
      year: "2017 - 2019",
      description: "Advanced training in cardiovascular care"
    }
  ];

  // This would fetch from a certifications table in a real implementation
  const certifications = [
    {
      id: "1",
      name: "Board Certified in Internal Medicine",
      issuer: "Medical Council of Zambia",
      year: "2017"
    },
    {
      id: "2",
      name: "Advanced Cardiovascular Life Support (ACLS)",
      issuer: "American Heart Association",
      year: "2020"
    },
    {
      id: "3",
      name: "Certified in Medical Practice Management",
      issuer: "Healthcare Management Association",
      year: "2021"
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Education
        </h2>
        
        <div className="space-y-4">
          {education.map(edu => (
            <div key={edu.id} className="border-l-2 border-primary pl-4 pb-4 last:pb-0">
              <p className="font-semibold">{edu.degree}</p>
              <p className="text-sm">{edu.institution}</p>
              <p className="text-sm text-muted-foreground">{edu.year}</p>
              <p className="text-sm text-muted-foreground mt-1">{edu.description}</p>
            </div>
          ))}
        </div>
      </Card>
      
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Award className="h-5 w-5" />
          Certifications & Licenses
        </h2>
        
        <div className="space-y-3">
          {certifications.map(cert => (
            <div key={cert.id} className="flex justify-between items-center">
              <div>
                <p className="font-medium">{cert.name}</p>
                <p className="text-sm text-muted-foreground">{cert.issuer}</p>
              </div>
              <Badge variant="outline">{cert.year}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
