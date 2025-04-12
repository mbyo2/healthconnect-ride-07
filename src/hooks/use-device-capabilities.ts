
import { useState, useEffect } from 'react';
import { useBattery } from './use-battery';
import { useNetwork } from './use-network';

interface DeviceCapabilities {
  hasCamera: boolean;
  hasMicrophone: boolean;
  hasGeolocation: boolean;
  hasNotificationSupport: boolean;
  hasVibration: boolean;
  hasOrientation: boolean;
  hasTouchscreen: boolean;
  hasBiometrics: boolean | null;
  hasMotionSensors: boolean;
  battery: {
    level: number | null;
    charging: boolean | null;
    chargingTime: number | null;
    dischargingTime: number | null;
  };
  network: {
    isOnline: boolean;
    connectionQuality: 'poor' | 'average' | 'good' | 'excellent' | 'unknown';
  };
  isCapacitor: boolean;
}

export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    hasCamera: false,
    hasMicrophone: false,
    hasGeolocation: 'geolocation' in navigator,
    hasNotificationSupport: 'Notification' in window,
    hasVibration: 'vibrate' in navigator,
    hasOrientation: 'DeviceOrientationEvent' in window,
    hasTouchscreen: false,
    hasBiometrics: null,
    hasMotionSensors: 'DeviceMotionEvent' in window,
    battery: {
      level: null,
      charging: null,
      chargingTime: null,
      dischargingTime: null,
    },
    network: {
      isOnline: navigator.onLine,
      connectionQuality: 'unknown',
    },
    isCapacitor: typeof (window as any).Capacitor !== 'undefined',
  });

  const battery = useBattery();
  const network = useNetwork();

  useEffect(() => {
    const checkMediaDevices = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          return;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        const hasMicrophone = devices.some(device => device.kind === 'audioinput');

        setCapabilities(prev => ({
          ...prev,
          hasCamera,
          hasMicrophone,
        }));
      } catch (err) {
        console.error('Error checking media devices:', err);
      }
    };

    const checkTouchscreen = () => {
      const hasTouchscreen = (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      );
      
      setCapabilities(prev => ({
        ...prev,
        hasTouchscreen,
      }));
    };

    const checkBiometrics = async () => {
      try {
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setCapabilities(prev => ({
            ...prev,
            hasBiometrics: available,
          }));
        } else {
          setCapabilities(prev => ({
            ...prev,
            hasBiometrics: false,
          }));
        }
      } catch (err) {
        console.error('Error checking biometrics:', err);
        setCapabilities(prev => ({
          ...prev,
          hasBiometrics: false,
        }));
      }
    };

    checkMediaDevices();
    checkTouchscreen();
    checkBiometrics();
  }, []);

  // Update battery status when it changes
  useEffect(() => {
    setCapabilities(prev => ({
      ...prev,
      battery: {
        level: battery.batteryLevel,
        charging: battery.isCharging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
      },
    }));
  }, [battery]);

  // Update network status when it changes
  useEffect(() => {
    setCapabilities(prev => ({
      ...prev,
      network: {
        isOnline: network.isOnline,
        connectionQuality: network.connectionQuality,
      },
    }));
  }, [network]);

  const requestPermission = async (permission: 'camera' | 'microphone' | 'geolocation' | 'notifications') => {
    try {
      switch (permission) {
        case 'camera':
        case 'microphone': {
          const constraints: MediaStreamConstraints = {
            audio: permission === 'microphone',
            video: permission === 'camera',
          };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          stream.getTracks().forEach(track => track.stop()); // Clean up
          return true;
        }
        case 'geolocation': {
          return new Promise<boolean>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve(true),
              () => resolve(false)
            );
          });
        }
        case 'notifications': {
          if (!('Notification' in window)) return false;
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        }
        default:
          return false;
      }
    } catch (err) {
      console.error(`Error requesting ${permission} permission:`, err);
      return false;
    }
  };

  return {
    ...capabilities,
    requestPermission,
  };
}
