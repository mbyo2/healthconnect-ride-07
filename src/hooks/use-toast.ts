
import { toast as toastFunc } from "sonner";
import { ReactNode } from "react";

type ToastProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  variant?: "default" | "destructive";
};

// Array to store active toasts
const toasts: string[] = [];

const useToast = () => {
  const toast = ({ title, description, action, variant }: ToastProps = {}) => {
    const id = toastFunc(title as string, {
      description,
      action,
      className: variant === "destructive" ? "bg-destructive" : undefined
    });
    toasts.push(id.toString());
    return id;
  };

  return { toast, toasts };
};

export { useToast, toastFunc as toast };
