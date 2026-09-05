import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, MapPin, Star, Calendar, Search, GraduationCap, DollarSign, Shield, Video, Home } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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

  const fetchSpecialties = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('specialty')
        .eq('role', 'health_personnel')
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
        .from('profiles')
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
          is_verified
        `)
        .eq('role', 'health_personnel')
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
        accepting_patients: true,
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
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <User className="h-8 w-8 text-primary" />
          Healthcare Professionals
        </h1>
        <p className="text-muted-foreground">
          Find and connect with verified healthcare professionals
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, specialty, medical school..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
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
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredProfessionals.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No professionals found</p>
            </CardContent>
          </Card>
        ) : (
          filteredProfessionals.map((prof) => (
            <Card key={prof.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base leading-snug">
                        Dr. {prof.first_name} {prof.last_name}
                      </CardTitle>
                      <CardDescription>{prof.specialty || 'General Practice'}</CardDescription>
                    </div>
                  </div>
                  {prof.accepting_patients && (
                    <Badge variant="default" className="text-xs shrink-0">Accepting</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-2.5">
                {/* Medical school */}
                {prof.medical_school && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">
                      {prof.medical_school}
                      {prof.graduation_year && ` '${prof.graduation_year.toString().slice(-2)}`}
                    </span>
                  </div>
                )}

                {/* Practice location */}
                {prof.primary_practice_location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="truncate">{prof.primary_practice_location}</span>
                  </div>
                )}

                {/* Rating & experience */}
                <div className="flex items-center gap-4 text-sm">
                  {!!prof.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{prof.rating.toFixed(1)}</span>
                      {!!prof.reviews_count && (
                        <span className="text-muted-foreground">({prof.reviews_count})</span>
                      )}
                    </div>
                  )}
                  {!!prof.years_experience && (
                    <span className="text-muted-foreground">{prof.years_experience}+ yrs</span>
                  )}
                </div>

                {/* Consultation fee */}
                {feeLabel(prof) && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <DollarSign className="h-4 w-4" />
                    {feeLabel(prof)}
                  </div>
                )}

                {/* Subspecialties + capability badges */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {(prof.subspecialties || []).slice(0, 2).map((sub, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{sub}</Badge>
                  ))}
                  {prof.telemedicine_available && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Video className="h-3 w-3" /> Telemedicine
                    </Badge>
                  )}
                  {prof.home_visits_available && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Home className="h-3 w-3" /> Home Visits
                    </Badge>
                  )}
                  {prof.accepts_insurance && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Shield className="h-3 w-3" /> Insurance
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1" onClick={() => navigate(`/provider/${prof.id}`)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Book
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/provider/${prof.id}`)}>
                    Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default HealthcareProfessionals;
