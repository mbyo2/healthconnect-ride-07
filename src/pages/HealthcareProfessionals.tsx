import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Stethoscope, MapPin, Star, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Professional {
  id: string;
  first_name: string;
  last_name: string;
  specialty?: string;
  city?: string;
  country?: string;
  avatar_url?: string;
  bio?: string;
}

const HealthcareProfessionals = () => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'health_personnel')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error('Error fetching professionals:', error);
      toast.error('Failed to load healthcare professionals');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Healthcare Professionals | Doc' O Clock</title>
        <meta name="description" content="Find and connect with qualified healthcare providers in Zambia" />
      </Helmet>

      <div className="container mx-auto py-4 sm:py-8 space-y-4 sm:space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Healthcare Professionals</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Find and connect with qualified healthcare providers
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : professionals.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No Healthcare Professionals Found</p>
              <p className="text-sm text-muted-foreground">
                Check back later as more professionals join our platform
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {professionals.map((professional) => {
              const fullName = `${professional.first_name || ''} ${professional.last_name || ''}`.trim();
              const location = [professional.city, professional.country].filter(Boolean).join(', ') || 'Location not specified';
              
              return (
                <Card key={professional.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={professional.avatar_url} />
                        <AvatarFallback>
                          {professional.first_name?.[0]}{professional.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{fullName}</CardTitle>
                        {professional.specialty && (
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                            <Stethoscope className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{professional.specialty}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">{location}</span>
                    </div>

                    {professional.bio && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {professional.bio}
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button 
                        size="sm" 
                        className="flex-1 text-xs sm:text-sm"
                        onClick={() => navigate('/appointments', { state: { providerId: professional.id } })}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Book Appointment
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs sm:text-sm"
                        onClick={() => navigate(`/profile?id=${professional.id}`)}
                      >
                        View Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default HealthcareProfessionals;
