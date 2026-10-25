import { cn } from "@/lib/utils"

/**
 * Base loading placeholder. Renders the shared .doc-shimmer treatment
 * (see index.css): a token-driven muted block with a subtle sweep —
 * correct in light and dark mode, static under reduced motion.
 * Compose these into layout-matching skeletons (see skeleton-kit.tsx)
 * rather than showing spinners for page/data loading.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("doc-shimmer rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
