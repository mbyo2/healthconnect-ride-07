import { IoTDevice, VitalSigns } from '@/types/iot';

// Standard Bluetooth Service UUIDs
export const BLE_SERVICES = {
    HEART_RATE: 'heart_rate',
    BATTERY: 'battery_service',
    HEALTH_THERMOMETER: 'health_thermometer',
    PULSE_OXIMETER: 'pulse_oximeter',
    GLUCOSE: 'glucose',
    BLOOD_PRESSURE: 'blood_pressure'
};

// Standard Bluetooth Characteristic UUIDs
export const BLE_CHARACTERISTICS = {
    HEART_RATE_MEASUREMENT: 'heart_rate_measurement',
    BATTERY_LEVEL: 'battery_level',
    TEMPERATURE_MEASUREMENT: 'temperature_measurement'
};

export class BluetoothService {
    private device: BluetoothDevice | null = null;
    private server: BluetoothRemoteGATTServer | null = null;

    // Check if Web Bluetooth is supported
    isSupported(): boolean {
        return 'bluetooth' in navigator;
    }

    // Scan for devices
    async scanForDevices(): Promise<BluetoothDevice> {
        if (!this.isSupported()) {
            throw new Error('Web Bluetooth is not supported in this browser');
        }

        try {
            console.log('[BluetoothService] Requesting device...');
            // Request device with filters for common health services
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: [BLE_SERVICES.HEART_RATE] },
                    { services: [BLE_SERVICES.BATTERY] },
                    { services: [BLE_SERVICES.HEALTH_THERMOMETER] },
                    { services: [BLE_SERVICES.PULSE_OXIMETER] },
                    { services: [BLE_SERVICES.GLUCOSE] },
                    { services: [BLE_SERVICES.BLOOD_PRESSURE] }
                ],
                optionalServices: [
                    BLE_SERVICES.HEART_RATE,
                    BLE_SERVICES.BATTERY,
                    BLE_SERVICES.HEALTH_THERMOMETER,
                    BLE_SERVICES.PULSE_OXIMETER,
                    BLE_SERVICES.GLUCOSE,
                    BLE_SERVICES.BLOOD_PRESSURE
                ]
            }).catch(async (err) => {
                // Fallback to acceptAllDevices if filters fail or user cancels
                if (err.name === 'NotFoundError') {
                    console.log('[BluetoothService] No devices found with filters, trying acceptAllDevices...');
                    return await navigator.bluetooth.requestDevice({
                        acceptAllDevices: true,
                        optionalServices: [
                            BLE_SERVICES.HEART_RATE,
                            BLE_SERVICES.BATTERY,
                            BLE_SERVICES.HEALTH_THERMOMETER,
                            BLE_SERVICES.PULSE_OXIMETER,
                            BLE_SERVICES.GLUCOSE,
                            BLE_SERVICES.BLOOD_PRESSURE
                        ]
                    });
                }
                throw err;
            });

            console.log('[BluetoothService] Device selected:', device.name);
            this.device = device;
            return device;
        } catch (error: any) {
            console.error('[BluetoothService] Error scanning for devices:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // Connect to the selected device
    async connect(device: BluetoothDevice): Promise<void> {
        if (!device.gatt) {
            throw new Error('Device does not support GATT');
        }

        try {
            this.server = await device.gatt.connect();

            // Add disconnect listener
            device.addEventListener('gattserverdisconnected', this.handleDisconnect);
        } catch (error) {
            console.error('Error connecting to device:', error);
            throw error;
        }
    }

    // Disconnect from device
    disconnect(): void {
        if (this.device && this.device.gatt && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }
        this.device = null;
        this.server = null;
    }

    // Start listening for heart rate notifications
    async startHeartRateNotifications(callback: (hr: number) => void): Promise<void> {
        if (!this.server) throw new Error('Device not connected');

        try {
            const service = await this.server.getPrimaryService(BLE_SERVICES.HEART_RATE);
            const characteristic = await service.getCharacteristic(BLE_CHARACTERISTICS.HEART_RATE_MEASUREMENT);

            await characteristic.startNotifications();

            characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
                const value = event.target.value;
                const heartRate = this.parseHeartRate(value);
                callback(heartRate);
            });
        } catch (error) {
            console.error('Error starting HR notifications:', error);
            throw error;
        }
    }

    // Start listening for battery level
    async readBatteryLevel(): Promise<number> {
        if (!this.server) throw new Error('Device not connected');

        try {
            const service = await this.server.getPrimaryService(BLE_SERVICES.BATTERY);
            const characteristic = await service.getCharacteristic(BLE_CHARACTERISTICS.BATTERY_LEVEL);
            const value = await characteristic.readValue();
            return value.getUint8(0);
        } catch (error) {
            console.error('Error reading battery level:', error);
            // Return -1 or throw depending on preference, but for UI safety returning null/undefined might be better
            // For now, let's return a default or rethrow
            throw error;
        }
    }

    // Helper to parse Heart Rate Measurement standard format
    private parseHeartRate(value: DataView): number {
        const flags = value.getUint8(0);
        const rate16Bits = flags & 0x1;
        let heartRate: number;

        if (rate16Bits) {
            heartRate = value.getUint16(1, true);
        } else {
            heartRate = value.getUint8(1);
        }

        return heartRate;
    }

    private handleDisconnect = () => {
        console.log('Device disconnected');
        this.device = null;
        this.server = null;
        // Dispatch a custom event or use a callback if needed for UI updates
        window.dispatchEvent(new CustomEvent('iot-device-disconnected'));
    };
}

export const bluetoothService = new BluetoothService();
