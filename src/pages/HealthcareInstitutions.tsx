import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, MapPin, Star, Phone, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Institution {
  id: string;
  name: string;
  institution_type: string;
  location?: string;
  rating?: number;
  reviews_count?: number;
  phone?: string;
  email?: string;
  services?: string[];
  accepting_patients: boolean;
}

const HealthcareInstitutions = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const institutionTypes = [
    'Hospital',
    'Clinic',
    'Laboratory',
    'Pharmacy',
    'Mental Health Center',
    'Rehabilitation Center',
  ];

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const { data, error } = await supabase
        .from('healthcare_institutions')
        .select('*')
        .eq('is_verified', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Map database fields to component interface
      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        institution_type: item.type,
        location: item.address,
        phone: item.phone,
        email: item.email,
        // Default values for missing fields
        rating: 0,
        reviews_count: 0,
        services: [],
        accepting_patients: true
      }));

      setInstitutions(mappedData);
    } catch (error) {
      console.error('Error fetching institutions:', error);
      toast.error('Failed to load healthcare institutions');
    } finally {
      setLoading(false);
    }
  };

  const filteredInstitutions = institutions.filter((inst) => {
    const matchesSearch =
      inst.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || inst.institution_type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          Healthcare Institutions
        </h1>
        <p className="text-muted-foreground">
          Find verified hospitals, clinics, and healthcare facilities
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {institutionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredInstitutions.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No institutions found</p>
            </CardContent>
          </Card>
        ) : (
          filteredInstitutions.map((inst) => (
            <Card key={inst.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{inst.name}</CardTitle>
                      <CardDescription>{inst.institution_type}</CardDescription>
                    </div>
                  </div>
                  {inst.accepting_patients && (
                    <Badge variant="default" className="text-xs">
                      Accepting
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {inst.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    {inst.location}
                  </div>
                )}

                {inst.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    {inst.phone}
                  </div>
                )}

                {inst.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{inst.rating.toFixed(1)}</span>
                    {inst.reviews_count && (
                      <span className="text-sm text-muted-foreground">
                        ({inst.reviews_count} reviews)
                      </span>
                    )}
                  </div>
                )}

                {inst.services && inst.services.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {inst.services.slice(0, 3).map((service, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                    {inst.services.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{inst.services.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1">
                    View Details
                  </Button>
                  <Button size="sm" variant="outline">
                    Contact
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

export default HealthcareInstitutions;
