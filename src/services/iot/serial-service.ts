import { IoTDevice, VitalSigns } from '@/types/iot';

export class SerialService {
    private port: any | null = null; // Using any because SerialPort type might not be in all environments
    private reader: any | null = null;

    isSupported(): boolean {
        return 'serial' in navigator;
    }

    async scanForDevices(): Promise<any> {
        if (!this.isSupported()) {
            throw new Error('Web Serial is not supported in this browser');
        }

        try {
            const port = await (navigator as any).serial.requestPort();
            this.port = port;
            return port;
        } catch (error: any) {
            console.error('[SerialService] Error scanning for devices:', error);
            throw error;
        }
    }

    async connect(port: any, options: { baudRate: number } = { baudRate: 9600 }): Promise<void> {
        try {
            await port.open(options);
            this.port = port;
        } catch (error) {
            console.error('[SerialService] Error connecting to port:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.reader) {
            await this.reader.cancel();
            this.reader = null;
        }
        if (this.port) {
            await this.port.close();
            this.port = null;
        }
    }

    async startDataStream(callback: (data: Uint8Array) => void): Promise<void> {
        if (!this.port || !this.port.readable) throw new Error('Port not connected or not readable');

        const read = async () => {
            if (!this.port || !this.port.readable) return;
            this.reader = this.port.readable.getReader();
            try {
                while (true) {
                    const { value, done } = await this.reader.read();
                    if (done) break;
                    if (value) {
                        callback(value);
                    }
                }
            } catch (error) {
                console.error('[SerialService] Read error:', error);
            } finally {
                this.reader.releaseLock();
                this.reader = null;
            }
        };

        read();
    }
}

export const serialService = new SerialService();
