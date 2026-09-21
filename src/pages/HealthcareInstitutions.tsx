import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Building2, MapPin, Phone, Search,
  Pill, FlaskConical, Heart, Stethoscope, CheckCircle2,
  Calendar, ShieldCheck, Zap, Clock, Siren, BedDouble,
  Languages, Globe, Wifi,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// ── types ─────────────────────────────────────────────────────────────────────

interface Institution {
  id: string;
  name: string;
  institution_type: string;
  location: string;
  phone?: string;
  email?: string;
  website?: string;
  is_verified?: boolean;
  // new fields from migration
  services_offered?: string[];
  equipment_available?: string[];
  languages_spoken?: string[];
  specialties?: string[];
  emergency_services?: boolean;
  ambulance_services?: boolean;
  is_24_7?: boolean;
  number_of_beds?: number;
  telemedicine_available?: boolean;
  accreditation_body?: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ReactNode> = {
  hospital:          <Heart      className="h-5 w-5 text-error-500" />,
  clinic:            <Stethoscope className="h-5 w-5 text-success-500" />,
  pharmacy:          <Pill       className="h-5 w-5 text-primary-500" />,
  dispensary:        <Pill       className="h-5 w-5 text-emerald-600" />,
  pediatric_center:  <Heart      className="h-5 w-5 text-pink-500" />,
  physiotherapy:     <Stethoscope className="h-5 w-5 text-indigo-500" />,
  laboratory:        <FlaskConical className="h-5 w-5 text-purple-500" />,
  nursing_home:      <Heart      className="h-5 w-5 text-warning-500" />,
  care_home:         <Heart      className="h-5 w-5 text-warning-500" />,
  specialized_clinic:<Stethoscope className="h-5 w-5 text-success-500" />,
  diagnostic_center: <FlaskConical className="h-5 w-5 text-purple-500" />,
};

const FILTER_TABS = [
  { key: 'all',              label: 'All Facilities' },
  { key: 'hospital',         label: 'Hospitals' },
  { key: 'clinic',           label: 'Clinics' },
  { key: 'pediatric_center', label: 'Pediatrics' },
  { key: 'physiotherapy',    label: 'Physiotherapy' },
  { key: 'dispensary',       label: 'Dispensaries' },
  { key: 'pharmacy',         label: 'Pharmacies' },
  { key: 'laboratory',       label: 'Labs' },
  { key: 'nursing_home',     label: 'Nursing Homes' },
];

// NOTE: no sample/fake facilities — the directory only ever shows real,
// verified, marketplace-listed institutions. An empty result renders an
// honest empty state (see below), never invented hospitals.

// ── component ─────────────────────────────────────────────────────────────────

export const HealthcareInstitutions = () => {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => { fetchInstitutions(); }, []);

  const fetchInstitutions = async () => {
    try {
      // Only show institutions that opted into public marketplace visibility
      const { data, error } = await supabase
        .from('healthcare_institutions')
        .select(`
          id, name, type, address, city, phone, email, website,
          is_verified,
          services_offered,
          equipment_available,
          languages_spoken,
          specialties,
          emergency_services,
          ambulance_services,
          is_24_7,
          number_of_beds,
          accreditation_body
        `)
        .eq('list_in_marketplace', true)
        .eq('is_verified', true)
        .order('created_at', { ascending: false })
        .limit(60);

      if (error) throw error;

      const mapped: Institution[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        institution_type: item.type || 'clinic',
        location: [item.address, item.city].filter(Boolean).join(', ') || 'Lusaka, Zambia',
        phone: item.phone,
        email: item.email,
        website: item.website,
        is_verified: item.is_verified ?? true,
        services_offered: item.services_offered || [],
        equipment_available: item.equipment_available || [],
        languages_spoken: item.languages_spoken || [],
        specialties: item.specialties || [],
        emergency_services: item.emergency_services ?? false,
        ambulance_services: item.ambulance_services ?? false,
        is_24_7: item.is_24_7 ?? false,
        number_of_beds: item.number_of_beds,
        telemedicine_available: (item as any).telemedicine_available ?? false,
        accreditation_body: item.accreditation_body,
      }));

