import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { errorHandler } from './error-handler';
import { logger } from './logger';
import { securityNotificationService } from './security-notifications';
import { sessionManager } from './session-manager';

export interface DeviceSecurityInfo {
  deviceId: string;
  platform: string;
  model: string;
  operatingSystem: string;
  osVersion: string;
  manufacturer: string;
  isVirtual: boolean;
  webViewVersion: string;
  batteryLevel?: number;
  isCharging?: boolean;
  networkType: string;
  isRooted?: boolean;
  hasScreenLock?: boolean;
  biometricSupport: BiometricCapability[];
}

export interface BiometricCapability {
  type: 'fingerprint' | 'face' | 'voice' | 'iris';
  available: boolean;
  enrolled: boolean;
}

export interface LocationSecurity {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  isHighAccuracy: boolean;
  isMocked?: boolean;
}

export interface AppSecurityState {
  isInBackground: boolean;
  lastActiveTime: Date;
  screenLockEnabled: boolean;
  autoLockTimeout: number;
  jailbreakDetected: boolean;
  debuggerAttached: boolean;
}

class MobileSecurityService {
  private securityState: AppSecurityState = {
    isInBackground: false,
    lastActiveTime: new Date(),
    screenLockEnabled: false,
    autoLockTimeout: 300000, // 5 minutes
    jailbreakDetected: false,
    debuggerAttached: false
  };

  private backgroundTimer: NodeJS.Timeout | null = null;
  private locationWatcher: string | null = null;

  constructor() {
    if (Capacitor.isNativePlatform()) {
      this.initializeMobileSecurity();
    }
  }

  private async initializeMobileSecurity(): Promise<void> {
    try {
      // Set up app state monitoring
      await this.setupAppStateMonitoring();
      
      // Initialize device security checks
      await this.performInitialSecurityChecks();
      
      // Set up location monitoring
      await this.setupLocationMonitoring();
      
      // Configure security notifications
      await this.setupSecurityNotifications();

      logger.info('Mobile security initialized', 'MOBILE_SECURITY');
    } catch (error) {
      errorHandler.handleError(error, 'initializeMobileSecurity');
    }
  }

  async getDeviceSecurityInfo(): Promise<DeviceSecurityInfo> {
    try {
      const deviceInfo = await Device.getInfo();
      const batteryInfo = await Device.getBatteryInfo();
      const networkStatus = await Network.getStatus();

      // Check for root/jailbreak
      const isRooted = await this.detectRootJailbreak();
      
      // Check biometric capabilities
      const biometricSupport = await this.getBiometricCapabilities();

      return {
        deviceId: deviceInfo.identifier,
        platform: deviceInfo.platform,
        model: deviceInfo.model,
        operatingSystem: deviceInfo.operatingSystem,
        osVersion: deviceInfo.osVersion,
        manufacturer: deviceInfo.manufacturer,
        isVirtual: deviceInfo.isVirtual,
        webViewVersion: deviceInfo.webViewVersion,
        batteryLevel: batteryInfo.batteryLevel,
        isCharging: batteryInfo.isCharging,
        networkType: networkStatus.connectionType,
        isRooted,
        biometricSupport
      };
    } catch (error) {
      errorHandler.handleError(error, 'getDeviceSecurityInfo');
      throw error;
    }
  }

  private async detectRootJailbreak(): Promise<boolean> {
    try {
      // Basic root/jailbreak detection
      // In production, use more sophisticated detection methods
      
      if (Capacitor.getPlatform() === 'ios') {
        // iOS jailbreak detection indicators
        const jailbreakPaths = [
          '/Applications/Cydia.app',
          '/usr/sbin/sshd',
          '/bin/bash',
          '/private/var/lib/apt'
        ];
        
        // This would require native iOS code to properly check
        return false; // Placeholder
      } else if (Capacitor.getPlatform() === 'android') {
        // Android root detection indicators
        const rootPaths = [
          '/system/app/Superuser.apk',
          '/system/xbin/su',
          '/system/bin/su',
          '/data/local/xbin/su'
        ];
        
        // This would require native Android code to properly check
        return false; // Placeholder
      }
      
      return false;
    } catch (error) {
      logger.error('Error detecting root/jailbreak', 'MOBILE_SECURITY', error);
      return false;
    }
  }

