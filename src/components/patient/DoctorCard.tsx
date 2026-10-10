import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { providerDisplayName } from "@/utils/providerDisplay";

interface DoctorCardProps {
  provider: {
    id: string;
    first_name?: string;
    last_name?: string;
    specialty?: string;
    avatar_url?: string;
    rating?: number;
    bio?: string;
    consultation_fee_min?: number;
  };
  onSelect?: () => void;
}

/**
 * Reference-style doctor card: photo, name, star rating, specialty.
 * Doc'O Clock blue theme.
 */
export const DoctorCard = ({ provider, onSelect }: DoctorCardProps) => {
  const name = providerDisplayName(provider as any);
  const rating = provider.rating || 4.5;

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-left"
    >
      <Avatar className="h-14 w-14 shrink-0">
        <AvatarImage src={provider.avatar_url} alt={name} />
        <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
          {name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{name}</p>
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
          <span className="text-xs text-gray-500 font-medium">{rating.toFixed(1)}</span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {provider.specialty || "General Practice"}
          {provider.consultation_fee_min ? ` · K${provider.consultation_fee_min}` : ""}
        </p>
      </div>
    </button>
  );
};
