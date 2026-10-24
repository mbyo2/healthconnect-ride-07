import { Provider } from "@/types/provider";
import { providerDisplayName } from "@/utils/providerDisplay";
import {
  MapPin, CalendarPlus, Video, CheckCircle, Clock,
  Home, Shield, Stethoscope, Calculator,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSearch } from "@/context/SearchContext";
import { useBookedSlots, NextAvailableChip } from "@/components/search/NextAvailableChip";
import { RatingDisplay } from "@/components/RatingDisplay";

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
          <h3 className="text-base font-semibold text-midnight">No providers found</h3>
          <p className="text-graphite-500 dark:text-slate-400 text-sm font-medium">
            Try adjusting your specialty filters, location radius, or insurance criteria — or clear all filters to start over.
          </p>
          <button
            onClick={clearAllFilters}
            className="mt-3 px-4 py-2.5 min-h-[44px] rounded-xl border border-graphite-300 dark:border-slate-700 text-sm font-medium text-graphite-700 dark:text-slate-200 hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors"
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
        const reviewCount = (provider as any).reviews_count ?? 0;
        const profileHref = `/provider/${provider.id}`;

        return (
          <article
            key={provider.id}
            className={`p-4 rounded-2xl border bg-white dark:bg-slate-900 transition-all shadow-sm hover:shadow-md ${
              selectedProvider?.id === provider.id
                ? "border-primary-500 ring-2 ring-primary-500/20"
                : "border-canvas-silk dark:border-slate-700 hover:border-primary-300"
            }`}
          >
            {/* Header: photo + name are a real link; the card itself is not a click target */}
            <div className="flex items-center gap-3 mb-3">
              <Link
                to={profileHref}
                onClick={onProviderSelect ? (e) => { e.preventDefault(); onProviderSelect(provider); } : undefined}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label={`View profile of ${providerDisplayName(provider as any)}`}
              >
                <span className="flex-shrink-0">
                  {provider.avatar_url ? (
                    <img
                      src={provider.avatar_url}
                      alt=""
                      className="w-14 h-14 rounded-2xl object-cover"
                    />
                  ) : (
                    <span className="flex w-14 h-14 rounded-2xl bg-primary-50 items-center justify-center text-lg font-semibold text-primary-600">
                      {provider.first_name?.[0]}{provider.last_name?.[0]}
                    </span>
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-base text-midnight truncate">
                    {providerDisplayName(provider as any)}
                  </span>
                  <span className="mt-0.5 block">
                    <RatingDisplay rating={rating} reviewCount={reviewCount} size="sm" />
                  </span>
                  <span className="block text-xs text-graphite-500 truncate mt-0.5">
                    {provider.specialty || "General Practitioner"}
                    {feeLabel ? <span className="text-primary-600 font-medium"> · {feeLabel}</span> : <span className="text-graphite-500 dark:text-slate-400"> · Fee confirmed at booking</span>}
                  </span>
                </span>
              </Link>
            </div>

                {/* Capability badges — soft-tint pills, real data only */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-success-600 bg-success-50 border border-success-100">
                    <CheckCircle className="h-3 w-3" /> Verified
                  </span>

                  {provider.telemedicine_available && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-primary-600 bg-primary-50 border border-primary-100">
                      <Video className="h-3 w-3" /> Telemedicine
                    </span>
                  )}

                  {provider.home_visits_available && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-graphite-700 bg-canvas-bone border border-canvas-silk">
                      <Home className="h-3 w-3 text-primary-500" /> Home Visits
                    </span>
                  )}

                  {provider.accepts_insurance && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-warning-600 bg-warning-50 border border-warning-100">
                      <Shield className="h-3 w-3" /> Insurance
                    </span>
                  )}

                  {provider.typical_wait_time && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-graphite-700 bg-canvas border border-canvas-silk dark:border-slate-800">
                      <Clock className="h-3 w-3 text-primary-500" /> Wait: {provider.typical_wait_time}
                    </span>
                  )}

                  {provider.distance !== undefined && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-graphite-700 bg-canvas border border-canvas-silk dark:border-slate-800">
                      <MapPin className="h-3 w-3 text-primary-500" /> {provider.distance.toFixed(1)} km
                    </span>
                  )}
                </div>

                {/* Bio preview */}
                {provider.bio && (
                  <p className="text-sm text-graphite-500 dark:text-slate-400 line-clamp-2 mb-2.5 font-medium leading-relaxed">
                    {provider.bio}
                  </p>
                )}

                {/* Subspecialties */}
                {displaySubs.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {displaySubs.map(sub => (
                      <span key={sub} className="inline-flex items-center gap-1 text-xs font-medium bg-primary-50 border border-primary-100 text-primary-600 px-2 py-0.5 rounded-md">
                        <Stethoscope className="h-2.5 w-2.5" /> {sub}
                      </span>
                    ))}
                    {extraSubs > 0 && (
                      <span className="text-xs font-medium text-graphite-500 dark:text-slate-400 px-1 py-0.5">
                        +{extraSubs} more
                      </span>
                    )}
                  </div>
                )}

                {/* Practice location */}
                {provider.primary_practice_location && (
                  <p className="flex items-center gap-1 text-xs text-graphite-500 dark:text-slate-400 mb-2.5">
                    <MapPin className="h-3 w-3 text-primary-500 shrink-0" />
                    {provider.primary_practice_location}
                  </p>
                )}

                {/* Insurance providers (up to 3) */}
                {(provider.insurance_providers_accepted || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {(provider.insurance_providers_accepted || []).slice(0, 3).map(ins => (
                      <span key={ins} className="text-xs font-medium bg-canvas border border-canvas-silk text-graphite-600 px-1.5 py-0.5 rounded-md">
                        {ins}
                      </span>
                    ))}
                    {(provider.insurance_providers_accepted || []).length > 3 && (
                      <span className="text-xs font-medium text-graphite-500 dark:text-slate-400 px-1">
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
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-graphite-500 dark:text-slate-400">
                        <Clock className="h-3.5 w-3.5 text-primary-500" aria-hidden />
                        Avg. wait: {provider.typical_wait_time}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate("/cost-estimator")}
                      className="px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-medium flex items-center gap-1 hover:bg-primary-50 dark:hover:bg-slate-800"
                    >
                      <Calculator className="h-3.5 w-3.5 text-primary-500" /> Estimate Copay
                    </button>
                    <button
                      onClick={() => navigate(`/provider/${provider.id}`)}
                      className="px-3 py-2.5 min-h-[44px] rounded-md border border-graphite-300 dark:border-slate-700 text-xs font-medium text-midnight dark:text-slate-200 hover:bg-canvas-mist dark:hover:bg-slate-800"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => navigate(`/provider/${provider.id}`)}
                      className="px-3.5 py-2.5 min-h-[44px] rounded-md bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold shadow-xs flex items-center gap-1"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" /> Book Consultation
                    </button>
                  </div>
                </div>
          </article>
        );
      })}
    </div>
  );
};
