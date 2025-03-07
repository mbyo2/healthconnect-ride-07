
import { useState, useEffect } from 'react';

interface BatteryInfo {
  batteryLevel: number;
  isCharging: boolean;
  chargingTime: number | null;
  dischargingTime: number | null;
}

export function useBattery() {
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo>({
    batteryLevel: 1,
    isCharging: true,
    chargingTime: null,
    dischargingTime: null,
  });

  useEffect(() => {
    // Check if the Battery API is supported
    if (!('getBattery' in navigator)) {
      console.log('Battery API not supported');
      return;
    }

    const handleBatteryChange = (battery: any) => {
      // Update all battery information at once
      updateBatteryInfo(battery);

      // Add event listeners for changes
      battery.addEventListener('levelchange', () => updateBatteryInfo(battery));
      battery.addEventListener('chargingchange', () => updateBatteryInfo(battery));
      battery.addEventListener('chargingtimechange', () => updateBatteryInfo(battery));
      battery.addEventListener('dischargingtimechange', () => updateBatteryInfo(battery));
    };

    const updateBatteryInfo = (battery: any) => {
      setBatteryInfo({
        batteryLevel: battery.level,
        isCharging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
      });
    };

    // Access the battery information
    (navigator as any).getBattery().then(handleBatteryChange);

    // No cleanup needed for this hook
  }, []);

  return batteryInfo;
}