      setInstitutions(mapped);
    } catch (error) {
      console.error('Error fetching institutions:', error);
      toast.error('Failed to load healthcare institutions');
      setInstitutions([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = institutions.filter(inst => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      inst.name?.toLowerCase().includes(term) ||
      inst.location?.toLowerCase().includes(term) ||
      inst.institution_type?.toLowerCase().includes(term) ||
      (inst.services_offered || []).some(s => s.toLowerCase().includes(term)) ||
      (inst.specialties || []).some(s => s.toLowerCase().includes(term));

    const matchesType = typeFilter === 'all' || inst.institution_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Decide which action to take when "Book" is clicked
  const bookingRoute = (inst: Institution) => {
    if (inst.institution_type === 'pharmacy')   return '/pharmacy-portal';
    if (inst.institution_type === 'laboratory') return '/lab-management';
    return '/appointments';
  };

  return (
    <div className="min-h-screen bg-canvas-bone dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20">
      <Helmet>
        <title>Hospitals, Clinics & Pharmacies in Zambia | Doc' O Clock</title>
        <meta
          name="description"
          content="Explore accredited hospitals, clinics, pharmacies, and laboratories across Zambia. Check services, emergency care, beds, and book appointments."
        />
        <link rel="canonical" href="https://doc0clock.online/healthcare-institutions" />
      </Helmet>

      {/* ── Hero Banner ── */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 border border-primary-500/40 text-primary-500 text-xs font-black uppercase tracking-wider">
            <Building2 className="h-3.5 w-3.5" />
            Verified Healthcare Facilities
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Healthcare Institutions &amp; Clinics
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl font-medium">
            Explore accredited hospitals, pharmacies, laboratories, and specialised medical clinics. Book appointments and manage care seamlessly.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 max-w-2xl">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by facility name, city, specialty or service…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-slate-900/90 border-slate-700 text-white placeholder:text-slate-400 rounded-xl text-sm focus-visible:ring-primary-500"
              />
            </div>
            <Button
              onClick={() => navigate('/institution-portal')}
              className="w-full sm:w-auto h-11 px-5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl shrink-0 text-xs"
            >
              Register Facility
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* ── Type filter pills ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all ${
                typeFilter === tab.key
                  ? 'bg-primary-500 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 text-graphite-500 dark:text-slate-400 hover:bg-primary-100 hover:text-primary-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Results count ── */}
        {!loading && (
          <p className="text-xs font-bold text-graphite-500 dark:text-slate-400">
            {filtered.length} {filtered.length === 1 ? 'facility' : 'facilities'} found
            {typeFilter !== 'all' && ` · ${FILTER_TABS.find(t => t.key === typeFilter)?.label}`}
            {searchTerm && ` · "${searchTerm}"`}
          </p>
        )}

        {/* ── Card grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 space-y-3">
              <Building2 className="h-12 w-12 mx-auto text-slate-300" />
              <h3 className="font-extrabold text-base">No institutions found</h3>
              <p className="text-xs text-graphite-500 dark:text-slate-400">Try clearing your search filters or choose another category.</p>
              <Button size="sm" variant="outline" onClick={() => { setSearchTerm(''); setTypeFilter('all'); }}>
                Reset Filters
              </Button>
            </div>
          ) : (
            filtered.map(inst => <InstitutionCard key={inst.id} inst={inst} onBook={() => navigate(bookingRoute(inst))} />)
          )}
        </div>
      </div>
    </div>
  );
};

// ── Card sub-component ────────────────────────────────────────────────────────

const InstitutionCard = ({ inst, onBook }: { inst: Institution; onBook: () => void }) => {
  // Merge services_offered + specialties into one display list, deduplicated
  const allServices = Array.from(new Set([
    ...(inst.services_offered || []),
    ...(inst.specialties || []),
  ]));

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs hover:shadow-md hover:border-primary-500/50 transition-all flex flex-col">

      {/* ── Card header ── */}
      <div className="p-5 space-y-3 flex-1">
        {/* Name row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary-50 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-primary-200 dark:border-slate-700">
              {TYPE_ICONS[inst.institution_type] || <Building2 className="h-5 w-5 text-primary-500" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">{inst.name}</h3>
              <p className="text-[11px] font-bold text-graphite-500 dark:text-slate-400 capitalize mt-0.5">
                {inst.institution_type?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          {inst.is_verified && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-success-500/10 text-success-500 shrink-0">
              <CheckCircle2 className="h-3 w-3" /> Verified
            </span>
          )}
        </div>

        {/* Location */}
        {inst.location && (
          <div className="flex items-center gap-1.5 text-xs text-graphite-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5 text-primary-500 shrink-0" />
            <span className="truncate">{inst.location}</span>
          </div>
        )}

        {/* Phone */}
        {inst.phone && (
          <div className="flex items-center gap-1.5 text-xs text-graphite-500 dark:text-slate-400">
            <Phone className="h-3.5 w-3.5 text-success-500 shrink-0" />
            <span>{inst.phone}</span>
          </div>
        )}

        {/* ── Capability badge strip ── */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {inst.is_24_7 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-error-500/10 text-error-500">
              <Clock className="h-3 w-3" /> 24 / 7
            </span>
          )}
          {inst.emergency_services && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-warning-500/15 text-warning-600">
              <Zap className="h-3 w-3" /> Emergency
            </span>
          )}
          {inst.ambulance_services && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-primary-500/10 text-primary-500">
              <Siren className="h-3 w-3" /> Ambulance
            </span>
          )}
          {inst.telemedicine_available && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-500">
              <Wifi className="h-3 w-3" /> Telemedicine
            </span>
          )}
          {inst.number_of_beds && inst.number_of_beds > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <BedDouble className="h-3 w-3" /> {inst.number_of_beds} beds
            </span>
          )}
          {inst.accreditation_body && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-success-500/10 text-success-500">
              <ShieldCheck className="h-3 w-3" /> {inst.accreditation_body}
            </span>
          )}
        </div>

        {/* ── Services / specialties ── */}
        {allServices.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {allServices.slice(0, 4).map((svc, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-primary-50 dark:bg-slate-800 text-[10px] font-bold text-primary-500">
                {svc}
              </span>
            ))}
            {allServices.length > 4 && (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                +{allServices.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* ── Equipment (shown if present) ── */}
        {(inst.equipment_available || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(inst.equipment_available || []).slice(0, 3).map((eq, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-canvas dark:bg-slate-800 text-[10px] font-bold text-slate-500 border border-canvas-silk dark:border-slate-700">
                {eq}
              </span>
            ))}
            {(inst.equipment_available || []).length > 3 && (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                +{(inst.equipment_available || []).length - 3}
              </span>
            )}
          </div>
        )}

        {/* ── Languages (shown if more than just English) ── */}
        {(inst.languages_spoken || []).length > 1 && (
          <div className="flex items-center gap-1.5 text-[11px] text-graphite-500 dark:text-slate-400">
            <Languages className="h-3.5 w-3.5 shrink-0" />
            <span>{(inst.languages_spoken || []).join(' · ')}</span>
          </div>
        )}
      </div>

      {/* ── Card footer ── */}
      <div className="px-5 pb-5 pt-3 border-t border-canvas-mist dark:border-slate-800 flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-xl h-9"
          onClick={onBook}
        >
          <Calendar className="h-3.5 w-3.5 mr-1.5" /> Book / Order
        </Button>
        {inst.phone && (
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-3 rounded-xl border-canvas-silk text-xs font-bold hover:bg-primary-50"
            onClick={() => window.open(`tel:${inst.phone}`)}
            title="Call"
          >
            <Phone className="h-3.5 w-3.5" />
          </Button>
        )}
        {inst.website && (
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-3 rounded-xl border-canvas-silk text-xs font-bold hover:bg-primary-50"
            onClick={() => window.open(inst.website, '_blank')}
            title="Website"
          >
            <Globe className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default HealthcareInstitutions;
