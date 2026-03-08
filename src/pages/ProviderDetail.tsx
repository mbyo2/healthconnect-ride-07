import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, Phone, Clock, Star, CalendarPlus, Video, Shield, 
  Award, GraduationCap, Languages, Heart, CheckCircle, 
  MessageSquare, Share2, Building2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProviderReviews } from "@/components/reviews/ProviderReviews";
import { BookingModal } from "@/components/booking/BookingModal";
import { useState } from "react";
import { Provider } from "@/types/provider";
import { Skeleton } from "@/components/ui/skeleton";

const ProviderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const { data: provider, isLoading, error } = useQuery({
    queryKey: ['provider-detail', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          provider_statistics (
            average_rating,
            total_reviews,
            total_appointments
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Map database response to Provider type, handling location type mismatch
      return {
        id: data.id,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        specialty: data.specialty || '',
        bio: data.bio,
        avatar_url: data.avatar_url,
        expertise: data.expertise,
        address: data.address,
        city: data.city,
        state: data.state,
        phone: data.phone,
        email: data.email,
        rating: data.rating,
        accepted_insurances: data.accepted_insurances,
        provider_statistics: data.provider_statistics,
      } as Provider & { provider_statistics?: any[] };
    },
    enabled: !!id,
  });

  // Fetch provider's services
  const { data: services } = useQuery({
    queryKey: ['provider-services', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from('healthcare_services')
        .select('*')
        .eq('provider_id', id)
        .eq('is_available', true);
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex gap-6">
          <Skeleton className="w-32 h-32 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-2">Provider Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The healthcare provider you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/marketplace-users')}>
            Browse Providers
          </Button>
        </div>
      </div>
    );
  }

  const stats = provider.provider_statistics?.[0];
  const rating = stats?.average_rating || provider.rating || 4.5;
  const reviewCount = stats?.total_reviews || 0;

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      {/* Hero Section - ZocDoc Style */}
      <div className="bg-gradient-to-br from-primary/5 via-blue-50/50 to-background dark:from-primary/10 dark:via-blue-900/10 dark:to-background rounded-2xl p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Provider Image */}
          <div className="flex-shrink-0">
            {provider.avatar_url ? (
              <img
                src={provider.avatar_url}
                alt={`Dr. ${provider.first_name} ${provider.last_name}`}
                className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover border-4 border-background shadow-lg"
              />
            ) : (
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary border-4 border-background shadow-lg">
                {provider.first_name?.[0]}{provider.last_name?.[0]}
              </div>
            )}
          </div>

          {/* Provider Info */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  Dr. {provider.first_name} {provider.last_name}
                </h1>
                <p className="text-lg text-primary font-medium">{provider.specialty || 'General Practitioner'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="rounded-full">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full">
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
                <Star className="h-3 w-3 mr-1 fill-current" />
                {rating.toFixed(1)} ({reviewCount} reviews)
              </Badge>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                <Video className="h-3 w-3 mr-1" />
                Video Visits
              </Badge>
              <Badge variant="secondary">
                <Shield className="h-3 w-3 mr-1" />
                NHIMA Partner
              </Badge>
            </div>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {provider.address && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{provider.address}</span>
                </div>
              )}
              {provider.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>{provider.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-primary" />
                <span>Usually responds within 1 hour</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button size="lg" className="flex-1 sm:flex-none gap-2" onClick={() => setIsBookingOpen(true)}>
            <CalendarPlus className="h-5 w-5" />
            Book Appointment
          </Button>
          <Button size="lg" variant="outline" className="flex-1 sm:flex-none gap-2" onClick={() => navigate('/chat')}>
            <MessageSquare className="h-5 w-5" />
            Send Message
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="about" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="space-y-6 pt-4">
              {/* Bio */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">About Dr. {provider.last_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {provider.bio || `Dr. ${provider.first_name} ${provider.last_name} is a dedicated healthcare professional specializing in ${provider.specialty || 'general medicine'}. With years of experience and a commitment to patient care, Dr. ${provider.last_name} provides comprehensive medical services to patients of all ages.`}
                  </p>
                </CardContent>
              </Card>

              {/* Expertise */}
              {provider.expertise && provider.expertise.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      Areas of Expertise
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {provider.expertise.map((exp: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="px-3 py-1">
                          {exp}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Education & Credentials */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Education & Credentials
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="font-medium text-foreground">Medical Degree</p>
                      <p className="text-sm text-muted-foreground">University of Zambia, School of Medicine</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="font-medium text-foreground">Board Certified</p>
                      <p className="text-sm text-muted-foreground">{provider.specialty || 'General Practice'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="services" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Services Offered</CardTitle>
                  <CardDescription>Available healthcare services and consultations</CardDescription>
                </CardHeader>
                <CardContent>
                  {services && services.length > 0 ? (
                    <div className="space-y-4">
                      {services.map((service: any) => (
                        <div key={service.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium text-foreground">{service.name}</p>
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                            {service.duration && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {service.duration} minutes
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">K{service.price}</p>
                            <Button size="sm" variant="outline" onClick={() => setIsBookingOpen(true)}>
                              Book
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Services information coming soon.</p>
                      <Button className="mt-4" onClick={() => setIsBookingOpen(true)}>
                        Book General Consultation
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="pt-4">
              {id && <ProviderReviews providerId={id} />}
            </TabsContent>

            <TabsContent value="location" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Practice Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">
                        {provider.address || 'Address not available'}
                      </p>
                      {provider.city && (
                        <p className="text-sm text-muted-foreground">
                          {provider.city}, {provider.state || 'Zambia'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {provider.address && (
                    <Button variant="outline" className="w-full" asChild>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Get Directions
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Quick Book Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Book Appointment</CardTitle>
              <CardDescription>Next available slot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CalendarPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Today</p>
                  <p className="text-sm text-muted-foreground">Multiple slots available</p>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={() => setIsBookingOpen(true)}>
                View Available Times
              </Button>
            </CardContent>
          </Card>

          {/* Languages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Languages className="h-5 w-5 text-primary" />
                Languages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">English</Badge>
                <Badge variant="secondary">Bemba</Badge>
                <Badge variant="secondary">Nyanja</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Insurance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Insurance Accepted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {provider.accepted_insurances && provider.accepted_insurances.length > 0 ? (
                  provider.accepted_insurances.map((insurance: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span className="text-foreground">{insurance}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span className="text-foreground">NHIMA</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span className="text-foreground">Madison Insurance</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span className="text-foreground">Self Pay</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Booking Modal */}
      {provider && (
        <BookingModal 
          provider={provider as Provider}
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
        />
      )}
    </div>
  );
};

export default ProviderDetail;
