
// Re-export toast from the hooks directory
import { useToast as useToastHook, toast as toastFunc } from "@/hooks/use-toast";

export const useToast = useToastHook;
export const toast = toastFunc;
