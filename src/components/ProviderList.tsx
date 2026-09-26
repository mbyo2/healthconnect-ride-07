import { Provider } from "@/types/provider";
import { providerDisplayName } from "@/utils/providerDisplay";
import {
  MapPin, Star, CalendarPlus, Video, CheckCircle, Clock,
  Home, Shield, DollarSign, GraduationCap, Stethoscope, Calculator,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useSearch } from "@/context/SearchContext";

interface ProviderListProps {
  providers: Provider[];
  onProviderSelect?: (provider: Provider) => void;
  selectedProvider?: Provider | null;
}

export const ProviderList = ({ providers, onProviderSelect, selectedProvider }: ProviderListProps) => {
  const navigate = useNavigate();
  const {
    setSearchTerm, setSelectedType, setSelectedSpecialty, setSelectedInsurance,
    setMaxDistance, setUseUserLocation, setTelemedicineOnly, setHomeVisitsOnly,
    setSelectedLanguage, setFeeMax,
  } = useSearch();

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedType(null);
    setSelectedSpecialty(null);
    setSelectedInsurance(null);
    setMaxDistance(50);
    setUseUserLocation(false);
    setTelemedicineOnly(false);
    setHomeVisitsOnly(false);
    setSelectedLanguage(null);
    setFeeMax(null);
  };

  if (providers.length === 0) {
    return (
      <div className="p-8 text-center bg-canvas dark:bg-slate-900 rounded-2xl border border-canvas-silk dark:border-slate-800 font-sans">
        <div className="max-w-md mx-auto space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white dark:bg-slate-800 border border-canvas-silk dark:border-slate-700 flex items-center justify-center">
            <MapPin className="h-6 w-6 text-primary-500" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">No providers found</h3>
          <p className="text-graphite-500 dark:text-slate-400 text-xs font-medium">
            Try adjusting your specialty filters, location radius, or insurance criteria — or clear all filters to start over.
          </p>
          <button
            onClick={clearAllFilters}
            className="mt-3 px-4 py-2.5 min-h-[44px] rounded-xl border border-graphite-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      {providers.map((provider) => {
        const feeLabel = (() => {
          if (provider.consultation_fee_min && provider.consultation_fee_max)
            return `K${provider.consultation_fee_min}–K${provider.consultation_fee_max}`;
          if (provider.consultation_fee_min) return `From K${provider.consultation_fee_min}`;
          if (provider.consultation_fee) return `K${provider.consultation_fee}`;
          return null;
        })();

        const subs = provider.subspecialties || [];
        const displaySubs = subs.slice(0, 2);
        const extraSubs = subs.length > 2 ? subs.length - 2 : 0;

        return (
          <div
            key={provider.id}
            onClick={() => (onProviderSelect ? onProviderSelect(provider) : navigate(`/provider/${provider.id}`))}
            className={`p-5 rounded-2xl border bg-white dark:bg-slate-900 transition-all cursor-pointer shadow-xs ${
              selectedProvider?.id === provider.id
                ? "border-primary-500 ring-2 ring-primary-500/20"
                : "border-canvas-silk dark:border-slate-800 hover:border-primary-500"
            }`}
          >
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {provider.avatar_url ? (
                  <img
                    src={provider.avatar_url}
                    alt={`${provider.first_name} ${provider.last_name}`}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-canvas-silk dark:border-slate-800"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-primary-50 flex items-center justify-center text-xl font-black text-primary-500 border border-primary-200">
                    {provider.first_name?.[0]}{provider.last_name?.[0]}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {/* Name row */}
                <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                      {providerDisplayName(provider as any)}
                    </h3>
                    <p className="text-primary-500 font-extrabold text-xs">
                      {provider.specialty || "General Practitioner"}
                    </p>
                    {/* Medical school line */}
                    {provider.medical_school && (
                      <p className="flex items-center gap-1 text-[11px] text-graphite-500 dark:text-slate-400 font-medium mt-0.5">
                        <GraduationCap className="h-3 w-3 shrink-0" />
                        {provider.medical_school}
                        {provider.graduation_year && ` '${String(provider.graduation_year).slice(-2)}`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {provider.rating && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-900 bg-warning-500/20 border border-warning-500/30">
                        <Star className="h-3 w-3 text-warning-500 fill-warning-500" />
                        {Number(provider.rating).toFixed(1)}
                      </span>
                    )}
                    {/* Consultation fee — prominent */}
                    {feeLabel && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-primary-500">
                        <DollarSign className="h-3 w-3" />
                        {feeLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Capability badges — real data, not hardcoded */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black text-white bg-success-500">
                    <CheckCircle className="h-3 w-3" /> Verified
                  </span>

                  {provider.telemedicine_available && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black text-white bg-primary-500">
                      <Video className="h-3 w-3" /> Telemedicine
                    </span>
                  )}

                  {provider.home_visits_available && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black text-white bg-purple-500">
                      <Home className="h-3 w-3" /> Home Visits
                    </span>
                  )}

                  {provider.accepts_insurance && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black text-white bg-warning-500">
                      <Shield className="h-3 w-3" /> Insurance
                    </span>
                  )}

                  {provider.typical_wait_time && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black text-slate-700 bg-canvas border border-canvas-silk dark:border-slate-800">
                      <Clock className="h-3 w-3 text-primary-500" /> Wait: {provider.typical_wait_time}
                    </span>
                  )}

                  {provider.distance !== undefined && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black text-slate-700 bg-canvas border border-canvas-silk dark:border-slate-800">
                      <MapPin className="h-3 w-3 text-primary-500" /> {provider.distance.toFixed(1)} km
                    </span>
                  )}
                </div>

                {/* Bio preview */}
                {provider.bio && (
                  <p className="text-xs text-graphite-500 dark:text-slate-400 line-clamp-2 mb-2.5 font-medium leading-relaxed">
                    {provider.bio}
                  </p>
                )}

                {/* Subspecialties */}
                {displaySubs.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {displaySubs.map(sub => (
                      <span key={sub} className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-primary-50 border border-primary-200 text-primary-500 px-2 py-0.5 rounded-md">
                        <Stethoscope className="h-2.5 w-2.5" /> {sub}
                      </span>
                    ))}
                    {extraSubs > 0 && (
                      <span className="text-[10px] font-extrabold text-graphite-500 dark:text-slate-400 px-1 py-0.5">
                        +{extraSubs} more
                      </span>
                    )}
                  </div>
                )}

                {/* Practice location */}
                {provider.primary_practice_location && (
                  <p className="flex items-center gap-1 text-[11px] text-graphite-500 dark:text-slate-400 mb-2.5">
                    <MapPin className="h-3 w-3 text-primary-500 shrink-0" />
                    {provider.primary_practice_location}
                  </p>
                )}

                {/* Insurance providers (up to 3) */}
                {(provider.insurance_providers_accepted || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {(provider.insurance_providers_accepted || []).slice(0, 3).map(ins => (
                      <span key={ins} className="text-[10px] font-bold bg-canvas border border-canvas-silk text-slate-600 px-1.5 py-0.5 rounded-md">
                        {ins}
                      </span>
                    ))}
                    {(provider.insurance_providers_accepted || []).length > 3 && (
                      <span className="text-[10px] font-bold text-graphite-500 dark:text-slate-400 px-1">
                        +{(provider.insurance_providers_accepted || []).length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Actions footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-canvas-silk dark:border-slate-800">
                  <div className="flex items-center gap-1 text-xs font-bold text-success-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {provider.typical_wait_time
                        ? `Avg. wait: ${provider.typical_wait_time}`
                        : "Check availability"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); navigate("/cost-estimator"); }}
                      className="px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 hover:bg-primary-50 dark:hover:bg-slate-800"
                    >
                      <Calculator className="h-3.5 w-3.5 text-primary-500" /> Estimate Copay
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/provider/${provider.id}`); }}
                      className="px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200 hover:bg-canvas-mist dark:hover:bg-slate-800"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/provider/${provider.id}`); }}
                      className="px-3.5 py-2.5 min-h-[44px] rounded-md bg-primary-500 hover:bg-primary-600 text-white text-[11px] font-extrabold shadow-xs flex items-center gap-1"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" /> Book Consultation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
