
import { toast as toastFunc } from "sonner";
import { ReactNode } from "react";

type ToastProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  variant?: "default" | "destructive";
};

const useToast = () => {
  const toast = ({ title, description, action, variant }: ToastProps = {}) => {
    return toastFunc(title as string, {
      description,
      action,
      className: variant === "destructive" ? "bg-destructive" : undefined
    });
  };

  return { toast };
};

export { useToast, toastFunc as toast };
