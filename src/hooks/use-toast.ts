
import { toast as toastFunc } from "sonner";
import { ReactNode } from "react";

type ToastProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  variant?: "default" | "destructive";
};

// Interface for our toast objects
interface Toast extends ToastProps {
  id: string;
}

// Use an array to store active toasts
const toasts: Toast[] = [];

const useToast = () => {
  const toast = ({ title, description, action, variant }: ToastProps = {}) => {
    const id = toastFunc(title as string, {
      description,
      action,
      className: variant === "destructive" ? "bg-destructive" : undefined
    });
    
    // Store complete toast object
    const toastObj: Toast = {
      id: id.toString(),
      title,
      description,
      action,
      variant
    };
    
    toasts.push(toastObj);
    return id;
  };

  return { toast, toasts };
};

export { useToast, toastFunc as toast };
