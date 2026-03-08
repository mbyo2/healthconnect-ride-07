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
      "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
      "data-[state=unchecked]:bg-muted data-[state=unchecked]:border-input",
      "shadow-inner",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none flex items-center justify-center h-6 w-6 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ease-in-out data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 border-2 border-border"
      )}
    >
      <Check
        className={cn(
          "h-3 w-3 transition-opacity duration-200",
          "data-[state=checked]:opacity-100 data-[state=unchecked]:opacity-0",
          "text-primary"
        )}
        data-state={props.checked ? "checked" : "unchecked"}
      />
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
