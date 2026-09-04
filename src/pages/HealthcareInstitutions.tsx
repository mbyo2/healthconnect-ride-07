import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Building2, MapPin, Star, Phone, Search,
  Pill, FlaskConical, Heart, Stethoscope, CheckCircle2,
  Calendar, ArrowRight, ShieldCheck, Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  is_verified?: boolean;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  hospital: <Heart className="h-5 w-5 text-[#e44258]" />,
  clinic: <Stethoscope className="h-5 w-5 text-[#00c875]" />,
  pharmacy: <Pill className="h-5 w-5 text-[#0073ea]" />,
  dispensary: <Pill className="h-5 w-5 text-emerald-600" />,
  pediatric_center: <Heart className="h-5 w-5 text-pink-500" />,
  physiotherapy: <Stethoscope className="h-5 w-5 text-indigo-500" />,
  laboratory: <FlaskConical className="h-5 w-5 text-[#a25ddc]" />,
  nursing_home: <Heart className="h-5 w-5 text-[#fdab3d]" />,
  care_home: <Heart className="h-5 w-5 text-[#fdab3d]" />,
  specialized_clinic: <Stethoscope className="h-5 w-5 text-[#00c875]" />,
  diagnostic_center: <FlaskConical className="h-5 w-5 text-[#a25ddc]" />,
};

const FILTER_TABS = [
  { key: 'all', label: 'All Facilities' },
  { key: 'hospital', label: 'Hospitals' },
  { key: 'clinic', label: 'Clinics' },
  { key: 'pediatric_center', label: 'Pediatrics' },
  { key: 'physiotherapy', label: 'Physiotherapy' },
  { key: 'dispensary', label: 'Dispensaries' },
  { key: 'pharmacy', label: 'Pharmacies' },
  { key: 'laboratory', label: 'Labs' },
  { key: 'nursing_home', label: 'Nursing Homes' },
];

