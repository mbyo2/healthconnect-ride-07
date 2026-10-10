import { Provider } from "@/types/provider";
import { providerDisplayName } from "@/utils/providerDisplay";
import {
  MapPin, Star, CalendarPlus, Video, CheckCircle, Clock,
  Home, Shield, DollarSign, GraduationCap, Stethoscope, Calculator,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useSearch } from "@/context/SearchContext";
import { useBookedSlots, NextAvailableChip } from "@/components/search/NextAvailableChip";

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

  // Batched next-availability: one query for all visible providers.
  const bookedByProvider = useBookedSlots(providers.map((p) => p.id));

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
    <div className="space-y-3 font-sans">
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
        const rating = Number(provider.rating) || 0;

        return (
          <div
            key={provider.id}
            onClick={() => (onProviderSelect ? onProviderSelect(provider) : navigate(`/provider/${provider.id}`))}
            className={`p-4 rounded-2xl border bg-white transition-all cursor-pointer shadow-sm hover:shadow-md ${
              selectedProvider?.id === provider.id
                ? "border-blue-600 ring-2 ring-blue-600/20"
                : "border-gray-100 hover:border-blue-200"
            }`}
          >
            {/* Reference-style header: photo, name, stars, specialty, fee */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0">
                {provider.avatar_url ? (
                  <img
                    src={provider.avatar_url}
                    alt={`${provider.first_name} ${provider.last_name}`}
                    className="w-14 h-14 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-700">
                    {provider.first_name?.[0]}{provider.last_name?.[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-gray-900 truncate">
                  {providerDisplayName(provider as any)}
                </h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i <= Math.round(rating)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-gray-200 text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  {rating > 0 && (
                    <span className="text-xs text-gray-500 font-medium">{rating.toFixed(1)}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {provider.specialty || "General Practitioner"}
                  {feeLabel && <span className="text-blue-600 font-semibold"> · {feeLabel}</span>}
                </p>
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
                  <div className="flex items-center gap-2">
                    <NextAvailableChip provider={provider} booked={bookedByProvider.get(provider.id)} />
                    {provider.typical_wait_time && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-graphite-500 dark:text-slate-400">
                        <Clock className="h-3.5 w-3.5 text-primary-500" aria-hidden />
                        Avg. wait: {provider.typical_wait_time}
                      </span>
                    )}
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
        );
      })}
    </div>
  );
};
