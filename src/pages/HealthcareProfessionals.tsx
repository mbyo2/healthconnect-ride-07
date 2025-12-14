import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, MapPin, Star, Calendar, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Professional {
  id: string;
  first_name: string;
  last_name: string;
  specialty?: string;
  location?: string;
  rating?: number;
  reviews_count?: number;
  years_experience?: number;
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

  const specialties = [
    'General Practice',
    'Cardiology',
    'Dermatology',
    'Pediatrics',
    'Psychiatry',
    'Orthopedics',
    'Neurology',
    'Oncology',
  ];

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'health_personnel')
        .eq('is_verified', true)
        .order('rating', { ascending: false })
        .limit(50);

      if (error) throw error;
      setProfessionals(data || []);
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
        prof.specialty?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSpecialty =
        specialtyFilter === 'all' || prof.specialty === specialtyFilter;

      return matchesSearch && matchesSpecialty;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'experience')
        return (b.years_experience || 0) - (a.years_experience || 0);
      return 0;
    });

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
                placeholder="Search by name or specialty..."
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Dr. {prof.first_name} {prof.last_name}
                      </CardTitle>
                      <CardDescription>{prof.specialty || 'General Practice'}</CardDescription>
                    </div>
                  </div>
                  {prof.accepting_patients && (
                    <Badge variant="default" className="text-xs">
                      Accepting
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {prof.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {prof.location}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm">
                  {prof.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{prof.rating.toFixed(1)}</span>
                      {prof.reviews_count && (
                        <span className="text-muted-foreground">
                          ({prof.reviews_count})
                        </span>
                      )}
                    </div>
                  )}

                  {prof.years_experience && (
                    <div className="text-muted-foreground">
                      {prof.years_experience}+ years
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    Book
                  </Button>
                  <Button size="sm" variant="outline">
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
