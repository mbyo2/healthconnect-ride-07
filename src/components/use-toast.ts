import { toast as sonnerToast } from "sonner"

type ToastProps = {
    title?: string
    description?: string
    action?: {
        label: string
        onClick: () => void
    }
    duration?: number
}

export const useToast = () => {
    return {
        toast: ({ title, description, action, duration }: ToastProps) => {
            sonnerToast(title, {
                description,
                action,
                duration,
            })
        },
        dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
    }
}

export const toast = sonnerToast