import { logger } from './logger';
import { errorHandler } from './error-handler';

export interface DeviceCapability {
  name: string;
  supported: boolean;
  error?: string;
}

export interface ConnectivityTestResult {
  overall: 'success' | 'partial' | 'failed';
  capabilities: DeviceCapability[];
  errors: string[];
  recommendations: string[];
}

class DeviceConnectivityTest {
  async runComprehensiveTest(): Promise<ConnectivityTestResult> {
    const capabilities: DeviceCapability[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];

    try {
      // Test Web Bluetooth API
      const bluetoothResult = await this.testBluetoothAPI();
      capabilities.push(bluetoothResult);
      if (!bluetoothResult.supported) {
        errors.push('Bluetooth connectivity not available');
        recommendations.push('Enable Bluetooth in browser settings or use a Bluetooth-enabled device');
      }

      // Test Geolocation API (for location-based device features)
      const locationResult = await this.testGeolocationAPI();
      capabilities.push(locationResult);
      if (!locationResult.supported) {
        recommendations.push('Enable location services for enhanced device features');
      }

      // Test Device Motion/Orientation APIs
      const motionResult = await this.testDeviceMotionAPI();
      capabilities.push(motionResult);

      // Test Web USB API
      const usbResult = await this.testWebUSBAPI();
      capabilities.push(usbResult);

      // Test Network Connectivity
      const networkResult = await this.testNetworkConnectivity();
      capabilities.push(networkResult);
      if (!networkResult.supported) {
        errors.push('Network connectivity issues detected');
        recommendations.push('Check internet connection and try again');
      }

      // Test Permissions
      const permissionsResult = await this.testPermissions();
      capabilities.push(permissionsResult);

      // Test Capacitor Native Features (if available)
      const capacitorResult = await this.testCapacitorFeatures();
      capabilities.push(capacitorResult);

      // Determine overall status
      const supportedCount = capabilities.filter(c => c.supported).length;
      const totalCount = capabilities.length;
      
      let overall: 'success' | 'partial' | 'failed';
      if (supportedCount === totalCount) {
        overall = 'success';
      } else if (supportedCount > totalCount / 2) {
        overall = 'partial';
      } else {
        overall = 'failed';
      }

      const result: ConnectivityTestResult = {
        overall,
        capabilities,
        errors,
        recommendations
      };

      logger.info('Device connectivity test completed', 'CONNECTIVITY_TEST', result);
      return result;

    } catch (error) {
      logger.error('Device connectivity test failed', 'CONNECTIVITY_TEST', error);
      return {
        overall: 'failed',
        capabilities,
        errors: ['Connectivity test failed to complete'],
        recommendations: ['Refresh the page and try again']
      };
    }
  }

  private async testBluetoothAPI(): Promise<DeviceCapability> {
    try {
      if (!navigator.bluetooth) {
        return {
          name: 'Web Bluetooth API',
          supported: false,
          error: 'Web Bluetooth API not supported in this browser'
        };
      }

      // Test if we can request device (this will show permission dialog)
      const available = await navigator.bluetooth.getAvailability();
      
      return {
        name: 'Web Bluetooth API',
        supported: available,
        error: available ? undefined : 'Bluetooth adapter not available'
      };
    } catch (error) {
      return {
        name: 'Web Bluetooth API',
        supported: false,
        error: `Bluetooth test failed: ${error.message}`
      };
    }
  }

