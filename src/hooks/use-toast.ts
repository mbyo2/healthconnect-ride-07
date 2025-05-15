import { toast as sonnerToast } from "sonner";
import { useToast as useShadcnToast } from "@/components/ui/toast";

// Export a unified toast interface
export const useToast = () => {
  // For components using the shadcn/ui toast system
  const shadcnToast = useShadcnToast();
  
  return {
    ...shadcnToast,
    // Add any additional methods or customizations here
  };
};

// Simple toast function that uses sonner for non-component contexts
export const toast = sonnerToast;
