import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, Phone, Clock, Users, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Institution {
  id: string;
  name: string;
  type: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  is_verified: boolean;
}

const HealthcareInstitutions = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('healthcare_institutions')
        .select('*')
        .eq('is_verified', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstitutions(data || []);
    } catch (error) {
      console.error('Error fetching institutions:', error);
      toast.error('Failed to load healthcare institutions');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Healthcare Institutions | Doc' O Clock</title>
        <meta name="description" content="Discover hospitals, clinics, and healthcare facilities near you in Zambia" />
      </Helmet>

      <div className="container mx-auto py-4 sm:py-8 space-y-4 sm:space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Healthcare Institutions</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Discover hospitals, clinics, and healthcare facilities near you
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : institutions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No Healthcare Institutions Found</p>
              <p className="text-sm text-muted-foreground">
                Check back later as more institutions join our platform
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {institutions.map((institution) => {
              const location = [institution.address, institution.city, institution.state, institution.country]
                .filter(Boolean)
                .join(', ') || 'Location not specified';
              
              return (
                <Card key={institution.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Building className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg sm:text-xl mb-1 break-words">{institution.name}</CardTitle>
                          <CardDescription className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs">{institution.type}</Badge>
                            {institution.is_verified && (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                Verified
                              </Badge>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span className="break-words">{location}</span>
                    </div>

                    {institution.phone && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <a href={`tel:${institution.phone}`} className="hover:text-primary">
                          {institution.phone}
                        </a>
                      </div>
                    )}

                    {institution.email && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <a href={`mailto:${institution.email}`} className="hover:text-primary truncate">
                          {institution.email}
                        </a>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button size="sm" className="flex-1 text-xs sm:text-sm">
                        View Details
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs sm:text-sm"
                        onClick={() => {
                          if (institution.address) {
                            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
                            window.open(mapUrl, '_blank');
                          } else {
                            toast.error('Location not available');
                          }
                        }}
                      >
                        Get Directions
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

export default HealthcareInstitutions;
