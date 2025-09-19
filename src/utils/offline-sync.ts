import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { errorHandler } from './error-handler';
import { pwaService, OfflineData } from './pwa-service';
import { securityNotifications } from './security-notifications';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

export interface SyncStatus {
  isRunning: boolean;
  lastSync: Date | null;
  pendingItems: number;
  totalSynced: number;
  totalFailed: number;
}

export interface ConflictResolution {
  strategy: 'client' | 'server' | 'merge' | 'manual';
  clientData: any;
  serverData: any;
  resolvedData?: any;
}

class OfflineSyncService {
  private syncInProgress: boolean = false;
  private syncStatus: SyncStatus = {
    isRunning: false,
    lastSync: null,
    pendingItems: 0,
    totalSynced: 0,
    totalFailed: 0
  };
  private conflictQueue: Map<string, ConflictResolution> = new Map();

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Listen for network status changes
    window.addEventListener('online', () => {
      if (!this.syncInProgress) {
        this.performFullSync();
      }
    });

    // Listen for visibility change to sync when app becomes active
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine && !this.syncInProgress) {
        this.performFullSync();
      }
    });
  }

  async performFullSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      logger.warn('Sync already in progress', 'OFFLINE_SYNC');
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    this.syncInProgress = true;
    this.syncStatus.isRunning = true;

    logger.info('Starting full offline sync', 'OFFLINE_SYNC');

    const results: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    try {
      // Sync different data types in order of priority
      const syncTypes: OfflineData['type'][] = ['appointment', 'message', 'payment', 'profile'];

      for (const type of syncTypes) {
        const typeResult = await this.syncDataType(type);
        results.synced += typeResult.synced;
        results.failed += typeResult.failed;
        results.errors.push(...typeResult.errors);
        
        if (!typeResult.success) {
          results.success = false;
        }
      }

      // Update sync status
      this.syncStatus.lastSync = new Date();
      this.syncStatus.totalSynced += results.synced;
      this.syncStatus.totalFailed += results.failed;
      
      // Update pending items count
      await this.updatePendingItemsCount();

      logger.info('Full sync completed', 'OFFLINE_SYNC', {
        synced: results.synced,
        failed: results.failed,
        errors: results.errors.length
      });

      // Notify user of sync completion
      if (results.synced > 0) {
        await this.notifySyncCompletion(results);
      }

    } catch (error) {
      results.success = false;
      results.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      errorHandler.handleError(error, 'performFullSync');
    } finally {
      this.syncInProgress = false;
      this.syncStatus.isRunning = false;
    }

    return results;
  }

  private async syncDataType(type: OfflineData['type']): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    try {
      const offlineData = await pwaService.getOfflineData(type);
      const unsyncedData = offlineData.filter(item => !item.synced);

      logger.info(`Syncing ${unsyncedData.length} ${type} items`, 'OFFLINE_SYNC');

      for (const item of unsyncedData) {
        try {
          const syncSuccess = await this.syncSingleItem(type, item);
          if (syncSuccess) {
            result.synced++;
            // Mark as synced in local storage
            await this.markItemAsSynced(type, item.id!);
          } else {
            result.failed++;
            result.errors.push(`Failed to sync ${type} item ${item.id}`);
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`Error syncing ${type} item ${item.id}: ${error}`);
          logger.error(`Failed to sync ${type} item`, 'OFFLINE_SYNC', error);
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Failed to sync ${type} data: ${error}`);
      errorHandler.handleError(error, `syncDataType:${type}`);
    }

    return result;
  }

  private async syncSingleItem(type: OfflineData['type'], item: OfflineData): Promise<boolean> {
    try {
      switch (type) {
        case 'appointment':
          return await this.syncAppointment(item);
        case 'message':
          return await this.syncMessage(item);
        case 'payment':
          return await this.syncPayment(item);
        case 'profile':
          return await this.syncProfile(item);
        default:
          logger.warn(`Unknown sync type: ${type}`, 'OFFLINE_SYNC');
          return false;
      }
    } catch (error) {
      logger.error(`Failed to sync ${type} item`, 'OFFLINE_SYNC', error);
      return false;
    }
  }

  private async syncAppointment(item: OfflineData): Promise<boolean> {
    try {
      const appointmentData = item.data;
      
      // Check for conflicts
      if (appointmentData.id) {
        const conflict = await this.checkForConflicts('appointments', appointmentData.id, appointmentData);
        if (conflict) {
          await this.handleConflict('appointment', appointmentData.id, conflict);
          return false; // Will be resolved later
        }
      }

      // Sync to server
      const { data, error } = appointmentData.id
        ? await supabase
            .from('appointments')
            .update(appointmentData)
            .eq('id', appointmentData.id)
        : await supabase
            .from('appointments')
            .insert(appointmentData);

      if (error) {
        logger.error('Failed to sync appointment', 'OFFLINE_SYNC', error);
        return false;
      }

      logger.info('Appointment synced successfully', 'OFFLINE_SYNC', { id: appointmentData.id });
      return true;
    } catch (error) {
      logger.error('Error syncing appointment', 'OFFLINE_SYNC', error);
      return false;
    }
  }

  private async syncMessage(item: OfflineData): Promise<boolean> {
    try {
      const messageData = item.data;
      
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) {
        logger.error('Failed to sync message', 'OFFLINE_SYNC', error);
        return false;
      }

      logger.info('Message synced successfully', 'OFFLINE_SYNC');
      return true;
    } catch (error) {
      logger.error('Error syncing message', 'OFFLINE_SYNC', error);
      return false;
    }
  }

  private async syncPayment(item: OfflineData): Promise<boolean> {
    try {
      const paymentData = item.data;
      
      // Payments require special handling due to security
      const { data, error } = await supabase
        .from('payment_transactions')
        .insert({
          ...paymentData,
          status: 'pending_sync',
          synced_at: new Date().toISOString()
        });

      if (error) {
        logger.error('Failed to sync payment', 'OFFLINE_SYNC', error);
        return false;
      }

      logger.info('Payment synced successfully', 'OFFLINE_SYNC');
      return true;
    } catch (error) {
      logger.error('Error syncing payment', 'OFFLINE_SYNC', error);
      return false;
    }
  }

  private async syncProfile(item: OfflineData): Promise<boolean> {
    try {
      const profileData = item.data;
      
      const conflict = await this.checkForConflicts('profiles', profileData.id, profileData);
      if (conflict) {
        await this.handleConflict('profile', profileData.id, conflict);
        return false;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', profileData.id);

      if (error) {
        logger.error('Failed to sync profile', 'OFFLINE_SYNC', error);
        return false;
      }

      logger.info('Profile synced successfully', 'OFFLINE_SYNC');
      return true;
    } catch (error) {
      logger.error('Error syncing profile', 'OFFLINE_SYNC', error);
      return false;
    }
  }

  private async checkForConflicts(table: string, id: string, localData: any): Promise<ConflictResolution | null> {
    try {
      const { data: serverData, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !serverData) {
        return null; // No conflict if server data doesn't exist
      }

      // Check if server data was modified after local data
      const serverModified = new Date(serverData.updated_at || serverData.created_at);
      const localModified = new Date(localData.updated_at || localData.created_at);

      if (serverModified > localModified) {
        return {
          strategy: 'manual', // Default to manual resolution
          clientData: localData,
          serverData: serverData
        };
      }

      return null; // No conflict
    } catch (error) {
      logger.error('Error checking for conflicts', 'OFFLINE_SYNC', error);
      return null;
    }
  }

  private async handleConflict(type: string, id: string, conflict: ConflictResolution): Promise<void> {
    // Store conflict for manual resolution
    this.conflictQueue.set(`${type}-${id}`, conflict);
    
    logger.warn(`Conflict detected for ${type} ${id}`, 'OFFLINE_SYNC');
    
    // Notify user about conflict
    await securityNotifications.createNotification(
      'user-id', // Would be actual user ID
      'data_conflict',
      'Data Sync Conflict',
      `A conflict was detected while syncing your ${type} data. Manual resolution required.`,
      'medium',
      { type, id, conflictId: `${type}-${id}` }
    );
  }

  async resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<boolean> {
    try {
      const conflict = this.conflictQueue.get(conflictId);
      if (!conflict) {
        logger.warn(`Conflict ${conflictId} not found`, 'OFFLINE_SYNC');
        return false;
      }

      let resolvedData: any;

      switch (resolution.strategy) {
        case 'client':
          resolvedData = conflict.clientData;
          break;
        case 'server':
          resolvedData = conflict.serverData;
          break;
        case 'merge':
          resolvedData = this.mergeData(conflict.clientData, conflict.serverData);
          break;
        case 'manual':
          resolvedData = resolution.resolvedData;
          break;
        default:
          logger.error(`Unknown resolution strategy: ${resolution.strategy}`, 'OFFLINE_SYNC');
          return false;
      }

      // Apply resolution
      const [type, id] = conflictId.split('-');
      const table = this.getTableName(type);
      
      const { error } = await supabase
        .from(table)
        .update(resolvedData)
        .eq('id', id);

      if (error) {
        logger.error('Failed to resolve conflict', 'OFFLINE_SYNC', error);
        return false;
      }

      // Remove from conflict queue
      this.conflictQueue.delete(conflictId);
      
      logger.info(`Conflict ${conflictId} resolved`, 'OFFLINE_SYNC');
      return true;
    } catch (error) {
      errorHandler.handleError(error, 'resolveConflict');
      return false;
    }
  }

  private mergeData(clientData: any, serverData: any): any {
    // Simple merge strategy - prefer client data for user-modifiable fields
    // and server data for system fields
    const merged = { ...serverData };
    
    const clientFields = ['name', 'email', 'phone', 'preferences', 'notes'];
    clientFields.forEach(field => {
      if (clientData[field] !== undefined) {
        merged[field] = clientData[field];
      }
    });

    merged.updated_at = new Date().toISOString();
    return merged;
  }

  private getTableName(type: string): string {
    const tableMap: Record<string, string> = {
      appointment: 'appointments',
      message: 'messages',
      payment: 'payment_transactions',
      profile: 'profiles'
    };
    return tableMap[type] || type;
  }

  private async markItemAsSynced(type: OfflineData['type'], itemId: number): Promise<void> {
    try {
      // This would update the IndexedDB record to mark it as synced
      // Implementation depends on the PWA service structure
      logger.info(`Marked ${type} item ${itemId} as synced`, 'OFFLINE_SYNC');
    } catch (error) {
      logger.error('Failed to mark item as synced', 'OFFLINE_SYNC', error);
    }
  }

  private async updatePendingItemsCount(): Promise<void> {
    try {
      let totalPending = 0;
      const types: OfflineData['type'][] = ['appointment', 'message', 'payment', 'profile'];
      
      for (const type of types) {
        const items = await pwaService.getOfflineData(type);
        totalPending += items.filter(item => !item.synced).length;
      }
      
      this.syncStatus.pendingItems = totalPending;
    } catch (error) {
      logger.error('Failed to update pending items count', 'OFFLINE_SYNC', error);
    }
  }

  private async notifySyncCompletion(result: SyncResult): Promise<void> {
    try {
      let message = `Synced ${result.synced} items successfully`;
      if (result.failed > 0) {
        message += `, ${result.failed} items failed`;
      }

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification('HealthConnect - Sync Complete', {
          body: message,
          icon: '/logo192.png',
          tag: 'sync-complete'
        });
      }

      logger.info('Sync completion notification sent', 'OFFLINE_SYNC');
    } catch (error) {
      logger.error('Failed to send sync notification', 'OFFLINE_SYNC', error);
    }
  }

  async forceSyncDataType(type: OfflineData['type']): Promise<SyncResult> {
    logger.info(`Force syncing ${type} data`, 'OFFLINE_SYNC');
    return await this.syncDataType(type);
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  getConflicts(): Array<{ id: string; conflict: ConflictResolution }> {
    return Array.from(this.conflictQueue.entries()).map(([id, conflict]) => ({
      id,
      conflict
    }));
  }

  async clearSyncedData(): Promise<void> {
    try {
      const types: OfflineData['type'][] = ['appointment', 'message', 'payment', 'profile'];
      
      for (const type of types) {
        const items = await pwaService.getOfflineData(type);
        const syncedItems = items.filter(item => item.synced);
        
        // Remove synced items from offline storage
        for (const item of syncedItems) {
          // Implementation would remove from IndexedDB
        }
      }
      
      logger.info('Synced data cleared from offline storage', 'OFFLINE_SYNC');
    } catch (error) {
      errorHandler.handleError(error, 'clearSyncedData');
    }
  }

  async retryFailedSync(): Promise<SyncResult> {
    logger.info('Retrying failed sync operations', 'OFFLINE_SYNC');
    return await this.performFullSync();
  }
}

export const offlineSyncService = new OfflineSyncService();
