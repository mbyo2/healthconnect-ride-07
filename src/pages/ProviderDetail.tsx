
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Clock, Star, CalendarPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProviderReviews } from "@/components/reviews/ProviderReviews";

const ProviderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider-detail', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching provider profile:', error);
        throw error;
      }

      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p className="text-muted-foreground">Loading provider details...</p>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p className="text-muted-foreground">Provider not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {provider.first_name} {provider.last_name}
                  </CardTitle>
                  {provider.specialty && (
                    <CardDescription className="text-lg">{provider.specialty}</CardDescription>
                  )}
                </div>
                <Button size="lg" onClick={() => navigate(`/search?provider=${id}`)}>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Book Appointment
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{provider.address || 'Address not available'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{provider.phone || 'Phone not available'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Hours not available</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              {provider.bio && (
                <p className="text-muted-foreground">{provider.bio}</p>
              )}
            </CardContent>
          </Card>

          {/* Patient Reviews */}
          {id && <ProviderReviews providerId={id} />}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Languages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Language details not available</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Insurance Accepted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {provider.accepted_insurances && provider.accepted_insurances.length > 0 ? (
                  provider.accepted_insurances.map((insurance: string, index: number) => (
                    <div key={index} className="text-sm text-muted-foreground">{insurance}</div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">Insurance details not available.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProviderDetail;
