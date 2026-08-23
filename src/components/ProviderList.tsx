import { Provider } from "@/types/provider";
import { MapPin, Star, CalendarPlus, Video, CheckCircle, Clock, ShieldCheck, Calculator } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProviderListProps {
  providers: Provider[];
  onProviderSelect?: (provider: Provider) => void;
  selectedProvider?: Provider | null;
}

export const ProviderList = ({ providers, onProviderSelect, selectedProvider }: ProviderListProps) => {
  const navigate = useNavigate();

  const handleViewProfile = (providerId: string) => {
    navigate(`/provider/${providerId}`);
  };

  const handleBookNow = (e: React.MouseEvent, providerId: string) => {
    e.stopPropagation();
    navigate(`/provider/${providerId}`);
  };

  if (providers.length === 0) {
    return (
      <div className="p-8 text-center bg-[#f5f6f8] rounded-2xl border border-[#e6e9ef] font-sans">
        <div className="max-w-md mx-auto space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white border border-[#e6e9ef] flex items-center justify-center">
            <MapPin className="h-6 w-6 text-[#0073ea]" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">No verified providers found</h3>
          <p className="text-[#676879] text-xs font-medium">
            Try adjusting your specialty filters, location radius, or insurance criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      {providers.map((provider) => (
        <div
          key={provider.id}
          onClick={() => onProviderSelect?.(provider)}
          className={`p-5 rounded-2xl border bg-white transition-all cursor-pointer shadow-xs ${
            selectedProvider?.id === provider.id
              ? "border-[#0073ea] ring-2 ring-[#0073ea]/20"
              : "border-[#e6e9ef] hover:border-[#0073ea]"
          }`}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Provider Image */}
            <div className="flex-shrink-0">
              {provider.avatar_url ? (
                <img
                  src={provider.avatar_url}
                  alt={`Dr. ${provider.first_name} ${provider.last_name}`}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-[#e6e9ef]"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#e5f0ff] flex items-center justify-center text-xl font-black text-[#0073ea] border border-[#c5d9f7]">
                  {provider.first_name?.[0]}{provider.last_name?.[0]}
                </div>
              )}
            </div>

            {/* Provider Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Dr. {provider.first_name} {provider.last_name}
                  </h3>
                  <p className="text-[#0073ea] font-extrabold text-xs">{provider.specialty || "General Practitioner"}</p>
                </div>

                {provider.rating && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-900 bg-[#fdab3d]/20 border border-[#fdab3d]/30 flex items-center gap-1">
                    <Star className="h-3 w-3 text-[#fdab3d] fill-[#fdab3d]" />
                    {provider.rating.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Quick Info Badges */}
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#00c875] flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Verified Practitioner
                </span>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#0073ea] flex items-center gap-1">
                  <Video className="h-3 w-3" /> Telehealth Ready
                </span>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#a25ddc] flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Insurance Direct Pay
                </span>
                {provider.distance !== undefined && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-700 bg-[#f5f6f8] border border-[#e6e9ef] flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-[#0073ea]" /> {provider.distance.toFixed(1)} km
                  </span>
                )}
              </div>

              {/* Bio Preview */}
              {provider.bio && (
                <p className="text-xs text-[#676879] line-clamp-2 mb-2.5 font-medium leading-relaxed">
                  {provider.bio}
                </p>
              )}

              {/* Expertise Tags */}
              {provider.expertise && provider.expertise.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {provider.expertise.slice(0, 3).map((exp) => (
                    <span key={exp} className="text-[10px] font-extrabold bg-[#f5f6f8] border border-[#e6e9ef] text-slate-700 px-2 py-0.5 rounded-md">
                      {exp}
                    </span>
                  ))}
                  {provider.expertise.length > 3 && (
                    <span className="text-[10px] font-extrabold text-[#676879] px-1 py-0.5">
                      +{provider.expertise.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#e6e9ef]">
                <div className="flex items-center gap-1 text-xs font-bold text-[#00c875]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Available Today</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/cost-estimator");
                    }}
                    className="px-3 py-1.5 rounded-md border border-[#c3c6d4] text-[11px] font-bold flex items-center gap-1 hover:bg-[#e5f0ff]"
                  >
                    <Calculator className="h-3.5 w-3.5 text-[#0073ea]" /> Estimate Copay
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewProfile(provider.id);
                    }}
                    className="px-3 py-1.5 rounded-md border border-[#c3c6d4] text-[11px] font-bold text-slate-800 hover:bg-[#f0f2f7]"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={(e) => handleBookNow(e, provider.id)}
                    className="px-3.5 py-1.5 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white text-[11px] font-extrabold shadow-xs flex items-center gap-1"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" /> Book Consultation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
