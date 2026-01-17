import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const sb: any = supabase;

export type MarketplaceOrderStatus =
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'delivered'
    | 'cancelled';

interface OrderStatusHistory {
    status: MarketplaceOrderStatus;
    timestamp: string;
    reason?: string;
    updatedBy?: string;
}

interface OrderTransitionResult {
    success: boolean;
    message: string;
    newStatus?: MarketplaceOrderStatus;
    error?: string;
}

/**
 * Validates if an order status transition is allowed
 */
export const isValidOrderTransition = (
    currentStatus: MarketplaceOrderStatus,
    newStatus: MarketplaceOrderStatus
): boolean => {
    const validTransitions: Record<MarketplaceOrderStatus, MarketplaceOrderStatus[]> = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['preparing', 'cancelled'],
        preparing: ['ready', 'cancelled'],
        ready: ['delivered'],
        delivered: [], // Final state
        cancelled: [], // Final state
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
};

/**
 * Confirm an order
 */
export const confirmOrder = async (
    orderId: string,
    userId: string
): Promise<OrderTransitionResult> => {
    return await transitionOrderStatus(orderId, 'confirmed', userId);
};

/**
 * Start order preparation
 */
export const startPreparation = async (
    orderId: string,
    userId: string
): Promise<OrderTransitionResult> => {
    return await transitionOrderStatus(orderId, 'preparing', userId);
};

/**
 * Mark order as ready for pickup/delivery
 */
export const markReady = async (
    orderId: string,
    userId: string
): Promise<OrderTransitionResult> => {
    return await transitionOrderStatus(orderId, 'ready', userId);
};

/**
 * Mark order as delivered
 */
export const markDelivered = async (
    orderId: string,
    userId: string
): Promise<OrderTransitionResult> => {
    return await transitionOrderStatus(orderId, 'delivered', userId);
};

/**
 * Cancel an order
 */
export const cancelOrder = async (
    orderId: string,
    reason: string,
    userId: string
): Promise<OrderTransitionResult> => {
    return await transitionOrderStatus(orderId, 'cancelled', userId, reason);
};

/**
 * Core function to transition order status
 */
const transitionOrderStatus = async (
    orderId: string,
    newStatus: MarketplaceOrderStatus,
    userId: string,
    reason?: string
): Promise<OrderTransitionResult> => {
    try {
        // Get current order
        const { data: order, error: fetchError } = await sb
            .from('marketplace_orders')
            .select('status, status_history')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) {
            return {
                success: false,
                message: 'Order not found',
                error: fetchError?.message,
            };
        }

        // Validate transition
        if (!isValidOrderTransition(order.status, newStatus)) {
            return {
                success: false,
                message: `Cannot transition from ${order.status} to ${newStatus}`,
            };
        }

        // Update status with history
        const statusHistory: OrderStatusHistory[] = order.status_history || [];
        statusHistory.push({
            status: newStatus,
            timestamp: new Date().toISOString(),
            reason,
            updatedBy: userId,
        });

        const { error: updateError } = await sb
            .from('marketplace_orders')
            .update({
                status: newStatus,
                status_history: statusHistory,
                status_updated_at: new Date().toISOString(),
                status_updated_by: userId,
            })
            .eq('id', orderId);

        if (updateError) {
            return {
                success: false,
                message: 'Failed to update order status',
                error: updateError.message,
            };
        }

        const statusMessages: Record<MarketplaceOrderStatus, string> = {
            pending: 'Order is pending',
            confirmed: 'Order confirmed',
            preparing: 'Order is being prepared',
            ready: 'Order is ready',
            delivered: 'Order delivered',
            cancelled: 'Order cancelled',
        };

        toast.success(statusMessages[newStatus]);

        return {
            success: true,
            message: statusMessages[newStatus],
            newStatus,
        };
    } catch (error) {
        console.error('Error transitioning order status:', error);
        return {
            success: false,
            message: 'An error occurred while updating order status',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

/**
 * Get order status history
 */
export const getOrderHistory = async (
    orderId: string
): Promise<OrderStatusHistory[]> => {
    try {
        const { data, error } = await sb
            .from('marketplace_orders')
            .select('status_history')
            .eq('id', orderId)
            .single();

        if (error || !data) {
            console.error('Error fetching order history:', error);
            return [];
        }

        return data.status_history || [];
    } catch (error) {
        console.error('Error getting order history:', error);
        return [];
    }
};
