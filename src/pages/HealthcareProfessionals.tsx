import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { ALL_CLINICIAN_ROLES, CONSULTABLE_PROVIDER_ROLES } from '@/config/roleConfig';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, MapPin, Calendar, Search, GraduationCap, Shield, Video, Home } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RatingDisplay } from '@/components/RatingDisplay';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { providerDisplayName } from '@/utils/providerDisplay';
import { FavoriteProviderButton } from '@/components/patient/FavoriteProviders';

interface Professional {
  id: string;
  first_name: string;
  last_name: string;
  specialty?: string;
  subspecialties?: string[];
  medical_school?: string;
  graduation_year?: number;
  years_experience?: number;
  consultation_fee_min?: number;
  consultation_fee_max?: number;
  accepts_insurance?: boolean;
  telemedicine_available?: boolean;
  home_visits_available?: boolean;
  board_certifications?: string[];
  primary_practice_location?: string;
  rating?: number;
  reviews_count?: number;
  accepting_patients: boolean;
  profile_image?: string;
}

const HealthcareProfessionals = () => {
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [specialties, setSpecialties] = useState<string[]>([]);

  useEffect(() => {
    fetchProfessionals();
    fetchSpecialties();
  }, []);

  // Single source of truth — every clinical cadre appears in the directory.
  const PROVIDER_ROLES = ALL_CLINICIAN_ROLES;

  const fetchSpecialties = async () => {
    try {
      const { data, error } = await supabase
        .from('provider_directory')
        .select('specialty')
        .in('role', PROVIDER_ROLES as any)
        .not('specialty', 'is', null);

      if (error) throw error;

      const uniqueSpecialties = Array.from(
        new Set((data || []).map((p: any) => p.specialty))
      ).filter(Boolean) as string[];
      setSpecialties(uniqueSpecialties.sort());
    } catch (error) {
      console.error('Error fetching specialties:', error);
    }
  };

  const fetchProfessionals = async () => {
    try {
      // Query profiles table which has all the new provider enhancement columns
      const { data, error } = await supabase
        .from('provider_directory')
        .select(`
          id,
          first_name,
          last_name,
          specialty,
          subspecialties,
          medical_school,
          graduation_year,
          board_certifications,
          years_experience,
          rating,
          reviews_count,
          avatar_url,
          primary_practice_location,
          consultation_fee_min,
          consultation_fee_max,
          accepts_insurance,
          telemedicine_available,
          home_visits_available,
          accepting_patients,
          role,
          is_verified
        `)
        .in('role', PROVIDER_ROLES as any)
        .eq('is_verified', true)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) throw error;

      const mappedData: Professional[] = (data || []).map((item: any) => ({
        id: item.id,
        first_name: item.first_name || '',
        last_name: item.last_name || '',
        specialty: item.specialty || 'General Practice',
        subspecialties: item.subspecialties || [],
        medical_school: item.medical_school,
        graduation_year: item.graduation_year,
        board_certifications: item.board_certifications || [],
        years_experience: item.years_experience || 0,
        rating: item.rating || 0,
        reviews_count: item.reviews_count || 0,
        profile_image: item.avatar_url,
        primary_practice_location: item.primary_practice_location,
        consultation_fee_min: item.consultation_fee_min,
        consultation_fee_max: item.consultation_fee_max,
        accepts_insurance: item.accepts_insurance ?? false,
        telemedicine_available: item.telemedicine_available ?? false,
        home_visits_available: item.home_visits_available ?? false,
        accepting_patients: item.accepting_patients ?? false,
      }));

      setProfessionals(mappedData);
    } catch (error) {
      console.error('Error fetching professionals:', error);
      toast.error('Failed to load healthcare professionals');
    } finally {
      setLoading(false);
    }
  };

  const filteredProfessionals = professionals
    .filter((prof) => {
      const matchesSearch =
        prof.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prof.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prof.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prof.subspecialties || []).some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
        prof.medical_school?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSpecialty =
        specialtyFilter === 'all' || prof.specialty === specialtyFilter;

      return matchesSearch && matchesSpecialty;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'experience') return (b.years_experience || 0) - (a.years_experience || 0);
      return 0;
    });

  const feeLabel = (prof: Professional) => {
    if (prof.consultation_fee_min && prof.consultation_fee_max)
      return `K${prof.consultation_fee_min} – K${prof.consultation_fee_max}`;
    if (prof.consultation_fee_min) return `From K${prof.consultation_fee_min}`;
    return null;
  };

  return (
    <div className="min-h-screen bg-canvas text-midnight font-sans pb-16">
      <Helmet>
        <title>Verified Doctors & Specialists in Zambia | Doc' O Clock</title>
        <meta
          name="description"
          content="Find verified doctors, nurses, and specialists across Zambia. Compare ratings, fees, availability, and book in-clinic or video consultations."
        />
        <link rel="canonical" href="https://doc0clock.online/healthcare-professionals" />
      </Helmet>
      {/* Header */}
      <div className="doc-page-header px-4 sm:px-6 py-5 shadow-sm">
        <div className="max-w-content mx-auto">
          <h1 className="font-display text-2xl md:text-3xl font-medium tracking-tight flex items-center gap-3">
            <User className="h-8 w-8 text-primary-500" />
            Healthcare Professionals
          </h1>
          <p className="text-sm text-graphite-500 font-medium tracking-wide mt-1">
            Find and connect with verified healthcare professionals
          </p>
        </div>
      </div>

      <div className="max-w-content mx-auto px-4 sm:px-6 pt-6 space-y-6">

      {/* Filters */}
      <Card className="border-canvas-silk bg-white dark:bg-slate-900 shadow-card">
        <CardContent className="pt-6 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-graphite-400" />
              <Input
                placeholder="Search name, specialty, medical school..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-canvas-silk bg-white dark:bg-slate-900 text-midnight focus-visible:ring-primary-500/30"
              />
            </div>

            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="experience">Most Experienced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl border border-canvas-silk bg-white dark:bg-slate-900 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </>
        ) : filteredProfessionals.length === 0 ? (
          <Card className="col-span-full border-canvas-silk bg-white dark:bg-slate-900">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-16 w-16 text-graphite-400 mb-4" />
              <p className="text-graphite-500">No professionals found</p>
              <p className="text-sm text-graphite-500 mt-1 mb-4">Try adjusting your search or clearing the filters.</p>
              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={() => { setSearchTerm(''); setSpecialtyFilter('all'); setSortBy('rating'); }}
              >
                Reset filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredProfessionals.map((prof) => (
            <Card key={prof.id} className="border-canvas-silk bg-white dark:bg-slate-900 hover:shadow-card-hover transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {prof.profile_image ? (
                      <img
                        src={prof.profile_image}
                        alt=""
                        className="h-12 w-12 rounded-2xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-2xl bg-primary-50 flex items-center justify-center shrink-0 text-sm font-semibold text-primary-600">
                        {prof.first_name?.[0]}{prof.last_name?.[0]}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base leading-snug text-midnight">
                        {providerDisplayName({ first_name: prof.first_name, last_name: prof.last_name, role: (prof as any)?.role })}
                      </CardTitle>
                      <CardDescription className="text-graphite-500">{prof.specialty || 'General Practice'}</CardDescription>
                    </div>
                  </div>
                  {prof.accepting_patients && (
                    <Badge className="text-xs shrink-0 bg-success-50 text-success-600 border border-success-100 hover:bg-success-50">Accepting</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-2.5">
                {/* Medical school */}
                {prof.medical_school && (
                  <div className="flex items-center gap-2 text-sm text-graphite-500">
                    <GraduationCap className="h-4 w-4 text-primary-500 shrink-0" />
                    <span className="truncate">
                      {prof.medical_school}
                      {prof.graduation_year && ` '${prof.graduation_year.toString().slice(-2)}`}
                    </span>
                  </div>
                )}

                {/* Practice location */}
                {prof.primary_practice_location && (
                  <div className="flex items-center gap-2 text-sm text-graphite-500">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="truncate">{prof.primary_practice_location}</span>
                  </div>
                )}

                {/* Rating & experience */}
                <div className="flex items-center gap-4 text-sm">
                  <RatingDisplay rating={prof.rating} reviewCount={prof.reviews_count} size="sm" />
                  {!!prof.years_experience && (
                    <span className="text-graphite-500">{prof.years_experience}+ yrs</span>
                  )}
                </div>

                {/* Consultation fee */}
                {feeLabel(prof) && (
                  <div className="text-sm font-semibold text-primary-600">
                    {feeLabel(prof)}
                  </div>
                )}

                {/* Subspecialties + capability badges */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {(prof.subspecialties || []).slice(0, 2).map((sub, i) => (
                    <Badge key={i} variant="outline" className="text-xs border-canvas-silk text-graphite-600">{sub}</Badge>
                  ))}
                  {prof.telemedicine_available && (
                    <Badge variant="secondary" className="text-xs gap-1 bg-primary-50 text-primary-600 border border-primary-100 hover:bg-primary-50">
                      <Video className="h-3 w-3" /> Telemedicine
                    </Badge>
                  )}
                  {prof.home_visits_available && (
                    <Badge variant="secondary" className="text-xs gap-1 bg-primary-50 text-primary-600 border border-primary-100 hover:bg-primary-50">
                      <Home className="h-3 w-3" /> Home Visits
                    </Badge>
                  )}
                  {prof.accepts_insurance && (
                    <Badge variant="secondary" className="text-xs gap-1 bg-primary-50 text-primary-600 border border-primary-100 hover:bg-primary-50">
                      <Shield className="h-3 w-3" /> Insurance
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  {(() => {
                    const consultable = (CONSULTABLE_PROVIDER_ROLES as string[]).includes((prof as any)?.role);
                    return (
                      <>
                        <Button size="sm" className="flex-1 min-h-[44px]" onClick={() => navigate(`/provider/${prof.id}`)}>
                          <Calendar className="h-4 w-4 mr-2" />
                          {consultable ? "Book" : "View Profile"}
                        </Button>
                        {consultable && (
                          <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => navigate(`/provider/${prof.id}`)}>
                            Profile
                          </Button>
                        )}
                        <FavoriteProviderButton providerId={prof.id} />
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </div>
    </div>
  );
};

export default HealthcareProfessionals;
