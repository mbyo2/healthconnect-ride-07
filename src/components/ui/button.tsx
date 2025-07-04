
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline: "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground shadow-sm",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        success: "bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md",
        healthcare: "bg-trust-600 text-white hover:bg-trust-700 shadow-sm hover:shadow-md font-semibold",
        amazon: "bg-orange-400 text-white hover:bg-orange-500 shadow-sm hover:shadow-md font-semibold",
      },
      size: {
        default: "h-11 px-6 py-2.5 min-h-[44px]",
        sm: "h-9 rounded-md px-4 text-xs min-h-[36px]",
        lg: "h-12 rounded-lg px-8 text-base min-h-[48px]",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
        xl: "h-14 px-10 text-lg rounded-lg min-h-[56px]",
        touch: "h-12 px-6 py-3 text-base min-h-[48px] min-w-[48px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
