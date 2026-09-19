import { Star, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";

interface RatingDisplayProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showTrend?: boolean;
  trend?: "up" | "down" | "stable";
  className?: string;
}

export const RatingDisplay = ({
  rating,
  maxRating = 5,
  size = "md",
  showLabel = true,
  showTrend = false,
  trend = "stable",
  className = "",
}: RatingDisplayProps) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const getRatingColor = (rate: number, max: number) => {
    const percentage = (rate / max) * 100;
    if (percentage >= 80) return "text-green-500";
    if (percentage >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getStarSize = () => {
    switch (size) {
      case "sm":
        return "h-3.5 w-3.5";
      case "lg":
        return "h-5 w-5";
      default:
        return "h-4 w-4";
    }
  };

  const getTextSize = () => {
    switch (size) {
      case "sm":
        return "text-lg";
      case "lg":
        return "text-3xl";
      default:
        return "text-2xl";
    }
  };

  const renderStars = (ratingValue: number) => {
    const fullStars = Math.floor(ratingValue);
    const hasHalfStar = ratingValue % 1 >= 0.5;
    const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-1">
        {/* Full Stars */}
        {Array(fullStars)
          .fill(0)
          .map((_, i) => (
            <Star
              key={`full-${i}`}
              className={`fill-current ${getStarSize()} ${getRatingColor(ratingValue, maxRating)} transform transition-transform duration-400 ${mounted ? 'scale-100' : 'scale-90'}`}
            />
          ))}
        {/* Half Star */}
        {hasHalfStar && (
          <div className="relative">
            <Star className={`${getStarSize()} text-gray-300 dark:text-gray-600`} />
            <div className="absolute inset-0 overflow-hidden" style={{ width: mounted ? '50%' : '0%', transition: 'width 520ms ease-out' }}>
              <Star
                className={`${getStarSize()} fill-current ${getRatingColor(ratingValue, maxRating)}`}
              />
            </div>
          </div>
        )}
        {/* Empty Stars */}
        {Array(emptyStars)
          .fill(0)
          .map((_, i) => (
            <Star
              key={`empty-${i}`}
              className={`${getStarSize()} text-gray-300 dark:text-gray-600`}
            />
          ))}
      </div>
    );
  };

  return (
      <div className={`flex flex-col gap-2 ${className}`}>
      {renderStars(rating)}
      <div className="flex items-center gap-2">
        <span className={`${getTextSize()} font-black ${getRatingColor(rating, maxRating)} transition-transform duration-300 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-60'}`}>
          {rating.toFixed(1)}
        </span>
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
          / {maxRating}
        </span>
        {showTrend && (
          <div className="ml-2">
            {trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
            {trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
            {trend === "stable" && (
              <div className="h-4 w-4 text-gray-400 flex items-center justify-center text-xs font-bold">
                —
              </div>
            )}
          </div>
        )}
      </div>
      {showLabel && (
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {rating >= 4.5
            ? "Excellent"
            : rating >= 4.0
              ? "Very Good"
              : rating >= 3.0
                ? "Good"
                : "Needs Improvement"}
        </p>
      )}
    </div>
  );
};