  private async getBiometricCapabilities(): Promise<BiometricCapability[]> {
    try {
      const capabilities: BiometricCapability[] = [];
      
      // Check if biometric authentication is available
      if ('credentials' in navigator && 'create' in navigator.credentials) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        
        capabilities.push({
          type: 'fingerprint',
          available,
          enrolled: available // Simplified check
        });
      }

      return capabilities;
    } catch (error) {
      logger.error('Error getting biometric capabilities', 'MOBILE_SECURITY', error);
      return [];
    }
  }

  private async setupAppStateMonitoring(): Promise<void> {
    try {
      // Monitor app state changes
      App.addListener('appStateChange', (state) => {
        this.handleAppStateChange(state.isActive);
      });

      // Monitor app URL opens (deep links)
      App.addListener('appUrlOpen', (event) => {
        this.handleDeepLink(event.url);
      });

      // Monitor app restoration
      App.addListener('appRestoredResult', (result) => {
        logger.info('App restored', 'MOBILE_SECURITY', { success: result.success });
      });

    } catch (error) {
      errorHandler.handleError(error, 'setupAppStateMonitoring');
    }
  }

  private handleAppStateChange(isActive: boolean): void {
    this.securityState.isInBackground = !isActive;
    
    if (isActive) {
      this.securityState.lastActiveTime = new Date();
      this.clearBackgroundTimer();
      logger.info('App became active', 'MOBILE_SECURITY');
    } else {
      this.startBackgroundTimer();
      logger.info('App went to background', 'MOBILE_SECURITY');
    }
  }

  private startBackgroundTimer(): void {
    this.backgroundTimer = setTimeout(() => {
      this.handleAutoLock();
    }, this.securityState.autoLockTimeout);
  }

  private clearBackgroundTimer(): void {
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
    }
  }

  private async handleAutoLock(): Promise<void> {
    try {
      // Clear sensitive data from memory
      await this.clearSensitiveData();
      
      // Invalidate current session
      const sessionId = localStorage.getItem('current-session-id');
      if (sessionId) {
        await sessionManager.invalidateSession(sessionId);
      }
      
      // Show security notification
      await this.showSecurityNotification(
        'Auto-lock Activated',
        'App was locked due to inactivity for security purposes.'
      );

      logger.info('Auto-lock activated', 'MOBILE_SECURITY');
    } catch (error) {
      errorHandler.handleError(error, 'handleAutoLock');
    }
  }

  private async clearSensitiveData(): Promise<void> {
    try {
      // Clear sensitive data from localStorage/sessionStorage
      const sensitiveKeys = [
        'auth-token',
        'user-data',
        'payment-info',
        'medical-records'
      ];

      sensitiveKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      logger.info('Sensitive data cleared', 'MOBILE_SECURITY');
    } catch (error) {
      errorHandler.handleError(error, 'clearSensitiveData');
    }
  }

  private async handleDeepLink(url: string): Promise<void> {
    try {
      logger.info('Deep link opened', 'MOBILE_SECURITY', { url });
      
      // Validate deep link for security
      const isValidLink = await this.validateDeepLink(url);
      
      if (!isValidLink) {
        await securityNotificationService.createSecurityNotification(
          'current-user-id', // Would get from auth context
          'suspicious_activity',
          'Suspicious Deep Link',
          `A suspicious deep link was detected: ${url}`,
          'medium',
          true
        );
      }
    } catch (error) {
      errorHandler.handleError(error, 'handleDeepLink');
    }
  }

  private async validateDeepLink(url: string): Promise<boolean> {
    try {
      const allowedDomains = [
        'healthconnect.app',
        'healthconnect.com',
        'localhost'
      ];
      
      const urlObj = new URL(url);
      return allowedDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }

  private async setupLocationMonitoring(): Promise<void> {
    try {
      // Request location permissions
      const permissions = await Geolocation.requestPermissions();
      
      if (permissions.location === 'granted') {
        // Start watching location for security monitoring
        this.locationWatcher = await Geolocation.watchPosition({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }, (position) => {
          this.handleLocationUpdate(position);
        });
      }
    } catch (error) {
      logger.error('Error setting up location monitoring', 'MOBILE_SECURITY', error);
    }
  }

  private async handleLocationUpdate(position: GeolocationPosition): Promise<void> {
    try {
      const locationSecurity: LocationSecurity = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
        isHighAccuracy: position.coords.accuracy < 100,
        isMocked: await this.detectMockedLocation(position)
      };

      // Check for location anomalies
      await this.analyzeLocationSecurity(locationSecurity);
      
    } catch (error) {
      errorHandler.handleError(error, 'handleLocationUpdate');
    }
  }

  private async detectMockedLocation(position: GeolocationPosition): Promise<boolean> {
    try {
      // Basic mock location detection
      // In production, implement more sophisticated detection
      
      // Check for suspiciously high accuracy
      if (position.coords.accuracy < 1) {
        return true;
      }
      
      // Check for impossible speed between locations
      // This would require storing previous locations
      
      return false;
    } catch {
      return false;
    }
  }

  private async analyzeLocationSecurity(location: LocationSecurity): Promise<void> {
    try {
      if (location.isMocked) {
        await securityNotificationService.createSecurityNotification(
          'current-user-id', // Would get from auth context
          'suspicious_activity',
          'Mock Location Detected',
          'Location spoofing or mock location detected. This may indicate a security risk.',
          'high',
          true
        );
      }

      // Store location for fraud detection analysis
      logger.info('Location updated', 'MOBILE_SECURITY', {
        accuracy: location.accuracy,
        isMocked: location.isMocked
      });
    } catch (error) {
      errorHandler.handleError(error, 'analyzeLocationSecurity');
    }
  }

  private async setupSecurityNotifications(): Promise<void> {
    try {
      // Request notification permissions
      const permissions = await LocalNotifications.requestPermissions();
      
      if (permissions.display === 'granted') {
        logger.info('Notification permissions granted', 'MOBILE_SECURITY');
      }
    } catch (error) {
      logger.error('Error setting up notifications', 'MOBILE_SECURITY', error);
    }
  }

  private async showSecurityNotification(title: string, body: string): Promise<void> {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 1000) },
          sound: 'default',
          attachments: [],
          actionTypeId: 'security',
          extra: {
            type: 'security'
          }
        }]
      });
    } catch (error) {
      logger.error('Error showing security notification', 'MOBILE_SECURITY', error);
    }
  }

  async performSecurityScan(): Promise<{
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const issues: string[] = [];
      const recommendations: string[] = [];
      let score = 100;

      // Get device info
      const deviceInfo = await this.getDeviceSecurityInfo();

      // Check for root/jailbreak
      if (deviceInfo.isRooted) {
        issues.push('Device is rooted/jailbroken');
        recommendations.push('Use a non-rooted device for better security');
        score -= 30;
      }

      // Check OS version
      const osVersion = parseFloat(deviceInfo.osVersion);
      if (deviceInfo.platform === 'ios' && osVersion < 15.0) {
        issues.push('iOS version is outdated');
        recommendations.push('Update to the latest iOS version');
        score -= 15;
      } else if (deviceInfo.platform === 'android' && osVersion < 11.0) {
        issues.push('Android version is outdated');
        recommendations.push('Update to the latest Android version');
        score -= 15;
      }

      // Check biometric enrollment
      const hasBiometrics = deviceInfo.biometricSupport.some(b => b.enrolled);
      if (!hasBiometrics) {
        issues.push('No biometric authentication enrolled');
        recommendations.push('Enable fingerprint or face recognition');
        score -= 10;
      }

      // Check network security
      if (deviceInfo.networkType === 'wifi') {
        // In production, check for secure WiFi connections
        // This would require additional network analysis
      }

      // Check app integrity
      if (this.securityState.debuggerAttached) {
        issues.push('Debugger detected');
        recommendations.push('Remove debugging tools');
        score -= 25;
      }

      logger.info('Security scan completed', 'MOBILE_SECURITY', { 
        score, 
        issueCount: issues.length 
      });

      return { score, issues, recommendations };
    } catch (error) {
      errorHandler.handleError(error, 'performSecurityScan');
      return {
        score: 50,
        issues: ['Error during security scan'],
        recommendations: ['Retry security scan']
      };
    }
  }

  async enableSecureMode(): Promise<void> {
    try {
      // Enable additional security measures
      this.securityState.autoLockTimeout = 60000; // 1 minute
      
      // Clear clipboard periodically
      this.startClipboardCleaning();
      
      // Enable screenshot prevention (would require native implementation)
      await this.preventScreenshots();
      
      logger.info('Secure mode enabled', 'MOBILE_SECURITY');
    } catch (error) {
      errorHandler.handleError(error, 'enableSecureMode');
    }
  }

  private startClipboardCleaning(): void {
    setInterval(() => {
      try {
        // Clear clipboard if it contains sensitive data
        // This would require native implementation for full functionality
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('');
        }
      } catch (error) {
        // Clipboard access may be restricted
      }
    }, 30000); // Every 30 seconds
  }

  private async preventScreenshots(): Promise<void> {
    try {
      // This would require native implementation to truly prevent screenshots
      // For web, we can only detect and warn
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // App is being backgrounded, potential screenshot
          logger.info('App backgrounded - potential screenshot', 'MOBILE_SECURITY');
        }
      });
    } catch (error) {
      logger.error('Error setting up screenshot prevention', 'MOBILE_SECURITY', error);
    }
  }

  destroy(): void {
    this.clearBackgroundTimer();
    
    if (this.locationWatcher) {
      Geolocation.clearWatch({ id: this.locationWatcher });
    }
  }
}

export const mobileSecurityService = new MobileSecurityService();
