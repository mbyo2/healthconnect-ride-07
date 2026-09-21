import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
}

export const StatusBadge = ({ status, variant = "default" }: StatusBadgeProps) => {
  const getBadgeClass = () => {
    switch (variant) {
      case "success":
        return "bg-success-500 text-white";
      case "warning":
        return "bg-warning-500 text-white";
      case "error":
        return "bg-error-500 text-white";
      case "info":
        return "bg-primary-500 text-white";
      default:
        return "bg-graphite-500 dark:bg-slate-600 text-white";
    }
  };

  return (
    <Badge className={`${getBadgeClass()} text-[10px]`}>
      {status}
    </Badge>
  );
};