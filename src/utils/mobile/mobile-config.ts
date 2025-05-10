
/**
 * Utility functions for mobile app specific configurations
 */

import { Capacitor } from '@capacitor/core';

// Check if the app is running in a native mobile environment
export const isNativeMobile = () => {
  return Capacitor.isNativePlatform();
};

// Check the platform (iOS, Android, or web)
export const getPlatform = () => {
  return Capacitor.getPlatform();
};

// Get device info
export const getDeviceInfo = async () => {
  if (isNativeMobile()) {
    const { Device } = await import('@capacitor/device');
    return Device.getInfo();
  }
  return null;
};

// Check if running on iOS
export const isIOS = () => {
  return Capacitor.getPlatform() === 'ios';
};

// Check if running on Android
export const isAndroid = () => {
  return Capacitor.getPlatform() === 'android';
};

// Initialize mobile-specific features
export const initializeMobileFeatures = async () => {
  if (!isNativeMobile()) return;
  
  try {
    // Initialize splash screen with fade
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({
      fadeOutDuration: 500
    });

    // Conditionally initialize status bar if the dependency exists
    try {
      if (window.StatusBar || (window as any).cordova?.plugins?.statusbar) {
        // Set background color using native StatusBar if available
        const StatusBar = window.StatusBar || (window as any).cordova?.plugins?.statusbar;
        if (StatusBar) {
          StatusBar.backgroundColorByHexString('#ffffff');
          StatusBar.styleDefault();
        }
      } else {
        // Try to use Capacitor Status Bar if available
        const statusBarModule = await import('@capacitor/status-bar').catch(() => null);
        if (statusBarModule) {
          const { StatusBar } = statusBarModule;
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
          await StatusBar.setStyle({ style: 'dark' });
        }
      }
    } catch (statusBarError) {
      console.warn('Status bar plugin not available:', statusBarError);
    }
  } catch (error) {
    console.error('Error initializing mobile features:', error);
  }
};

// Add global typings for StatusBar for Cordova compatibility
declare global {
  interface Window {
    StatusBar?: {
      backgroundColorByHexString: (color: string) => void;
      styleDefault: () => void;
      styleLightContent: () => void;
    };
  }
}
