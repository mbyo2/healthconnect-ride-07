import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ConnectionStatus = 'pending' | 'approved' | 'rejected' | 'blocked';

interface ConnectionStatusHistory {
    status: ConnectionStatus;
    timestamp: string;
    reason?: string;
    updatedBy?: string;
}

interface ConnectionTransitionResult {
    success: boolean;
    message: string;
    newStatus?: ConnectionStatus;
    error?: string;
}

/**
 * Validates if a connection status transition is allowed
 */
export const isValidConnectionTransition = (
    currentStatus: ConnectionStatus,
    newStatus: ConnectionStatus
): boolean => {
    const validTransitions: Record<ConnectionStatus, ConnectionStatus[]> = {
        pending: ['approved', 'rejected'],
        approved: ['blocked'],
        rejected: [], // Final state
        blocked: ['approved'], // Can unblock
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
};

/**
 * Send a connection request
 */
export const sendConnectionRequest = async (
    fromUserId: string,
    toUserId: string,
    message?: string
): Promise<ConnectionTransitionResult> => {
    try {
        // Check if connection already exists
        const { data: existing } = await supabase
            .from('connections')
            .select('id, status')
            .or(`from_user_id.eq.${fromUserId},to_user_id.eq.${toUserId}`)
            .or(`from_user_id.eq.${toUserId},to_user_id.eq.${fromUserId}`)
            .single();

        if (existing) {
            return {
                success: false,
                message: `Connection already exists with status: ${existing.status}`,
            };
        }

        // Create new connection request
        const statusHistory: ConnectionStatusHistory[] = [{
            status: 'pending',
            timestamp: new Date().toISOString(),
            updatedBy: fromUserId,
        }];

        const { data, error } = await supabase
            .from('connections')
            .insert({
                from_user_id: fromUserId,
                to_user_id: toUserId,
                status: 'pending',
                message,
                status_history: statusHistory,
                status_changed_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            return {
                success: false,
                message: 'Failed to send connection request',
                error: error.message,
            };
        }

        toast.success('Connection request sent');

        return {
            success: true,
            message: 'Connection request sent successfully',
            newStatus: 'pending',
        };
    } catch (error) {
        console.error('Error sending connection request:', error);
        return {
            success: false,
            message: 'An error occurred while sending connection request',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

/**
 * Approve a connection request
 */
export const approveConnection = async (
    connectionId: string,
    userId: string
): Promise<ConnectionTransitionResult> => {
    return await transitionConnectionStatus(connectionId, 'approved', userId);
};

/**
 * Reject a connection request
 */
export const rejectConnection = async (
    connectionId: string,
    userId: string,
    reason?: string
): Promise<ConnectionTransitionResult> => {
    return await transitionConnectionStatus(connectionId, 'rejected', userId, reason);
};

/**
 * Block a connection
 */
export const blockConnection = async (
    connectionId: string,
    userId: string,
    reason?: string
): Promise<ConnectionTransitionResult> => {
    return await transitionConnectionStatus(connectionId, 'blocked', userId, reason);
};

/**
 * Unblock a connection (blocked → approved)
 */
export const unblockConnection = async (
    connectionId: string,
    userId: string
): Promise<ConnectionTransitionResult> => {
    return await transitionConnectionStatus(connectionId, 'approved', userId, 'Unblocked');
};

/**
 * Core function to transition connection status
 */
const transitionConnectionStatus = async (
    connectionId: string,
    newStatus: ConnectionStatus,
    userId: string,
    reason?: string
): Promise<ConnectionTransitionResult> => {
    try {
        // Get current connection
        const { data: connection, error: fetchError } = await supabase
            .from('connections')
            .select('status, status_history')
            .eq('id', connectionId)
            .single();

        if (fetchError || !connection) {
            return {
                success: false,
                message: 'Connection not found',
                error: fetchError?.message,
            };
        }

        // Validate transition
        if (!isValidConnectionTransition(connection.status, newStatus)) {
            return {
                success: false,
                message: `Cannot transition from ${connection.status} to ${newStatus}`,
            };
        }

        // Update status with history
        const statusHistory: ConnectionStatusHistory[] = connection.status_history || [];
        statusHistory.push({
            status: newStatus,
            timestamp: new Date().toISOString(),
            reason,
            updatedBy: userId,
        });

        const updateData: any = {
            status: newStatus,
            status_history: statusHistory,
            status_changed_at: new Date().toISOString(),
        };

        if (newStatus === 'rejected' && reason) {
            updateData.rejection_reason = reason;
        }

        const { error: updateError } = await supabase
            .from('connections')
            .update(updateData)
            .eq('id', connectionId);

        if (updateError) {
            return {
                success: false,
                message: 'Failed to update connection status',
                error: updateError.message,
            };
        }

        const statusMessages: Record<ConnectionStatus, string> = {
            pending: 'Connection request pending',
            approved: 'Connection approved',
            rejected: 'Connection rejected',
            blocked: 'Connection blocked',
        };

        toast.success(statusMessages[newStatus]);

        return {
            success: true,
            message: statusMessages[newStatus],
            newStatus,
        };
    } catch (error) {
        console.error('Error transitioning connection status:', error);
        return {
            success: false,
            message: 'An error occurred while updating connection status',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

/**
 * Get connection status history
 */
export const getConnectionHistory = async (
    connectionId: string
): Promise<ConnectionStatusHistory[]> => {
    try {
        const { data, error } = await supabase
            .from('connections')
            .select('status_history')
            .eq('id', connectionId)
            .single();

        if (error || !data) {
            console.error('Error fetching connection history:', error);
            return [];
        }

        return data.status_history || [];
    } catch (error) {
        console.error('Error getting connection history:', error);
        return [];
    }
};
