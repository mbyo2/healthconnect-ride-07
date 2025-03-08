
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { CustomBadge } from "@/components/ui/custom-badge"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useEffect } from "react"

const statusVariants = cva("", {
  variants: {
    status: {
      pending: "bg-amber-500 hover:bg-amber-600",
      approved: "bg-green-500 hover:bg-green-600",
      rejected: "bg-red-500 hover:bg-red-600",
      completed: "bg-blue-500 hover:bg-blue-600",
      scheduled: "bg-purple-500 hover:bg-purple-600",
      canceled: "bg-gray-500 hover:bg-gray-600",
    },
  },
  defaultVariants: {
    status: "pending",
  },
})

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusVariants> {
  status: "pending" | "approved" | "rejected" | "completed" | "scheduled" | "canceled"
  itemId: string
  tableName: "health_personnel_applications" | "healthcare_institutions" | "appointments"
  showRealTimeUpdates?: boolean
}

export function StatusBadge({ 
  className, 
  status, 
  itemId, 
  tableName,
  showRealTimeUpdates = true,
  ...props 
}: StatusBadgeProps) {
  const queryClient = useQueryClient()
  
  const { data: currentStatus = status } = useQuery({
    queryKey: [`${tableName}-status`, itemId],
    queryFn: async () => {
      if (!itemId) return status
      
      const { data, error } = await supabase
        .from(tableName)
        .select('status')
        .eq('id', itemId)
        .single()
        
      if (error) {
        console.error(`Error fetching ${tableName} status:`, error)
        return status
      }
      
      return data?.status || status
    },
    initialData: status,
    enabled: showRealTimeUpdates && !!itemId
  })

  // Subscribe to real-time updates
  useEffect(() => {
    if (!showRealTimeUpdates || !itemId) return
    
    const channel = supabase
      .channel(`${tableName}-status-changes`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter: `id=eq.${itemId}`
        },
        (payload) => {
          if (payload.new.status !== payload.old.status) {
            // Invalidate the query to fetch the new status
            queryClient.invalidateQueries({ queryKey: [`${tableName}-status`, itemId] })
          }
        }
      )
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [tableName, itemId, queryClient, showRealTimeUpdates])

  const statusDisplay = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    completed: "Completed",
    scheduled: "Scheduled",
    canceled: "Canceled"
  }

  return (
    <CustomBadge 
      className={cn(statusVariants({ status: currentStatus as any }), className)} 
      {...props}
    >
      {statusDisplay[currentStatus as keyof typeof statusDisplay]}
    </CustomBadge>
  )
}
