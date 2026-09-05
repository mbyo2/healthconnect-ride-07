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
import {
  Calendar, MapPin, Star, Clock, Award, User, Phone, Mail,
  GraduationCap, DollarSign, Shield, Video, Home, Building2,
  Languages, Stethoscope, CheckCircle2,
} from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ProviderReviews } from "@/components/provider/ProviderReviews";
import { ProviderEducation } from "@/components/provider/ProviderEducation";

const ProviderProfile = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();

  const { data: provider, isLoading } = useQuery({
    queryKey: ["provider", providerId],
    queryFn: async () => {
      if (!providerId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          first_name,
          last_name,
          specialty,
          subspecialties,
          bio,
          avatar_url,
          provider_type,
          email,
          phone,
          years_experience,
          rating,
          reviews_count,
          medical_school,
          graduation_year,
          board_certifications,
          primary_practice_location,
          affiliated_hospitals,
          consultation_fee_min,
          consultation_fee_max,
          accepts_insurance,
          insurance_providers_accepted,
          telemedicine_available,
          home_visits_available,
          languages_spoken,
          typical_wait_time,
          appointment_types,
          availability_schedule,
          provider_locations (
            latitude,
            longitude
          )
        `)
        .eq("id", providerId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return data as any;
    },
    enabled: !!providerId,
  });

  if (isLoading) return <LoadingScreen />;

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md p-6 text-center">
            <p className="text-lg font-medium mb-2">Provider not found</p>
            <p className="text-sm text-muted-foreground mb-4">
              The provider you're looking for doesn't exist or is no longer available.
            </p>
            <Button onClick={() => navigate("/providers")}>Browse providers</Button>
          </Card>
        </div>
      </div>
    );
  }

  const feeLabel = () => {
    if (provider.consultation_fee_min && provider.consultation_fee_max)
      return `K${provider.consultation_fee_min} – K${provider.consultation_fee_max}`;
    if (provider.consultation_fee_min) return `From K${provider.consultation_fee_min}`;
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-20 pb-24">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Sidebar ── */}
          <Card className="p-6 lg:col-span-1 space-y-5">
            {/* Avatar + name */}
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-28 w-28 mb-4">
                {provider.avatar_url ? (
                  <img
                    src={provider.avatar_url}
                    alt={`${provider.first_name} ${provider.last_name}`}
                    className="object-cover w-full h-full rounded-full"
                  />
                ) : (
                  <div className="h-full w-full rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-14 w-14 text-primary" />
                  </div>
                )}
              </Avatar>
              <h1 className="text-xl font-bold">
                Dr. {provider.first_name} {provider.last_name}
              </h1>
              <p className="text-muted-foreground text-sm">{provider.specialty || "General Practice"}</p>

              {!!provider.rating && (
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">{Number(provider.rating).toFixed(1)}</span>
                  {!!provider.reviews_count && (
                    <span className="text-sm text-muted-foreground">
                      ({provider.reviews_count} reviews)
                    </span>
                  )}
                </div>
              )}

              <Badge variant="outline" className="mt-2">
                {provider.provider_type || "Doctor"}
              </Badge>
            </div>

            {/* Key details */}
            <div className="space-y-3 text-sm">
              {provider.primary_practice_location && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{provider.primary_practice_location}</span>
                </div>
              )}

              {provider.typical_wait_time && (
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>Avg. wait: {provider.typical_wait_time}</span>
                </div>
              )}

              {provider.phone && (
                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{provider.phone}</span>
                </div>
              )}

              {provider.email && (
                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="break-all">{provider.email}</span>
                </div>
              )}

              {feeLabel() && (
                <div className="flex items-start gap-2.5">
                  <DollarSign className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="font-semibold text-primary">{feeLabel()}</span>
                </div>
              )}
            </div>

            {/* Capability badges */}
            <div className="flex flex-wrap gap-2">
              {provider.telemedicine_available && (
                <Badge variant="secondary" className="gap-1">
                  <Video className="h-3 w-3" /> Telemedicine
                </Badge>
              )}
              {provider.home_visits_available && (
                <Badge variant="secondary" className="gap-1">
                  <Home className="h-3 w-3" /> Home Visits
                </Badge>
              )}
              {provider.accepts_insurance && (
                <Badge variant="secondary" className="gap-1">
                  <Shield className="h-3 w-3" /> Insurance
                </Badge>
              )}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <Button className="w-full" onClick={() => navigate(`/appointments?provider=${providerId}`)}>
                <Calendar className="h-4 w-4 mr-2" /> Book Appointment
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/chat")}>
                Send Message
              </Button>
            </div>
          </Card>

          {/* ── Main content ── */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="about">
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="practice">Practice</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              {/* About */}
              <TabsContent value="about" className="space-y-4">
                {provider.bio && (
                  <Card className="p-6">
                    <h2 className="text-lg font-bold mb-3">
                      About Dr. {provider.first_name} {provider.last_name}
                    </h2>
                    <p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">
                      {provider.bio}
                    </p>
                  </Card>
                )}

                {/* Specialties */}
                <Card className="p-6">
                  <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" /> Specialties
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {provider.specialty && (
                      <Badge>{provider.specialty}</Badge>
                    )}
                    {(provider.subspecialties || []).map((s: string) => (
                      <Badge key={s} variant="outline">{s}</Badge>
                    ))}
                    {!provider.specialty && (!provider.subspecialties || provider.subspecialties.length === 0) && (
                      <p className="text-sm text-muted-foreground">No specialties listed</p>
                    )}
                  </div>
                </Card>

                {/* Languages */}
                {(provider.languages_spoken || []).length > 0 && (
                  <Card className="p-6">
                    <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Languages className="h-5 w-5 text-primary" /> Languages Spoken
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {(provider.languages_spoken as string[]).map(lang => (
                        <Badge key={lang} variant="secondary">{lang}</Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Insurance */}
                {(provider.insurance_providers_accepted || []).length > 0 && (
                  <Card className="p-6">
                    <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" /> Accepted Insurance
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {(provider.insurance_providers_accepted as string[]).map(ins => (
                        <Badge key={ins} variant="outline" className="gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" /> {ins}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* Education */}
              <TabsContent value="education" className="space-y-4">
                {(provider.medical_school || provider.graduation_year) && (
                  <Card className="p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" /> Medical Education
                    </h2>
                    <div className="space-y-2 text-sm">
                      {provider.medical_school && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium w-36 text-muted-foreground">Medical School</span>
                          <span>{provider.medical_school}</span>
                        </div>
                      )}
                      {provider.graduation_year && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium w-36 text-muted-foreground">Graduated</span>
                          <span>{provider.graduation_year}</span>
                        </div>
                      )}
                      {provider.years_experience && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium w-36 text-muted-foreground">Experience</span>
                          <span>{provider.years_experience}+ years</span>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {(provider.board_certifications || []).length > 0 && (
                  <Card className="p-6">
                    <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" /> Board Certifications
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {(provider.board_certifications as string[]).map(cert => (
                        <Badge key={cert} variant="outline" className="gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" /> {cert}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Fallback to the existing sub-component for any additional education data */}
                <ProviderEducation providerId={providerId} />
              </TabsContent>

              {/* Practice */}
              <TabsContent value="practice" className="space-y-4">
                {/* Consultation fees */}
                {feeLabel() && (
                  <Card className="p-6">
                    <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" /> Consultation Fees
                    </h2>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-36">Consultation fee</span>
                        <span className="font-semibold">{feeLabel()}</span>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Affiliated hospitals */}
                {(provider.affiliated_hospitals || []).length > 0 && (
                  <Card className="p-6">
                    <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" /> Affiliated Hospitals
                    </h2>
                    <ul className="space-y-1">
                      {(provider.affiliated_hospitals as string[]).map(hosp => (
                        <li key={hosp} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          {hosp}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Appointment types */}
                {(provider.appointment_types || []).length > 0 && (
                  <Card className="p-6">
                    <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" /> Appointment Types
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {(provider.appointment_types as string[]).map(t => (
                        <Badge key={t} variant="secondary">{t}</Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Availability schedule */}
                {provider.availability_schedule && (
                  <Card className="p-6">
                    <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" /> Weekly Availability
                    </h2>
                    <div className="space-y-2">
                      {Object.entries(provider.availability_schedule as Record<string, any>).map(
                        ([day, info]: [string, any]) => (
                          <div key={day} className="flex items-center gap-3 text-sm capitalize">
                            <span className="w-24 font-medium">{day}</span>
                            {info?.available ? (
                              <div className="flex flex-wrap gap-1">
                                {(info.hours || []).map((h: string) => (
                                  <Badge key={h} variant="outline" className="text-xs">{h}</Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">Not available</span>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* Reviews */}
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
