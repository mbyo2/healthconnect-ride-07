import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      // ON state - Very dark/black for maximum contrast
      "data-[state=checked]:bg-black dark:data-[state=checked]:bg-slate-950 data-[state=checked]:border-black dark:data-[state=checked]:border-slate-900",
      // OFF state - Light gray
      "data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-700 data-[state=unchecked]:border-slate-400 dark:data-[state=unchecked]:border-slate-600",
      "shadow-inner",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none flex items-center justify-center h-6 w-6 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 border-2 border-slate-200 dark:border-slate-300"
      )}
    >
      {/* Checkmark icon visible when ON */}
      <Check
        className={cn(
          "h-3 w-3 transition-opacity duration-200",
          "data-[state=checked]:opacity-100 data-[state=unchecked]:opacity-0",
          "text-black dark:text-slate-950"
        )}
        data-state={props.checked ? "checked" : "unchecked"}
      />
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