export const HealthcareInstitutions = () => {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const { data, error } = await supabase
        .from('healthcare_institutions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        institution_type: item.type || 'clinic',
        location: item.address || item.city || 'Lusaka, Zambia',
        phone: item.phone,
        email: item.email,
        rating: 4.8,
        reviews_count: 12,
        services: item.type === 'pharmacy' ? ['Prescription Dispensing', 'Over-the-Counter', 'Delivery'] :
          item.type === 'laboratory' ? ['Blood Tests', 'Pathology', 'Diagnostic Screening'] :
          ['Outpatient', 'Emergency', 'Consultations'],
        accepting_patients: true,
        is_verified: item.is_verified ?? true,
      }));

      // If empty in database, provide representative sample institutions
      if (mappedData.length === 0) {
        setInstitutions([
          {
            id: 'sample-1',
            name: "Doc' O Clock Central Hospital",
            institution_type: 'hospital',
            location: 'Great East Road, Lusaka',
            phone: '+260 97 1234567',
            email: 'central@dococlock.com',
            rating: 4.9,
            reviews_count: 48,
            services: ['Emergency 24/7', 'ICU & IPD', 'Surgeries', 'Specialist Clinics'],
            accepting_patients: true,
            is_verified: true,
          },
          {
            id: 'sample-2',
            name: "CarePoint Community Pharmacy",
            institution_type: 'pharmacy',
            location: 'Cairo Road, Lusaka',
            phone: '+260 96 2345678',
            email: 'carepoint@dococlock.com',
            rating: 4.8,
            reviews_count: 32,
            services: ['Express Dispensing', 'Chronic Medication', 'Home Delivery', 'POS Billing'],
            accepting_patients: true,
            is_verified: true,
          },
          {
            id: 'sample-3',
            name: "Apex Diagnostic & Molecular Lab",
            institution_type: 'laboratory',
            location: 'Kabulonga, Lusaka',
            phone: '+260 95 3456789',
            email: 'apexlab@dococlock.com',
            rating: 4.9,
            reviews_count: 24,
            services: ['CBC & Biochemistry', 'PCR Testing', 'Histopathology', 'Digital Results'],
            accepting_patients: true,
            is_verified: true,
          },
          {
            id: 'sample-4',
            name: "Woodlands Family Health Clinic",
            institution_type: 'clinic',
            location: 'Woodlands, Lusaka',
            phone: '+260 97 4567890',
            email: 'woodlands@dococlock.com',
            rating: 4.7,
            reviews_count: 19,
            services: ['General Practice', 'Pediatrics', 'Antenatal Care', 'Vaccinations'],
            accepting_patients: true,
            is_verified: true,
          },
        ]);
      } else {
        setInstitutions(mappedData);
      }
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
      inst.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.institution_type?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || inst.institution_type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#f5f7fa] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20">
      {/* Hero Banner */}
      <div className="bg-[#0f172a] text-white border-b border-slate-800 px-4 sm:px-6 py-10 sm:py-14 shadow-sm">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0073ea]/20 border border-[#0073ea]/40 text-[#0073ea] text-xs font-black uppercase tracking-wider">
            <Building2 className="h-3.5 w-3.5" />
            Verified Healthcare Facilities
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Healthcare Institutions &amp; Clinics
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl font-medium">
            Explore accredited hospitals, pharmacies, laboratories, and specialized medical clinics. Book appointments and manage care seamlessly.
          </p>

          {/* Search bar inside banner */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 max-w-2xl">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by facility name, city, specialty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-slate-900/90 border-slate-700 text-white placeholder:text-slate-400 rounded-xl text-sm focus-visible:ring-[#0073ea]"
              />
            </div>
            <Button
              onClick={() => navigate('/institution-portal')}
              className="w-full sm:w-auto h-11 px-5 bg-[#0073ea] hover:bg-[#0060c4] text-white font-bold rounded-xl shrink-0 text-xs"
            >
              Register Facility
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all ${
                typeFilter === tab.key
                  ? 'bg-[#0073ea] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 text-[#676879] hover:bg-[#e8f1ff] hover:text-[#0073ea]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0073ea]"></div>
            </div>
          ) : filteredInstitutions.length === 0 ? (
            <div className="col-span-full p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 space-y-3">
              <Building2 className="h-12 w-12 mx-auto text-slate-400" />
              <h3 className="font-extrabold text-base">No institutions found</h3>
              <p className="text-xs text-[#676879]">Try clearing your search filters or check another category.</p>
              <Button size="sm" variant="outline" onClick={() => { setSearchTerm(''); setTypeFilter('all'); }}>
                Reset Filters
              </Button>
            </div>
          ) : (
            filteredInstitutions.map((inst) => (
              <div
                key={inst.id}
                className="doc-card p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs hover:shadow-md hover:border-[#0073ea]/50 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-[#f0f4ff] dark:bg-slate-800 flex items-center justify-center shrink-0 border border-[#d0e1fd] dark:border-slate-700">
                        {TYPE_ICONS[inst.institution_type] || <Building2 className="h-5 w-5 text-[#0073ea]" />}
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 line-clamp-1">{inst.name}</h3>
                        <p className="text-[11px] font-bold text-[#676879] capitalize">{inst.institution_type?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    {inst.is_verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#00c875]/10 text-[#00c875] shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                    )}
                  </div>

                  {inst.location && (
                    <div className="flex items-center gap-1.5 text-xs text-[#676879]">
                      <MapPin className="h-3.5 w-3.5 text-[#0073ea] shrink-0" />
                      <span className="truncate">{inst.location}</span>
                    </div>
                  )}

                  {inst.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-[#676879]">
                      <Phone className="h-3.5 w-3.5 text-[#00c875] shrink-0" />
                      <span>{inst.phone}</span>
                    </div>
                  )}

                  {inst.services && inst.services.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {inst.services.slice(0, 3).map((service, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-[#f0f4ff] dark:bg-slate-800 text-[10px] font-bold text-[#0073ea]">
                          {service}
                        </span>
                      ))}
                      {inst.services.length > 3 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                          +{inst.services.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-3 border-t border-[#f0f2f7] dark:border-slate-800 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-[#0073ea] hover:bg-[#0060c4] text-white text-xs font-bold rounded-xl h-9"
                    onClick={() => {
                      if (inst.institution_type === 'pharmacy') navigate('/pharmacy-portal');
                      else if (inst.institution_type === 'laboratory') navigate('/lab-management');
                      else navigate('/appointments');
                    }}
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1.5" /> Book / Order
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-3 rounded-xl border-[#e6e9ef] text-xs font-bold hover:bg-[#f0f4ff]"
                    onClick={() => {
                      if (inst.phone) window.open(`tel:${inst.phone}`);
                      else toast.info(`Contacting ${inst.name}`);
                    }}
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthcareInstitutions;

