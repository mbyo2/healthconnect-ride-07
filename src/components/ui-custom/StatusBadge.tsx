import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
}

export const StatusBadge = ({ status, variant = "default" }: StatusBadgeProps) => {
  const getBadgeClass = () => {
    switch (variant) {
      case "success":
        return "bg-success-700 text-white";
      case "warning":
        return "bg-warning-700 text-white";
      case "error":
        return "bg-error-700 text-white";
      case "info":
        return "bg-primary-500 text-white";
      default:
        return "bg-foreground text-background";
    }
  };

  return (
    <Badge className={`${getBadgeClass()} text-xs`}>
      {status}
    </Badge>
  );
};