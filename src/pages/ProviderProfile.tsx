
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Star, Clock, Award, User, Phone, Mail, FileText } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ProviderReviews } from "@/components/provider/ProviderReviews";
import { ProviderEducation } from "@/components/provider/ProviderEducation";

const ProviderProfile = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();

  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider', providerId],
    queryFn: async () => {
      if (!providerId) return null;
      
      console.log('Fetching provider details for:', providerId);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          specialty,
          bio,
          avatar_url,
          provider_type,
          email,
          phone,
          provider_locations (
            latitude,
            longitude
          )
        `)
        .eq('id', providerId)
        .single();

      if (error) {
        console.error('Error fetching provider:', error);
        throw error;
      }

      return {
        id: data.id,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        specialty: data.specialty || 'General Practice',
        bio: data.bio || 'No bio available',
        avatar_url: data.avatar_url,
        provider_type: data.provider_type,
        email: data.email,
        phone: data.phone,
        location: {
          latitude: data.provider_locations?.[0]?.latitude || -15.3875,
          longitude: data.provider_locations?.[0]?.longitude || 28.3228
        }
      };
    },
    enabled: !!providerId
  });

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-20 pb-24">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-bold mb-4">Provider Not Found</h2>
            <p className="text-muted-foreground mb-4">The provider you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/search')}>Back to Search</Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-20 pb-24">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Provider Info Card */}
          <Card className="p-6 lg:col-span-1">
            <div className="flex flex-col items-center text-center mb-6">
              <Avatar className="h-32 w-32 mb-4">
                {provider.avatar_url ? (
                  <img 
                    src={provider.avatar_url} 
                    alt={`${provider.first_name} ${provider.last_name}`} 
                    className="object-cover"
                  />
                ) : (
                  <User className="h-20 w-20" />
                )}
              </Avatar>
              <h1 className="text-2xl font-bold">
                Dr. {provider.first_name} {provider.last_name}
              </h1>
              <p className="text-muted-foreground">{provider.specialty}</p>
              
              <div className="flex items-center justify-center mt-2 mb-4">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <Star className="w-4 h-4 text-gray-300" />
                <span className="ml-2 text-sm font-medium">4.2 (24 reviews)</span>
              </div>
              
              <Badge variant="outline" className="mb-2">
                {provider.provider_type || 'Doctor'}
              </Badge>
            </div>

            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">Lusaka, Zambia</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Availability</p>
                  <p className="text-sm text-muted-foreground">Mon-Fri, 9:00 AM - 5:00 PM</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{provider.phone || 'Not provided'}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{provider.email || 'Not provided'}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex flex-col gap-3">
              <Button className="w-full" onClick={() => navigate(`/book/${providerId}`)}>
                Book Appointment
              </Button>
              <Button variant="outline" className="w-full">
                Send Message
              </Button>
            </div>
          </Card>

          {/* Provider Details Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="about">
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>
              
              <TabsContent value="about" className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">About Dr. {provider.first_name} {provider.last_name}</h2>
                  <p className="text-muted-foreground whitespace-pre-line">{provider.bio}</p>
                </Card>
                
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Specialties</h2>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{provider.specialty}</Badge>
                    <Badge>Primary Care</Badge>
                    <Badge>Family Medicine</Badge>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Languages</h2>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">English</Badge>
                    <Badge variant="outline">Nyanja</Badge>
                    <Badge variant="outline">Bemba</Badge>
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="education">
                <ProviderEducation providerId={providerId} />
              </TabsContent>
              
              <TabsContent value="experience">
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Professional Experience</h2>
                  <div className="space-y-4">
                    <div className="border-l-2 border-primary pl-4 pb-6">
                      <p className="font-semibold">Senior Doctor</p>
                      <p className="text-sm text-muted-foreground">University Teaching Hospital, Lusaka</p>
                      <p className="text-sm text-muted-foreground">2018 - Present</p>
                    </div>
                    <div className="border-l-2 border-primary pl-4 pb-6">
                      <p className="font-semibold">Resident Physician</p>
                      <p className="text-sm text-muted-foreground">Levy Mwanawasa General Hospital</p>
                      <p className="text-sm text-muted-foreground">2015 - 2018</p>
                    </div>
                    <div className="border-l-2 border-primary pl-4">
                      <p className="font-semibold">Medical Intern</p>
                      <p className="text-sm text-muted-foreground">Ndola Teaching Hospital</p>
                      <p className="text-sm text-muted-foreground">2014 - 2015</p>
                    </div>
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="reviews">
                <ProviderReviews providerId={providerId} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProviderProfile;
