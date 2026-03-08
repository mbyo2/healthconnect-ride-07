
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  const [staticCaps, setStaticCaps] = useState({
    hasCamera: false,
    hasMicrophone: false,
    hasGeolocation: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    hasNotificationSupport: typeof window !== 'undefined' && 'Notification' in window,
    hasVibration: typeof navigator !== 'undefined' && 'vibrate' in navigator,
    hasOrientation: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
    hasTouchscreen: false,
    hasBiometrics: null as boolean | null,
    hasMotionSensors: typeof window !== 'undefined' && 'DeviceMotionEvent' in window,
    isCapacitor: typeof window !== 'undefined' && typeof (window as any).Capacitor !== 'undefined',
  });

  const battery = useBattery();
  const network = useNetwork();

  useEffect(() => {
    const checkMediaDevices = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        const hasMicrophone = devices.some(device => device.kind === 'audioinput');
        setStaticCaps(prev => ({ ...prev, hasCamera, hasMicrophone }));
      } catch (err) {
        console.error('Error checking media devices:', err);
      }
    };

    const hasTouchscreen = (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0
    );
    setStaticCaps(prev => ({ ...prev, hasTouchscreen }));

    const checkBiometrics = async () => {
      try {
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setStaticCaps(prev => ({ ...prev, hasBiometrics: available }));
        } else {
          setStaticCaps(prev => ({ ...prev, hasBiometrics: false }));
        }
      } catch {
        setStaticCaps(prev => ({ ...prev, hasBiometrics: false }));
      }
    };

    checkMediaDevices();
    checkBiometrics();
  }, []);

  // Memoize battery object to avoid new references
  const batteryInfo = useMemo(() => ({
    level: battery.batteryLevel,
    charging: battery.isCharging,
    chargingTime: battery.chargingTime,
    dischargingTime: battery.dischargingTime,
  }), [battery.batteryLevel, battery.isCharging, battery.chargingTime, battery.dischargingTime]);

  // Memoize network object
  const networkInfo = useMemo(() => ({
    isOnline: network.isOnline,
    connectionQuality: network.connectionQuality,
  }), [network.isOnline, network.connectionQuality]);

  const requestPermission = useCallback(async (permission: 'camera' | 'microphone' | 'geolocation' | 'notifications') => {
    try {
      switch (permission) {
        case 'camera':
        case 'microphone': {
          const constraints: MediaStreamConstraints = {
            audio: permission === 'microphone',
            video: permission === 'camera',
          };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          stream.getTracks().forEach(track => track.stop());
          return true;
        }
        case 'geolocation': {
          if (!window.isSecureContext) return false;
          return new Promise<boolean>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve(true),
              () => resolve(false),
              { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
            );
          });
        }
        case 'notifications': {
          if (!('Notification' in window)) return false;
          const perm = await Notification.requestPermission();
          return perm === 'granted';
        }
        default:
          return false;
      }
    } catch {
      return false;
    }
  }, []);

  // Return a stable object using useMemo with primitive deps
  return useMemo(() => ({
    ...staticCaps,
    battery: batteryInfo,
    network: networkInfo,
    requestPermission,
  }), [staticCaps, batteryInfo, networkInfo, requestPermission]);
}
