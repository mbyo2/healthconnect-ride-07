import { logger } from './logger';
import { errorHandler } from './error-handler';
import { deviceConnectivityTest } from './device-connectivity-test';

export interface DeviceConnectionConfig {
  deviceId: string;
  deviceType: string;
  connectionType: 'bluetooth' | 'usb' | 'wifi' | 'simulation';
  retryAttempts: number;
  timeout: number;
}

export interface ConnectionStatus {
  connected: boolean;
  lastAttempt: string;
  error?: string;
  signalStrength?: number;
  batteryLevel?: number;
}

class DeviceConnectionManager {
  private connections: Map<string, any> = new Map();
  private connectionStatus: Map<string, ConnectionStatus> = new Map();
  private reconnectIntervals: Map<string, NodeJS.Timeout> = new Map();

  async connectDevice(config: DeviceConnectionConfig): Promise<boolean> {
    try {
      logger.info('Attempting device connection', 'DEVICE_CONNECTION', config);

      // First run connectivity test
      const testResult = await deviceConnectivityTest.runComprehensiveTest();
      if (testResult.overall === 'failed') {
        throw new Error(`Device connectivity test failed: ${testResult.errors.join(', ')}`);
      }

      // Attempt connection based on type
      let connection;
      switch (config.connectionType) {
        case 'bluetooth':
          connection = await this.connectBluetooth(config);
          break;
        case 'usb':
          connection = await this.connectUSB(config);
          break;
        case 'wifi':
          connection = await this.connectWiFi(config);
          break;
        case 'simulation':
          connection = await this.connectSimulation(config);
          break;
        default:
          throw new Error(`Unsupported connection type: ${config.connectionType}`);
      }

      if (connection) {
        this.connections.set(config.deviceId, connection);
        this.updateConnectionStatus(config.deviceId, {
          connected: true,
          lastAttempt: new Date().toISOString()
        });

        // Start monitoring connection
        this.startConnectionMonitoring(config.deviceId);
        
        logger.info('Device connected successfully', 'DEVICE_CONNECTION', { deviceId: config.deviceId });
        return true;
      }

      throw new Error('Failed to establish connection');

    } catch (error) {
      logger.error('Device connection failed', 'DEVICE_CONNECTION', error);
      
      this.updateConnectionStatus(config.deviceId, {
        connected: false,
        lastAttempt: new Date().toISOString(),
        error: error.message
      });

      // Schedule retry if configured
      if (config.retryAttempts > 0) {
        this.scheduleReconnect(config);
      }

      return false;
    }
  }

