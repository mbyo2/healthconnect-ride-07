
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
    // Initialize status bar
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.setBackgroundColor({ color: '#ffffff' });
    
    // Hide splash screen with fade
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({
      fadeOutDuration: 500
    });

  } catch (error) {
    console.error('Error initializing mobile features:', error);
  }
};
