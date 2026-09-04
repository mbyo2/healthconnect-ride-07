import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
}

export const StatusBadge = ({ status, variant = "default" }: StatusBadgeProps) => {
  const getBadgeClass = () => {
    switch (variant) {
      case "success":
        return "bg-[#00c875] text-white";
      case "warning":
        return "bg-[#fdab3d] text-white";
      case "error":
        return "bg-[#e44258] text-white";
      case "info":
        return "bg-[#0073ea] text-white";
      default:
        return "bg-[#676879] text-white";
    }
  };

  return (
    <Badge className={`${getBadgeClass()} text-[10px]`}>
      {status}
    </Badge>
  );
};