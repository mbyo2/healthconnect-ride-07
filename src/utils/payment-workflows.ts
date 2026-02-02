import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

interface PaymentStatusHistory {
    status: PaymentStatus;
    timestamp: string;
    reason?: string;
    updatedBy?: string;
}

interface PaymentTransitionResult {
    success: boolean;
    message: string;
    newStatus?: PaymentStatus;
    error?: string;
}

/**
 * Validates if a payment status transition is allowed
 */
export const isValidTransition = (
    currentStatus: PaymentStatus,
    newStatus: PaymentStatus
): boolean => {
    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
        pending: ['completed', 'failed'],
        completed: ['refunded'],
        failed: [], // Failed payments cannot transition
        refunded: [], // Refunded payments are final
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
};

/**
 * Process a payment and transition from pending to completed
 */
export const processPayment = async (
    paymentId: string,
    userId: string
): Promise<PaymentTransitionResult> => {
    try {
        // Get current payment status
        const { data: payment, error: fetchError } = await supabase
            .from('payments')
            .select('status, status_history')
            .eq('id', paymentId)
            .single();

        if (fetchError || !payment) {
            return {
                success: false,
                message: 'Payment not found',
                error: fetchError?.message,
            };
        }

        // Validate transition
        if (!isValidTransition(payment.status as PaymentStatus, 'completed')) {
            return {
                success: false,
                message: `Cannot transition from ${payment.status} to completed`,
            };
        }

        // Update status with history
        const statusHistory = (payment.status_history as unknown as PaymentStatusHistory[]) || [];
        statusHistory.push({
            status: 'completed',
            timestamp: new Date().toISOString(),
            updatedBy: userId,
        });

        const { error: updateError } = await supabase
            .from('payments')
            .update({
                status: 'completed',
                status_history: statusHistory as any,
                updated_at: new Date().toISOString(),
            })
            .eq('id', paymentId);

        if (updateError) {
            return {
                success: false,
                message: 'Failed to update payment status',
                error: updateError.message,
            };
        }

        return {
            success: true,
            message: 'Payment completed successfully',
            newStatus: 'completed',
        };
    } catch (error) {
        console.error('Error processing payment:', error);
        return {
            success: false,
            message: 'An error occurred while processing payment',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

/**
 * Handle payment success
 */
export const handlePaymentSuccess = async (
    paymentId: string,
    userId: string
): Promise<PaymentTransitionResult> => {
    const result = await processPayment(paymentId, userId);

    if (result.success) {
        toast.success('Payment completed successfully');
    } else {
        toast.error(result.message);
    }

    return result;
};

/**
 * Handle payment failure
 */
export const handlePaymentFailure = async (
    paymentId: string,
    reason: string,
    userId?: string
): Promise<PaymentTransitionResult> => {
    try {
        const { data: payment, error: fetchError } = await supabase
            .from('payments')
            .select('status, status_history')
            .eq('id', paymentId)
            .single();

        if (fetchError || !payment) {
            return {
                success: false,
                message: 'Payment not found',
                error: fetchError?.message,
            };
        }

        if (!isValidTransition(payment.status as PaymentStatus, 'failed')) {
            return {
                success: false,
                message: `Cannot transition from ${payment.status} to failed`,
            };
        }

        const statusHistory = (payment.status_history as unknown as PaymentStatusHistory[]) || [];
        statusHistory.push({
            status: 'failed',
            timestamp: new Date().toISOString(),
            reason,
            updatedBy: userId,
        });

        const { error: updateError } = await supabase
            .from('payments')
            .update({
                status: 'failed',
                status_history: statusHistory as any,
                updated_at: new Date().toISOString(),
            })
            .eq('id', paymentId);

        if (updateError) {
            return {
                success: false,
                message: 'Failed to update payment status',
                error: updateError.message,
            };
        }

        toast.error(`Payment failed: ${reason}`);

        return {
            success: true,
            message: 'Payment marked as failed',
            newStatus: 'failed',
        };
    } catch (error) {
        console.error('Error handling payment failure:', error);
        return {
            success: false,
            message: 'An error occurred while handling payment failure',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

/**
 * Process a refund for a completed payment
 */
export const refundPayment = async (
    paymentId: string,
    amount: number | null,
    reason: string,
    userId: string
): Promise<PaymentTransitionResult> => {
    try {
        const { data: payment, error: fetchError } = await supabase
            .from('payments')
            .select('status, amount, status_history')
            .eq('id', paymentId)
            .single();

        if (fetchError || !payment) {
            return {
                success: false,
                message: 'Payment not found',
                error: fetchError?.message,
            };
        }

        if (!isValidTransition(payment.status as PaymentStatus, 'refunded')) {
            return {
                success: false,
                message: `Cannot refund payment with status ${payment.status}`,
            };
        }

        const refundAmount = amount ?? payment.amount;
        const statusHistory = (payment.status_history as unknown as PaymentStatusHistory[]) || [];
        statusHistory.push({
            status: 'refunded',
            timestamp: new Date().toISOString(),
            reason: `Refund: ${reason} (Amount: ${refundAmount})`,
            updatedBy: userId,
        });

        const { error: updateError } = await supabase
            .from('payments')
            .update({
                status: 'refunded',
                status_history: statusHistory as any,
                refund_amount: refundAmount,
                refund_reason: reason,
                updated_at: new Date().toISOString(),
            })
            .eq('id', paymentId);

        if (updateError) {
            return {
                success: false,
                message: 'Failed to process refund',
                error: updateError.message,
            };
        }

        toast.success(`Refund of ${refundAmount} processed successfully`);

        return {
            success: true,
            message: 'Refund processed successfully',
            newStatus: 'refunded',
        };
    } catch (error) {
        console.error('Error processing refund:', error);
        return {
            success: false,
            message: 'An error occurred while processing refund',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

/**
 * Get payment status history
 */
export const getPaymentHistory = async (
    paymentId: string
): Promise<PaymentStatusHistory[]> => {
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('status_history')
            .eq('id', paymentId)
            .single();

        if (error || !data) {
            console.error('Error fetching payment history:', error);
            return [];
        }

        return (data.status_history as unknown as PaymentStatusHistory[]) || [];
    } catch (error) {
        console.error('Error getting payment history:', error);
        return [];
    }
};