  private async testGeolocationAPI(): Promise<DeviceCapability> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          name: 'Geolocation API',
          supported: false,
          error: 'Geolocation API not supported'
        });
        return;
      }

      const timeoutId = setTimeout(() => {
        resolve({
          name: 'Geolocation API',
          supported: false,
          error: 'Geolocation request timed out'
        });
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        () => {
          clearTimeout(timeoutId);
          resolve({
            name: 'Geolocation API',
            supported: true
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          resolve({
            name: 'Geolocation API',
            supported: false,
            error: `Geolocation error: ${error.message}`
          });
        },
        { timeout: 5000 }
      );
    });
  }

  private async testDeviceMotionAPI(): Promise<DeviceCapability> {
    try {
      if (!window.DeviceMotionEvent) {
        return {
          name: 'Device Motion API',
          supported: false,
          error: 'Device Motion API not supported'
        };
      }

      // For iOS 13+, we need to request permission
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        return {
          name: 'Device Motion API',
          supported: permission === 'granted',
          error: permission !== 'granted' ? 'Device motion permission denied' : undefined
        };
      }

      return {
        name: 'Device Motion API',
        supported: true
      };
    } catch (error) {
      return {
        name: 'Device Motion API',
        supported: false,
        error: `Device motion test failed: ${error.message}`
      };
    }
  }

  private async testWebUSBAPI(): Promise<DeviceCapability> {
    try {
      if (!navigator.usb) {
        return {
          name: 'Web USB API',
          supported: false,
          error: 'Web USB API not supported'
        };
      }

      // Just check if the API exists, don't actually request devices
      return {
        name: 'Web USB API',
        supported: true
      };
    } catch (error) {
      return {
        name: 'Web USB API',
        supported: false,
        error: `USB test failed: ${error.message}`
      };
    }
  }

  private async testNetworkConnectivity(): Promise<DeviceCapability> {
    try {
      // Test basic network connectivity
      const online = navigator.onLine;
      
      if (!online) {
        return {
          name: 'Network Connectivity',
          supported: false,
          error: 'Device is offline'
        };
      }

      // Test actual network request
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
      });

      return {
        name: 'Network Connectivity',
        supported: response.ok,
        error: response.ok ? undefined : `Network test failed with status: ${response.status}`
      };
    } catch (error) {
      return {
        name: 'Network Connectivity',
        supported: false,
        error: `Network connectivity test failed: ${error.message}`
      };
    }
  }

  private async testPermissions(): Promise<DeviceCapability> {
    try {
      if (!navigator.permissions) {
        return {
          name: 'Permissions API',
          supported: false,
          error: 'Permissions API not supported'
        };
      }

      // Test common permissions
      const permissions = ['camera', 'microphone', 'geolocation'];
      const results = await Promise.allSettled(
        permissions.map(name => navigator.permissions.query({ name } as any))
      );

      const grantedCount = results.filter(result => 
        result.status === 'fulfilled' && result.value.state === 'granted'
      ).length;

      return {
        name: 'Permissions API',
        supported: true,
        error: grantedCount === 0 ? 'No permissions granted' : undefined
      };
    } catch (error) {
      return {
        name: 'Permissions API',
        supported: false,
        error: `Permissions test failed: ${error.message}`
      };
    }
  }

  private async testCapacitorFeatures(): Promise<DeviceCapability> {
    try {
      // Check if Capacitor is available
      if (typeof window !== 'undefined' && (window as any).Capacitor) {
        const { Capacitor } = (window as any);
        
        return {
          name: 'Capacitor Native Features',
          supported: true,
          error: undefined
        };
      }

      return {
        name: 'Capacitor Native Features',
        supported: false,
        error: 'Running in web mode - native features not available'
      };
    } catch (error) {
      return {
        name: 'Capacitor Native Features',
        supported: false,
        error: `Capacitor test failed: ${error.message}`
      };
    }
  }

  async testSpecificDevice(deviceType: string): Promise<boolean> {
    try {
      switch (deviceType) {
        case 'heart_rate_monitor':
          return await this.testHeartRateMonitor();
        case 'blood_pressure_monitor':
          return await this.testBloodPressureMonitor();
        case 'glucose_monitor':
          return await this.testGlucoseMonitor();
        case 'temperature_sensor':
          return await this.testTemperatureSensor();
        case 'pulse_oximeter':
          return await this.testPulseOximeter();
        default:
          return false;
      }
    } catch (error) {
      logger.error(`Device test failed for ${deviceType}`, 'CONNECTIVITY_TEST', error);
      return false;
    }
  }

  private async testHeartRateMonitor(): Promise<boolean> {
    try {
      if (!navigator.bluetooth) return false;

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service']
      });

      return !!device;
    } catch (error) {
      return false;
    }
  }

  private async testBloodPressureMonitor(): Promise<boolean> {
    try {
      if (!navigator.bluetooth) return false;

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['blood_pressure'] }]
      });

      return !!device;
    } catch (error) {
      return false;
    }
  }

  private async testGlucoseMonitor(): Promise<boolean> {
    try {
      if (!navigator.bluetooth) return false;

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['glucose'] }]
      });

      return !!device;
    } catch (error) {
      return false;
    }
  }

  private async testTemperatureSensor(): Promise<boolean> {
    try {
      if (!navigator.bluetooth) return false;

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['health_thermometer'] }]
      });

      return !!device;
    } catch (error) {
      return false;
    }
  }

  private async testPulseOximeter(): Promise<boolean> {
    try {
      if (!navigator.bluetooth) return false;

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['pulse_oximeter'] }]
      });

      return !!device;
    } catch (error) {
      return false;
    }
  }
}

export const deviceConnectivityTest = new DeviceConnectivityTest();
