import { Star, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";

interface RatingDisplayProps {
  rating?: number | null;
  /** Number of reviews behind the rating — shown as "(n reviews)". */
  reviewCount?: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  /** Kept for API compatibility. No judgement labels are rendered anymore. */
  showLabel?: boolean;
  showTrend?: boolean;
  trend?: "up" | "down" | "stable";
  className?: string;
}

/**
 * The one rating treatment used across public surfaces: amber stars +
 * numeric rating + review count. No colour-coding by score and no
 * judgement labels — a marketplace never prints "Needs Improvement"
 * under a clinician's name. Unrated providers read "New provider"
 * instead of five empty stars (which look like a 0-star rating).
 */
export const RatingDisplay = ({
  rating,
  reviewCount,
  maxRating = 5,
  size = "md",
  showTrend = false,
  trend = "stable",
  className = "",
}: RatingDisplayProps) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const value = rating != null && Number(rating) > 0 ? Number(rating) : null;

  if (value === null) {
    return (
      <span className={`inline-flex items-center text-xs font-medium text-graphite-500 dark:text-slate-400 ${className}`}>
        New provider
      </span>
    );
  }

  const starSize = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";

  const fullStars = Math.floor(value);
  const hasHalfStar = value % 1 >= 0.5;
  const emptyStars = Math.max(0, maxRating - fullStars - (hasHalfStar ? 1 : 0));

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="flex items-center gap-0.5" aria-hidden>
        {Array(fullStars).fill(0).map((_, i) => (
          <Star
            key={`full-${i}`}
            className={`${starSize} fill-amber-400 text-amber-400 transform transition-transform duration-400 ${mounted ? "scale-100" : "scale-90"}`}
          />
        ))}
        {hasHalfStar && (
          <span className="relative inline-flex">
            <Star className={`${starSize} text-graphite-300 dark:text-slate-600`} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: mounted ? "50%" : "0%", transition: "width 520ms ease-out" }}>
              <Star className={`${starSize} fill-amber-400 text-amber-400`} />
            </span>
          </span>
        )}
        {Array(emptyStars).fill(0).map((_, i) => (
          <Star key={`empty-${i}`} className={`${starSize} text-graphite-300 dark:text-slate-600`} />
        ))}
      </span>
      <span className={`${textSize} font-semibold text-midnight`}>
        {value.toFixed(1)}
      </span>
      {reviewCount != null && reviewCount > 0 && (
        <span className={`${textSize} font-medium text-graphite-500 dark:text-slate-400`}>
          ({reviewCount} review{reviewCount === 1 ? "" : "s"})
        </span>
      )}
      {showTrend && (
        <span className="ml-1 inline-flex" aria-hidden>
          {trend === "up" && <TrendingUp className="h-4 w-4 text-primary-500" />}
          {trend === "down" && <TrendingDown className="h-4 w-4 text-graphite-400" />}
          {trend === "stable" && (
            <span className="flex h-4 w-4 items-center justify-center text-xs font-bold text-graphite-400">—</span>
          )}
        </span>
      )}
      <span className="sr-only">
        Rated {value.toFixed(1)} out of {maxRating}{reviewCount ? ` from ${reviewCount} reviews` : ""}
      </span>
    </span>
  );
};
