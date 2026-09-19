import { Star, Truck, Award, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useEffect, useState } from "react";

interface SupplierRatingCardProps {
  id: string;
  supplierName: string;
  contactPerson?: string;
  rating: number;
  onTimeDeliveryRate: number;
  qualityScore: number;
  priceCompetitiveness: number;
  totalOrders: number;
  totalDeliveries: number;
  onViewDetails?: () => void;
}

export const SupplierRatingCard = ({
  id,
  supplierName,
  contactPerson,
  rating,
  onTimeDeliveryRate,
  qualityScore,
  priceCompetitiveness,
  totalOrders,
  totalDeliveries,
  onViewDetails,
}: SupplierRatingCardProps) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const getStarColor = (rate: number) => {
    if (rate >= 4.5) return "text-yellow-400";
    if (rate >= 4.0) return "text-yellow-400";
    if (rate >= 3.0) return "text-orange-400";
    return "text-red-400";
  };

  const getMetricColor = (value: number, isPercentage = false) => {
    const actualValue = isPercentage ? value : value;
    if (actualValue >= 0.85 || actualValue >= 4.0)
      return "text-green-600 dark:text-green-400";
    if (actualValue >= 0.7 || actualValue >= 3.0)
      return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const renderStars = (ratingValue: number) => {
    const fullStars = Math.floor(ratingValue);
    const hasHalfStar = ratingValue % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-1">
        {/* Full Stars */}
        {Array(fullStars)
          .fill(0)
          .map((_, i) => (
            <Star
              key={`full-${i}`}
              className={`h-4 w-4 fill-current ${getStarColor(ratingValue)} transform transition-transform duration-400 ${mounted ? 'scale-100' : 'scale-90'}`}
            />
          ))}
        {/* Half Star */}
        {hasHalfStar && (
          <div className="relative w-4 h-4">
            <Star className="h-4 w-4 text-gray-300 dark:text-gray-600" />
            <div className="absolute inset-0 overflow-hidden" style={{ width: mounted ? '50%' : '0%', transition: 'width 520ms ease-out' }}>
              <Star className={`h-4 w-4 fill-current ${getStarColor(ratingValue)}`} />
            </div>
          </div>
        )}
        {/* Empty Stars */}
        {Array(emptyStars)
          .fill(0)
          .map((_, i) => (
            <Star
              key={`empty-${i}`}
              className={`h-4 w-4 text-gray-300 dark:text-gray-600 transform transition-transform duration-400 ${mounted ? 'scale-100' : 'scale-90'}`}
            />
          ))}
      </div>
    );
  };

  const MetricBar = ({
    label,
    value,
    max = 100,
    isPercentage = false,
    icon: Icon,
  }: {
    label: string;
    value: number;
    max?: number;
    isPercentage?: boolean;
    icon: React.ReactNode;
  }) => {
    const displayValue = isPercentage ? (value * 100).toFixed(0) : value.toFixed(1);
    const percentage = isPercentage
      ? (value * 100).toFixed(0)
      : ((value / max) * 100).toFixed(0);

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-gray-500 dark:text-gray-400">{Icon}</div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {label}
            </span>
          </div>
          <span className={`text-xs font-bold ${getMetricColor(value, isPercentage)}`}>
            {displayValue}
            {isPercentage ? "%" : ""}
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ease-out ${
              Number(percentage) >= 85
                ? "bg-gradient-to-r from-green-400 to-green-500"
                : Number(percentage) >= 70
                  ? "bg-gradient-to-r from-amber-400 to-amber-500"
                  : "bg-gradient-to-r from-red-400 to-red-500"
            }`}
            style={{ width: mounted ? `${percentage}%` : '0%' }}
          />
        </div>
      </div>
    );
  };

  return (
    <Card className="border border-gray-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group transform-gpu hover:-translate-y-0.5">
      {/* Header with Rating */}
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/50 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-white mb-1">
              {supplierName}
            </CardTitle>
            {contactPerson && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {contactPerson}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
              {rating.toFixed(1)}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
              out of 5
            </div>
          </div>
        </div>

        {/* Star Rating */}
        <div className="mt-2 pt-3 border-t border-gray-200 dark:border-slate-700">
          {renderStars(rating)}
        </div>
      </CardHeader>

      {/* Metrics */}
      <CardContent className="p-4">
        <div className="space-y-3.5">
          <MetricBar
            label="On-Time Delivery"
            value={onTimeDeliveryRate}
            max={1}
            isPercentage={true}
            icon={<Truck className="h-3.5 w-3.5" />}
          />
          <MetricBar
            label="Quality Score"
            value={qualityScore}
            max={5}
            icon={<Award className="h-3.5 w-3.5" />}
          />
          <MetricBar
            label="Price Competitiveness"
            value={priceCompetitiveness}
            max={5}
            icon={<Zap className="h-3.5 w-3.5" />}
          />
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <div className="flex gap-3">
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                {totalOrders}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">orders</span>
            </div>
            <div className="text-gray-400 dark:text-gray-600">•</div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                {totalDeliveries}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">delivered</span>
            </div>
          </div>
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewDetails}
              className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
