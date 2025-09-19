import { logger } from './logger';
import { errorHandler } from './error-handler';

export interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface OfflineData {
  id?: number;
  type: 'appointment' | 'message' | 'payment' | 'profile';
  data: any;
  timestamp: number;
  synced: boolean;
}

export interface PWACapabilities {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  hasNotificationPermission: boolean;
  hasPushSupport: boolean;
  hasBackgroundSync: boolean;
  hasServiceWorker: boolean;
}

class PWAService {
  private serviceWorker: ServiceWorkerRegistration | null = null;
  private installPrompt: PWAInstallPrompt | null = null;
  private db: IDBDatabase | null = null;
  private onlineStatus: boolean = navigator.onLine;
  private updateAvailable: boolean = false;

  constructor() {
    this.initializeEventListeners();
    this.initializeIndexedDB();
  }

  private initializeEventListeners(): void {
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as any;
      logger.info('PWA install prompt available', 'PWA_SERVICE');
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      this.installPrompt = null;
      logger.info('PWA installed successfully', 'PWA_SERVICE');
    });

    // Listen for online/offline status
    window.addEventListener('online', () => {
      this.onlineStatus = true;
      this.handleOnlineStatusChange(true);
    });

    window.addEventListener('offline', () => {
      this.onlineStatus = false;
      this.handleOnlineStatusChange(false);
    });

    // Listen for visibility change (for background sync)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.onlineStatus) {
        this.triggerBackgroundSync();
      }
    });
  }

  private async initializeIndexedDB(): Promise<void> {
    try {
      const request = indexedDB.open('HealthConnectOffline', 1);
      
      request.onerror = () => {
        logger.error('Failed to open IndexedDB', 'PWA_SERVICE', request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('IndexedDB initialized', 'PWA_SERVICE');
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores for offline data
        const stores = ['appointments', 'messages', 'payments', 'profiles'];
        
        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { 
              keyPath: 'id', 
              autoIncrement: true 
            });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('synced', 'synced', { unique: false });
          }
        });

        logger.info('IndexedDB schema upgraded', 'PWA_SERVICE');
      };
    } catch (error) {
      errorHandler.handleError(error, 'initializeIndexedDB');
    }
  }

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      if (!('serviceWorker' in navigator)) {
        logger.warn('Service Worker not supported', 'PWA_SERVICE');
        return null;
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      this.serviceWorker = registration;

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true;
              logger.info('Service Worker update available', 'PWA_SERVICE');
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });

      logger.info('Service Worker registered successfully', 'PWA_SERVICE');
      return registration;
    } catch (error) {
      errorHandler.handleError(error, 'registerServiceWorker');
      return null;
    }
  }

  private handleServiceWorkerMessage(data: any): void {
    switch (data.type) {
      case 'CACHE_UPDATED':
        logger.info('Cache updated by service worker', 'PWA_SERVICE');
        break;
      case 'OFFLINE_FALLBACK':
        this.showOfflineNotification();
        break;
      case 'SYNC_COMPLETE':
        logger.info('Background sync completed', 'PWA_SERVICE', data);
        break;
    }
  }

  private handleOnlineStatusChange(isOnline: boolean): void {
    logger.info(`Network status changed: ${isOnline ? 'online' : 'offline'}`, 'PWA_SERVICE');
    
    if (isOnline) {
      this.triggerBackgroundSync();
      this.showOnlineNotification();
    } else {
      this.showOfflineNotification();
    }

    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('networkstatuschange', {
      detail: { isOnline }
    }));
  }

  async installPWA(): Promise<boolean> {
    try {
      if (!this.installPrompt) {
        logger.warn('PWA install prompt not available', 'PWA_SERVICE');
        return false;
      }

      await this.installPrompt.prompt();
      const { outcome } = await this.installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        logger.info('PWA installation accepted', 'PWA_SERVICE');
        return true;
      } else {
        logger.info('PWA installation dismissed', 'PWA_SERVICE');
        return false;
      }
    } catch (error) {
      errorHandler.handleError(error, 'installPWA');
      return false;
    }
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    try {
      if (!('Notification' in window)) {
        logger.warn('Notifications not supported', 'PWA_SERVICE');
        return 'denied';
      }

      const permission = await Notification.requestPermission();
      logger.info(`Notification permission: ${permission}`, 'PWA_SERVICE');
      return permission;
    } catch (error) {
      errorHandler.handleError(error, 'requestNotificationPermission');
      return 'denied';
    }
  }

  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    try {
      if (!this.serviceWorker) {
        logger.warn('Service Worker not available for push notifications', 'PWA_SERVICE');
        return null;
      }

      const permission = await this.requestNotificationPermission();
      if (permission !== 'granted') {
        return null;
      }

      // VAPID key would be provided by your push service
      const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY'; // Replace with actual key
      
      const subscription = await this.serviceWorker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      logger.info('Push notification subscription created', 'PWA_SERVICE');
      return subscription;
    } catch (error) {
      errorHandler.handleError(error, 'subscribeToPushNotifications');
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async storeOfflineData(type: OfflineData['type'], data: any): Promise<void> {
    try {
      if (!this.db) {
        logger.warn('IndexedDB not available', 'PWA_SERVICE');
        return;
      }

      const transaction = this.db.transaction([`${type}s`], 'readwrite');
      const store = transaction.objectStore(`${type}s`);
      
      const offlineData: OfflineData = {
        type,
        data,
        timestamp: Date.now(),
        synced: false
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.add(offlineData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      logger.info(`Offline data stored: ${type}`, 'PWA_SERVICE');
    } catch (error) {
      errorHandler.handleError(error, 'storeOfflineData');
    }
  }

  async getOfflineData(type: OfflineData['type']): Promise<OfflineData[]> {
    try {
      if (!this.db) {
        return [];
      }

      const transaction = this.db.transaction([`${type}s`], 'readonly');
      const store = transaction.objectStore(`${type}s`);
      
      return new Promise<OfflineData[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      errorHandler.handleError(error, 'getOfflineData');
      return [];
    }
  }

  async clearOfflineData(type: OfflineData['type']): Promise<void> {
    try {
      if (!this.db) {
        return;
      }

      const transaction = this.db.transaction([`${type}s`], 'readwrite');
      const store = transaction.objectStore(`${type}s`);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      logger.info(`Offline data cleared: ${type}`, 'PWA_SERVICE');
    } catch (error) {
      errorHandler.handleError(error, 'clearOfflineData');
    }
  }

  private async triggerBackgroundSync(): Promise<void> {
    try {
      if (!this.serviceWorker || !('sync' in window.ServiceWorkerRegistration.prototype)) {
        logger.warn('Background sync not supported', 'PWA_SERVICE');
        return;
      }

      // Register background sync for different data types
      const syncTags = [
        'background-sync-appointments',
        'background-sync-messages',
        'background-sync-payments'
      ];

      for (const tag of syncTags) {
        await this.serviceWorker.sync.register(tag);
      }

      logger.info('Background sync registered', 'PWA_SERVICE');
    } catch (error) {
      errorHandler.handleError(error, 'triggerBackgroundSync');
    }
  }

  async updateServiceWorker(): Promise<void> {
    try {
      if (!this.serviceWorker) {
        return;
      }

      await this.serviceWorker.update();
      
      if (this.serviceWorker.waiting) {
        // Send message to service worker to skip waiting
        this.serviceWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      logger.info('Service Worker update initiated', 'PWA_SERVICE');
    } catch (error) {
      errorHandler.handleError(error, 'updateServiceWorker');
    }
  }

  getCapabilities(): PWACapabilities {
    return {
      isInstallable: !!this.installPrompt,
      isInstalled: window.matchMedia('(display-mode: standalone)').matches,
      isOnline: this.onlineStatus,
      hasNotificationPermission: Notification.permission === 'granted',
      hasPushSupport: 'PushManager' in window,
      hasBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      hasServiceWorker: !!this.serviceWorker
    };
  }

  private showOfflineNotification(): void {
    if (Notification.permission === 'granted') {
      new Notification('HealthConnect - Offline Mode', {
        body: 'You are now offline. Some features may be limited.',
        icon: '/logo192.png',
        tag: 'offline-status'
      });
    }
  }

  private showOnlineNotification(): void {
    if (Notification.permission === 'granted') {
      new Notification('HealthConnect - Back Online', {
        body: 'Connection restored. Syncing your data...',
        icon: '/logo192.png',
        tag: 'online-status'
      });
    }
  }

  private notifyUpdateAvailable(): void {
    // Dispatch custom event for UI components
    window.dispatchEvent(new CustomEvent('pwaupdate', {
      detail: { updateAvailable: true }
    }));

    if (Notification.permission === 'granted') {
      new Notification('HealthConnect - Update Available', {
        body: 'A new version is available. Tap to update.',
        icon: '/logo192.png',
        tag: 'app-update',
        requireInteraction: true
      });
    }
  }

  async clearAllData(): Promise<void> {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // Clear IndexedDB
      if (this.db) {
        const stores = ['appointments', 'messages', 'payments', 'profiles'];
        for (const store of stores) {
          await this.clearOfflineData(store as OfflineData['type']);
        }
      }

      logger.info('All PWA data cleared', 'PWA_SERVICE');
    } catch (error) {
      errorHandler.handleError(error, 'clearAllData');
    }
  }

  isOnline(): boolean {
    return this.onlineStatus;
  }

  hasUpdateAvailable(): boolean {
    return this.updateAvailable;
  }
}

export const pwaService = new PWAService();
