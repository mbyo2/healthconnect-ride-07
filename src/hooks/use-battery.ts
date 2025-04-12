
import { useState, useEffect } from 'react';

export interface BatteryInfo {
  batteryLevel: number | null;
  isCharging: boolean | null;
  chargingTime: number | null;
  dischargingTime: number | null;
}

export const useBattery = (): BatteryInfo => {
  const [batteryState, setBatteryState] = useState<BatteryInfo>({
    batteryLevel: null,
    isCharging: null,
    chargingTime: null,
    dischargingTime: null
  });

  useEffect(() => {
    // Check if Battery API is available
    if ('getBattery' in navigator) {
      const batteryApi = (navigator as any).getBattery;
      
      const handleBatteryChange = (battery: any) => {
        // Update all battery properties
        setBatteryState({
          batteryLevel: battery.level,
          isCharging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        });
        
        // Add event listeners for battery status changes
        battery.addEventListener('levelchange', () => {
          setBatteryState(prev => ({
            ...prev,
            batteryLevel: battery.level
          }));
        });
        
        battery.addEventListener('chargingchange', () => {
          setBatteryState(prev => ({
            ...prev,
            isCharging: battery.charging
          }));
        });
        
        battery.addEventListener('chargingtimechange', () => {
          setBatteryState(prev => ({
            ...prev,
            chargingTime: battery.chargingTime
          }));
        });
        
        battery.addEventListener('dischargingtimechange', () => {
          setBatteryState(prev => ({
            ...prev,
            dischargingTime: battery.dischargingTime
          }));
        });
      };
      
      // Get initial battery status
      batteryApi.call(navigator)
        .then((battery: any) => {
          handleBatteryChange(battery);
        })
        .catch((error: Error) => {
          console.error('Battery API error:', error);
        });
    } else if ('battery' in navigator) {
      // iOS-specific battery info (limited)
      const battery = (navigator as any).battery;
      setBatteryState({
        batteryLevel: battery?.level || null,
        isCharging: battery?.charging || null,
        chargingTime: battery?.chargingTime || null,
        dischargingTime: battery?.dischargingTime || null
      });
    } else {
      // No battery API available
      console.log('Battery API not supported');
    }
  }, []);

  return batteryState;
};
