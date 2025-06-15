
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Stethoscope, MapPin, Star, Calendar } from 'lucide-react';

const HealthcareProfessionals = () => {
  const professionals = [
    {
      id: '1',
      name: 'Dr. Sarah Johnson',
      specialty: 'Cardiologist',
      location: 'Lusaka, Zambia',
      rating: 4.8,
      experience: '10+ years',
      image: '/placeholder.svg'
    },
    {
      id: '2',
      name: 'Dr. Michael Chen',
      specialty: 'General Practitioner',
      location: 'Ndola, Zambia',
      rating: 4.6,
      experience: '8+ years',
      image: '/placeholder.svg'
    }
  ];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Healthcare Professionals</h1>
        <p className="text-muted-foreground">
          Find and connect with qualified healthcare providers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {professionals.map((professional) => (
          <Card key={professional.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={professional.image} />
                  <AvatarFallback>
                    {professional.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{professional.name}</CardTitle>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Stethoscope className="h-3 w-3" />
                    {professional.specialty}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-sm">
                  <MapPin className="h-3 w-3" />
                  {professional.location}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{professional.rating}</span>
                </div>
              </div>

              <Badge variant="secondary">{professional.experience}</Badge>

              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1">
                  <Calendar className="h-3 w-3 mr-1" />
                  Book Appointment
                </Button>
                <Button size="sm" variant="outline">
                  View Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default HealthcareProfessionals;
