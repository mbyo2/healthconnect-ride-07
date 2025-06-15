
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, Phone, Clock, Users } from 'lucide-react';

const HealthcareInstitutions = () => {
  const institutions = [
    {
      id: '1',
      name: 'University Teaching Hospital',
      type: 'Public Hospital',
      location: 'Lusaka, Zambia',
      phone: '+260 211 254 591',
      services: ['Emergency Care', 'Surgery', 'Maternity', 'Pediatrics'],
      status: 'verified'
    },
    {
      id: '2',
      name: 'Fairview Hospital',
      type: 'Private Hospital',
      location: 'Lusaka, Zambia',
      phone: '+260 211 251 566',
      services: ['General Medicine', 'Diagnostics', 'Specialist Care'],
      status: 'verified'
    }
  ];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Healthcare Institutions</h1>
        <p className="text-muted-foreground">
          Discover hospitals, clinics, and healthcare facilities near you
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {institutions.map((institution) => (
          <Card key={institution.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Building className="h-8 w-8 text-blue-600" />
                  <div>
                    <CardTitle className="text-xl">{institution.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{institution.type}</Badge>
                      {institution.status === 'verified' && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Verified
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {institution.location}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {institution.phone}
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Services Offered
                </h4>
                <div className="flex flex-wrap gap-1">
                  {institution.services.map((service, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1">
                  View Details
                </Button>
                <Button size="sm" variant="outline">
                  Get Directions
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default HealthcareInstitutions;