  private async connectBluetooth(config: DeviceConnectionConfig): Promise<any> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API not supported');
    }

    try {
      // Check if Bluetooth is available
      const available = await navigator.bluetooth.getAvailability();
      if (!available) {
        throw new Error('Bluetooth adapter not available');
      }

      // Get device-specific service UUIDs
      const services = this.getBluetoothServices(config.deviceType);
      if (services.length === 0) {
        throw new Error(`No Bluetooth services defined for device type: ${config.deviceType}`);
      }

      // Request device
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services }],
        optionalServices: ['battery_service', 'device_information']
      });

      // Connect to GATT server
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      // Set up disconnect handler
      device.addEventListener('gattserverdisconnected', () => {
        this.handleDeviceDisconnect(config.deviceId);
      });

      return {
        device,
        server,
        type: 'bluetooth'
      };

    } catch (error) {
      if (error.name === 'NotFoundError') {
        throw new Error('No compatible Bluetooth device found');
      } else if (error.name === 'SecurityError') {
        throw new Error('Bluetooth access denied by user');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('Bluetooth operation not supported');
      }
      throw error;
    }
  }

  private async connectUSB(config: DeviceConnectionConfig): Promise<any> {
    if (!navigator.usb) {
      throw new Error('Web USB API not supported');
    }

    try {
      // Get USB device filters for the device type
      const filters = this.getUSBFilters(config.deviceType);
      
      const device = await navigator.usb.requestDevice({ filters });
      await device.open();
      
      // Configure device
      await device.selectConfiguration(1);
      await device.claimInterface(0);

      return {
        device,
        type: 'usb'
      };

    } catch (error) {
      if (error.name === 'NotFoundError') {
        throw new Error('No compatible USB device found');
      } else if (error.name === 'SecurityError') {
        throw new Error('USB access denied by user');
      }
      throw error;
    }
  }

  private async connectWiFi(config: DeviceConnectionConfig): Promise<any> {
    // WiFi connections typically use HTTP/WebSocket APIs
    try {
      const deviceIP = await this.discoverWiFiDevice(config.deviceType);
      const response = await fetch(`http://${deviceIP}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: config.deviceId })
      });

      if (!response.ok) {
        throw new Error(`WiFi connection failed: ${response.statusText}`);
      }

      return {
        ip: deviceIP,
        type: 'wifi'
      };

    } catch (error) {
      throw new Error(`WiFi connection failed: ${error.message}`);
    }
  }

  private async connectSimulation(config: DeviceConnectionConfig): Promise<any> {
    // Always succeeds for simulation
    return {
      type: 'simulation',
      deviceId: config.deviceId,
      deviceType: config.deviceType
    };
  }

  private getBluetoothServices(deviceType: string): string[] {
    const serviceMap = {
      'heart_rate_monitor': ['heart_rate'],
      'blood_pressure_monitor': ['blood_pressure'],
      'glucose_monitor': ['glucose'],
      'temperature_sensor': ['health_thermometer'],
      'pulse_oximeter': ['pulse_oximeter'],
      'fitness_tracker': ['heart_rate', 'battery_service'],
      'smart_scale': ['weight_scale'],
      'sleep_tracker': ['heart_rate', 'battery_service']
    };

    return serviceMap[deviceType] || [];
  }

  private getUSBFilters(deviceType: string): any[] {
    // Common medical device USB vendor IDs
    const filterMap = {
      'glucose_monitor': [{ vendorId: 0x1234 }], // Example vendor ID
      'blood_pressure_monitor': [{ vendorId: 0x5678 }],
      'pulse_oximeter': [{ vendorId: 0x9ABC }]
    };

    return filterMap[deviceType] || [];
  }

  private async discoverWiFiDevice(deviceType: string): Promise<string> {
    // In a real implementation, this would use mDNS or similar discovery
    // For now, return a mock IP
    return '192.168.1.100';
  }

  private updateConnectionStatus(deviceId: string, status: Partial<ConnectionStatus>): void {
    const current = this.connectionStatus.get(deviceId) || {
      connected: false,
      lastAttempt: new Date().toISOString()
    };

    this.connectionStatus.set(deviceId, { ...current, ...status });
  }

  private startConnectionMonitoring(deviceId: string): void {
    const interval = setInterval(async () => {
      const connection = this.connections.get(deviceId);
      if (!connection) {
        clearInterval(interval);
        return;
      }

      try {
        // Check connection health based on type
        let isHealthy = false;
        switch (connection.type) {
          case 'bluetooth':
            isHealthy = connection.server?.connected || false;
            break;
          case 'usb':
            isHealthy = connection.device?.opened || false;
            break;
          case 'wifi':
            // Ping the device
            const response = await fetch(`http://${connection.ip}/api/ping`, { 
              method: 'GET',
              signal: AbortSignal.timeout(5000)
            });
            isHealthy = response.ok;
            break;
          case 'simulation':
            isHealthy = true;
            break;
        }

        if (!isHealthy) {
          this.handleDeviceDisconnect(deviceId);
        } else {
          this.updateConnectionStatus(deviceId, {
            connected: true,
            lastAttempt: new Date().toISOString()
          });
        }

      } catch (error) {
        logger.warn('Connection monitoring failed', 'DEVICE_CONNECTION', { deviceId, error: error.message });
        this.handleDeviceDisconnect(deviceId);
      }
    }, 30000); // Check every 30 seconds

    // Store interval for cleanup
    this.reconnectIntervals.set(`monitor_${deviceId}`, interval);
  }

  private handleDeviceDisconnect(deviceId: string): void {
    logger.warn('Device disconnected', 'DEVICE_CONNECTION', { deviceId });
    
    this.connections.delete(deviceId);
    this.updateConnectionStatus(deviceId, {
      connected: false,
      lastAttempt: new Date().toISOString(),
      error: 'Device disconnected'
    });

    // Clean up monitoring
    const monitorInterval = this.reconnectIntervals.get(`monitor_${deviceId}`);
    if (monitorInterval) {
      clearInterval(monitorInterval);
      this.reconnectIntervals.delete(`monitor_${deviceId}`);
    }
  }

  private scheduleReconnect(config: DeviceConnectionConfig): void {
    const timeout = setTimeout(async () => {
      logger.info('Attempting device reconnection', 'DEVICE_CONNECTION', { deviceId: config.deviceId });
      
      const newConfig = { ...config, retryAttempts: config.retryAttempts - 1 };
      await this.connectDevice(newConfig);
      
      this.reconnectIntervals.delete(`reconnect_${config.deviceId}`);
    }, 10000); // Retry after 10 seconds

    this.reconnectIntervals.set(`reconnect_${config.deviceId}`, timeout);
  }

  async disconnectDevice(deviceId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(deviceId);
      if (!connection) {
        return true; // Already disconnected
      }

      // Disconnect based on connection type
      switch (connection.type) {
        case 'bluetooth':
          if (connection.server?.connected) {
            connection.server.disconnect();
          }
          break;
        case 'usb':
          if (connection.device?.opened) {
            await connection.device.close();
          }
          break;
        case 'wifi':
          // Send disconnect request
          await fetch(`http://${connection.ip}/api/disconnect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId })
          });
          break;
        case 'simulation':
          // No actual disconnection needed
          break;
      }

      this.connections.delete(deviceId);
      this.updateConnectionStatus(deviceId, {
        connected: false,
        lastAttempt: new Date().toISOString()
      });

      // Clean up intervals
      const monitorInterval = this.reconnectIntervals.get(`monitor_${deviceId}`);
      const reconnectInterval = this.reconnectIntervals.get(`reconnect_${deviceId}`);
      
      if (monitorInterval) {
        clearInterval(monitorInterval);
        this.reconnectIntervals.delete(`monitor_${deviceId}`);
      }
      
      if (reconnectInterval) {
        clearTimeout(reconnectInterval);
        this.reconnectIntervals.delete(`reconnect_${deviceId}`);
      }

      logger.info('Device disconnected successfully', 'DEVICE_CONNECTION', { deviceId });
      return true;

    } catch (error) {
      logger.error('Device disconnection failed', 'DEVICE_CONNECTION', error);
      return false;
    }
  }

  getConnectionStatus(deviceId: string): ConnectionStatus | null {
    return this.connectionStatus.get(deviceId) || null;
  }

  getAllConnections(): Map<string, ConnectionStatus> {
    return new Map(this.connectionStatus);
  }

  async readDeviceData(deviceId: string): Promise<any> {
    const connection = this.connections.get(deviceId);
    if (!connection) {
      throw new Error('Device not connected');
    }

    try {
      switch (connection.type) {
        case 'bluetooth':
          return await this.readBluetoothData(connection);
        case 'usb':
          return await this.readUSBData(connection);
        case 'wifi':
          return await this.readWiFiData(connection);
        case 'simulation':
          return this.generateSimulatedData(connection.deviceType);
        default:
          throw new Error('Unsupported connection type');
      }
    } catch (error) {
      logger.error('Failed to read device data', 'DEVICE_CONNECTION', error);
      throw error;
    }
  }

  private async readBluetoothData(connection: any): Promise<any> {
    // Implementation would depend on specific device characteristics
    // This is a simplified example
    const service = await connection.server.getPrimaryService('heart_rate');
    const characteristic = await service.getCharacteristic('heart_rate_measurement');
    const value = await characteristic.readValue();
    
    return this.parseBluetoothData(value);
  }

  private async readUSBData(connection: any): Promise<any> {
    // Read data from USB device
    const result = await connection.device.transferIn(1, 64);
    return this.parseUSBData(result.data);
  }

  private async readWiFiData(connection: any): Promise<any> {
    const response = await fetch(`http://${connection.ip}/api/data`);
    return await response.json();
  }

  private generateSimulatedData(deviceType: string): any {
    const timestamp = new Date().toISOString();
    
    switch (deviceType) {
      case 'heart_rate_monitor':
        return {
          heartRate: Math.floor(Math.random() * 40) + 60,
          timestamp
        };
      case 'blood_pressure_monitor':
        return {
          systolic: Math.floor(Math.random() * 40) + 110,
          diastolic: Math.floor(Math.random() * 30) + 70,
          timestamp
        };
      case 'glucose_monitor':
        return {
          glucose: Math.floor(Math.random() * 100) + 80,
          timestamp
        };
      default:
        return { value: Math.random() * 100, timestamp };
    }
  }

  private parseBluetoothData(dataView: DataView): any {
    // Parse Bluetooth data based on specification
    // This is a simplified example for heart rate
    const heartRate = dataView.getUint16(1, true);
    return { heartRate, timestamp: new Date().toISOString() };
  }

  private parseUSBData(data: DataView): any {
    // Parse USB data based on device protocol
    return { data: Array.from(new Uint8Array(data.buffer)) };
  }

  cleanup(): void {
    // Disconnect all devices
    this.connections.forEach(async (_, deviceId) => {
      await this.disconnectDevice(deviceId);
    });

    // Clear all intervals
    this.reconnectIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.reconnectIntervals.clear();
  }
}

export const deviceConnectionManager = new DeviceConnectionManager();
