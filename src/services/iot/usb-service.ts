import { IoTDevice, VitalSigns } from '@/types/iot';

export class USBService {
    private device: USBDevice | null = null;

    isSupported(): boolean {
        return 'usb' in navigator;
    }

    async scanForDevices(): Promise<USBDevice> {
        if (!this.isSupported()) {
            throw new Error('Web USB is not supported in this browser');
        }

        try {
            // Request device with common medical device class or specific IDs if known
            // For now, we accept any device to be broad
            const device = await navigator.usb.requestDevice({ filters: [] });
            this.device = device;
            return device;
        } catch (error: any) {
            console.error('[USBService] Error scanning for devices:', error);
            throw error;
        }
    }

    async connect(device: USBDevice): Promise<void> {
        try {
            await device.open();
            if (device.configuration === null) {
                await device.selectConfiguration(1);
            }
            await device.claimInterface(0);
            this.device = device;
        } catch (error) {
            console.error('[USBService] Error connecting to device:', error);
            throw error;
        }
    }

    disconnect(): void {
        if (this.device) {
            this.device.close();
            this.device = null;
        }
    }

    async startDataStream(callback: (data: DataView) => void): Promise<void> {
        if (!this.device || !this.device.opened) throw new Error('Device not connected');

        const read = async () => {
            if (!this.device || !this.device.opened) return;
            try {
                const result = await this.device.transferIn(1, 64);
                if (result.data) {
                    callback(result.data);
                }
                read(); // Continue reading
            } catch (error) {
                console.error('[USBService] Read error:', error);
            }
        };

        read();
    }
}

export const usbService = new USBService();
