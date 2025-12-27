import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SettingStatus = 'active' | 'inactive' | 'pending' | 'archived';

interface SettingChange {
    setting_key: string;
    old_value: any;
    new_value: any;
    status: SettingStatus;
    timestamp: string;
    updatedBy?: string;
    reason?: string;
}

interface SettingTransitionResult {
    success: boolean;
    message: string;
    newStatus?: SettingStatus;
    error?: string;
}

/**
 * Validates if a setting status transition is allowed
 */
export const isValidSettingTransition = (
    currentStatus: SettingStatus,
    newStatus: SettingStatus
): boolean => {
    const validTransitions: Record<SettingStatus, SettingStatus[]> = {
        pending: ['active', 'inactive'],
        active: ['inactive', 'archived'],
        inactive: ['active', 'archived'],
        archived: [], // Final state
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
};

/**
 * Update a setting with status tracking
 */
export const updateSettingStatus = async (
    settingKey: string,
    newStatus: SettingStatus,
    userId: string,
    reason?: string
): Promise<SettingTransitionResult> => {
    try {
        // Get current setting
        const { data: setting, error: fetchError } = await supabase
            .from('user_settings')
            .select('status, change_history')
            .eq('setting_key', settingKey)
            .eq('user_id', userId)
            .single();

        if (fetchError || !setting) {
            return {
                success: false,
                message: 'Setting not found',
                error: fetchError?.message,
            };
        }

        // Validate transition
        if (!isValidSettingTransition(setting.status, newStatus)) {
            return {
                success: false,
                message: `Cannot transition from ${setting.status} to ${newStatus}`,
            };
        }

        // Update with history
        const changeHistory: SettingChange[] = setting.change_history || [];
        changeHistory.push({
            setting_key: settingKey,
            old_value: setting.status,
            new_value: newStatus,
            status: newStatus,
            timestamp: new Date().toISOString(),
            updatedBy: userId,
            reason,
        });

        const { error: updateError } = await supabase
            .from('user_settings')
            .update({
                status: newStatus,
                change_history: changeHistory,
                updated_at: new Date().toISOString(),
            })
            .eq('setting_key', settingKey)
            .eq('user_id', userId);

        if (updateError) {
            return {
                success: false,
                message: 'Failed to update setting status',
                error: updateError.message,
            };
        }

        toast.success(`Setting ${settingKey} updated to ${newStatus}`);

        return {
            success: true,
            message: 'Setting updated successfully',
            newStatus,
        };
    } catch (error) {
        console.error('Error updating setting status:', error);
        return {
            success: false,
            message: 'An error occurred while updating setting',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

/**
 * Apply a setting change with validation
 */
export const applySettingChange = async (
    settingKey: string,
    value: any,
    userId: string,
    validateFn?: (value: any) => boolean
): Promise<SettingTransitionResult> => {
    try {
        // Optional validation
        if (validateFn && !validateFn(value)) {
            return {
                success: false,
                message: 'Setting value failed validation',
            };
        }

        // Get current setting
        const { data: setting, error: fetchError } = await supabase
            .from('user_settings')
            .select('value, change_history')
            .eq('setting_key', settingKey)
            .eq('user_id', userId)
            .single();

        const changeHistory: SettingChange[] = setting?.change_history || [];
        changeHistory.push({
            setting_key: settingKey,
            old_value: setting?.value,
            new_value: value,
            status: 'active',
            timestamp: new Date().toISOString(),
            updatedBy: userId,
        });

        // Upsert setting
        const { error: upsertError } = await supabase
            .from('user_settings')
            .upsert({
                user_id: userId,
                setting_key: settingKey,
                value,
                status: 'active',
                change_history: changeHistory,
                updated_at: new Date().toISOString(),
            });

        if (upsertError) {
            return {
                success: false,
                message: 'Failed to apply setting change',
                error: upsertError.message,
            };
        }

        toast.success('Setting updated successfully');

        return {
            success: true,
            message: 'Setting applied successfully',
            newStatus: 'active',
        };
    } catch (error) {
        console.error('Error applying setting change:', error);
        return {
            success: false,
            message: 'An error occurred while applying setting',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

/**
 * Get setting change history
 */
export const getSettingHistory = async (
    settingKey: string,
    userId: string
): Promise<SettingChange[]> => {
    try {
        const { data, error } = await supabase
            .from('user_settings')
            .select('change_history')
            .eq('setting_key', settingKey)
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            console.error('Error fetching setting history:', error);
            return [];
        }

        return data.change_history || [];
    } catch (error) {
        console.error('Error getting setting history:', error);
        return [];
    }
};

/**
 * Archive a setting
 */
export const archiveSetting = async (
    settingKey: string,
    userId: string,
    reason?: string
): Promise<SettingTransitionResult> => {
    return await updateSettingStatus(settingKey, 'archived', userId, reason);
};
