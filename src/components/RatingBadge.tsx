import { Star } from "lucide-react";
import { useEffect, useState } from "react";

interface RatingBadgeProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md";
  showText?: boolean;
  className?: string;
}

export const RatingBadge = ({
  rating,
  maxRating = 5,
  size = "md",
  showText = true,
  className = "",
}: RatingBadgeProps) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const getRatingColor = (rate: number, max: number) => {
    const percentage = (rate / max) * 100;
    if (percentage >= 80) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    if (percentage >= 60) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
  };

  const getStarColor = (rate: number, max: number) => {
    const percentage = (rate / max) * 100;
    if (percentage >= 80) return "text-green-600 dark:text-green-400";
    if (percentage >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getSize = () => {
    switch (size) {
      case "sm":
        return "px-2 py-1 text-xs";
      default:
        return "px-2.5 py-1.5 text-sm";
    }
  };

  const getStarSize = () => {
    switch (size) {
      case "sm":
        return "h-3 w-3";
      default:
        return "h-4 w-4";
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${getSize()} ${getRatingColor(rating, maxRating)} ${className} transition-transform duration-200 ${mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-80'} hover:scale-105 hover:shadow-sm`}>
      <Star className={`fill-current ${getStarSize()} ${getStarColor(rating, maxRating)} transition-colors duration-300`} />
      {showText && <span className="min-w-[2ch] tabular-nums">{rating.toFixed(1)}</span>}
    </div>
  );
};
