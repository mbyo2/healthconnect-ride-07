import React, { useState, useEffect } from 'react';
import { Download, Wifi, WifiOff, Bell, RefreshCw, Smartphone, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import { pwaService, PWACapabilities } from '../../utils/pwa-service';
import { logger } from '../../utils/logger';

interface PWAControlsProps {
  className?: string;
}

export const PWAControls: React.FC<PWAControlsProps> = ({ className }) => {
  const [capabilities, setCapabilities] = useState<PWACapabilities>({
    isInstallable: false,
    isInstalled: false,
    isOnline: true,
    hasNotificationPermission: false,
    hasPushSupport: false,
    hasBackgroundSync: false,
    hasServiceWorker: false
  });
  const [isInstalling, setIsInstalling] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [offlineDataCount, setOfflineDataCount] = useState(0);

  useEffect(() => {
    initializePWA();
    setupEventListeners();
    updateCapabilities();
    
    const interval = setInterval(updateCapabilities, 5000);
    return () => clearInterval(interval);
  }, []);

  const initializePWA = async () => {
    try {
      await pwaService.registerServiceWorker();
      logger.info('PWA initialized', 'PWA_CONTROLS');
    } catch (error) {
      logger.error('Failed to initialize PWA', 'PWA_CONTROLS', error);
    }
  };

  const setupEventListeners = () => {
    // Listen for network status changes
    const handleNetworkChange = (event: CustomEvent) => {
      updateCapabilities();
    };

    // Listen for PWA updates
    const handlePWAUpdate = (event: CustomEvent) => {
      setUpdateAvailable(event.detail.updateAvailable);
    };

    window.addEventListener('networkstatuschange', handleNetworkChange as EventListener);
    window.addEventListener('pwaupdate', handlePWAUpdate as EventListener);

    return () => {
      window.removeEventListener('networkstatuschange', handleNetworkChange as EventListener);
      window.removeEventListener('pwaupdate', handlePWAUpdate as EventListener);
    };
  };

  const updateCapabilities = async () => {
    const caps = pwaService.getCapabilities();
    setCapabilities(caps);
    setNotificationsEnabled(caps.hasNotificationPermission);
    setUpdateAvailable(pwaService.hasUpdateAvailable());

    // Count offline data
    try {
      const appointments = await pwaService.getOfflineData('appointment');
      const messages = await pwaService.getOfflineData('message');
      const payments = await pwaService.getOfflineData('payment');
      setOfflineDataCount(appointments.length + messages.length + payments.length);
    } catch (error) {
      logger.error('Failed to count offline data', 'PWA_CONTROLS', error);
    }
  };

  const handleInstallPWA = async () => {
    setIsInstalling(true);
    try {
      const success = await pwaService.installPWA();
      if (success) {
        updateCapabilities();
      }
    } catch (error) {
      logger.error('Failed to install PWA', 'PWA_CONTROLS', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    try {
      if (enabled) {
        const permission = await pwaService.requestNotificationPermission();
        setNotificationsEnabled(permission === 'granted');
        
        if (permission === 'granted') {
          await pwaService.subscribeToPushNotifications();
        }
      } else {
        setNotificationsEnabled(false);
      }
      updateCapabilities();
    } catch (error) {
      logger.error('Failed to toggle notifications', 'PWA_CONTROLS', error);
    }
  };

  const handleUpdateApp = async () => {
    try {
      await pwaService.updateServiceWorker();
      setUpdateAvailable(false);
      // Reload page after update
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      logger.error('Failed to update app', 'PWA_CONTROLS', error);
    }
  };

  const handleClearOfflineData = async () => {
    try {
      await pwaService.clearAllData();
      setOfflineDataCount(0);
      logger.info('Offline data cleared', 'PWA_CONTROLS');
    } catch (error) {
      logger.error('Failed to clear offline data', 'PWA_CONTROLS', error);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* App Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            App Status
          </CardTitle>
          <CardDescription>
            Current status of HealthConnect Progressive Web App
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Network Status</span>
              <Badge variant={capabilities.isOnline ? "default" : "destructive"}>
                {capabilities.isOnline ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Online
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </>
                )}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Installation</span>
              <Badge variant={capabilities.isInstalled ? "default" : "secondary"}>
                {capabilities.isInstalled ? "Installed" : "Browser"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Service Worker</span>
              <Badge variant={capabilities.hasServiceWorker ? "default" : "destructive"}>
                {capabilities.hasServiceWorker ? "Active" : "Inactive"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Background Sync</span>
              <Badge variant={capabilities.hasBackgroundSync ? "default" : "secondary"}>
                {capabilities.hasBackgroundSync ? "Supported" : "Not Supported"}
              </Badge>
            </div>
          </div>

          {offlineDataCount > 0 && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You have {offlineDataCount} items waiting to sync when back online.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Installation */}
      {capabilities.isInstallable && !capabilities.isInstalled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Install App
            </CardTitle>
            <CardDescription>
              Install HealthConnect as a native app for better performance and offline access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleInstallPWA}
              disabled={isInstalling}
              className="w-full"
            >
              {isInstalling ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Install HealthConnect
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Update Available */}
      {updateAvailable && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <RefreshCw className="h-5 w-5" />
              Update Available
            </CardTitle>
            <CardDescription className="text-orange-700">
              A new version of HealthConnect is available with security improvements and new features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleUpdateApp} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive important updates about appointments, security alerts, and health reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Enable Notifications</p>
              <p className="text-xs text-muted-foreground">
                Get notified about important health updates
              </p>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={handleToggleNotifications}
              disabled={!capabilities.hasPushSupport}
            />
          </div>
          
          {!capabilities.hasPushSupport && (
            <Alert className="mt-4">
              <AlertDescription>
                Push notifications are not supported in this browser.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Offline Features */}
      <Card>
        <CardHeader>
          <CardTitle>Offline Features</CardTitle>
          <CardDescription>
            Manage offline data and sync settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Cached Pages</p>
              <p className="text-muted-foreground">Essential pages available offline</p>
            </div>
            <div>
              <p className="font-medium">Auto Sync</p>
              <p className="text-muted-foreground">Data syncs when online</p>
            </div>
          </div>

          {offlineDataCount > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Offline Data</p>
                  <p className="text-xs text-muted-foreground">
                    {offlineDataCount} items pending sync
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearOfflineData}
                >
                  Clear Data
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Features
          </CardTitle>
          <CardDescription>
            Enhanced security features available in the installed app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Biometric Authentication</span>
              <Badge variant={capabilities.isInstalled ? "default" : "secondary"}>
                {capabilities.isInstalled ? "Available" : "Install Required"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Secure Storage</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Fraud Detection</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Session Security</span>
              <Badge variant="default">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAControls;
