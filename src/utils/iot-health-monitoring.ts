import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { errorHandler } from './error-handler';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface IoTDevice {
  id: string;
  name: string;
  type: 'wearable' | 'sensor' | 'medical_device' | 'smartphone' | 'smart_scale' | 'glucometer' | 'bp_monitor';
  manufacturer: string;
  model: string;
  patientId: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  batteryLevel?: number;
  lastSync: string;
  capabilities: string[];
  configuration: any;
}

export interface HealthMetric {
  id: string;
  deviceId: string;
  patientId: string;
  metricType: 'heart_rate' | 'blood_pressure' | 'temperature' | 'glucose' | 'weight' | 'steps' | 'sleep' | 'oxygen_saturation';
  value: number | string;
  unit: string;
  timestamp: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  context?: {
    activity?: string;
    medication?: boolean;
    notes?: string;
  };
}

export interface Alert {
  id: string;
  patientId: string;
  deviceId: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  metricType: string;
  value: any;
  threshold: any;
  timestamp: string;
  acknowledged: boolean;
  resolvedAt?: string;
}

export interface DeviceCalibration {
  deviceId: string;
  calibrationType: string;
  referenceValue: number;
  deviceValue: number;
  adjustmentFactor: number;
  calibratedAt: string;
  validUntil: string;
}

class IoTHealthMonitoring {
  private connectedDevices: Map<string, IoTDevice> = new Map();
  private deviceStreams: Map<string, any> = new Map();
  private alertThresholds: Map<string, any> = new Map();
  private calibrationData: Map<string, DeviceCalibration> = new Map();

  constructor() {
    this.initializeIoTSystem();
  }

  private async initializeIoTSystem(): Promise<void> {
    try {
      await this.loadDevices();
      await this.loadAlertThresholds();
      await this.setupDeviceListeners();
      await this.startHealthMonitoring();

      logger.info('IoT Health Monitoring system initialized', 'IOT_MONITORING');
    } catch (error) {
      errorHandler.handleError(error, 'initializeIoTSystem');
    }
  }

  private async loadDevices(): Promise<void> {
    try {
      const { data: devices } = await supabase
        .from('iot_devices')
        .select('*')
        .eq('status', 'active');

      if (devices) {
        devices.forEach(device => {
          this.connectedDevices.set(device.id, device);
        });
      }

      logger.info(`Loaded ${this.connectedDevices.size} IoT devices`, 'IOT_MONITORING');
    } catch (error) {
      logger.error('Failed to load IoT devices', 'IOT_MONITORING', error);
    }
  }

  private async loadAlertThresholds(): Promise<void> {
    const defaultThresholds = {
      'heart_rate': {
        critical: { min: 40, max: 150 },
        warning: { min: 50, max: 120 }
      },
      'blood_pressure': {
        critical: { systolic: { min: 70, max: 200 }, diastolic: { min: 40, max: 120 } },
        warning: { systolic: { min: 90, max: 160 }, diastolic: { min: 60, max: 100 } }
      },
      'temperature': {
        critical: { min: 35.0, max: 40.0 },
        warning: { min: 36.0, max: 38.5 }
      },
      'glucose': {
        critical: { min: 50, max: 400 },
        warning: { min: 70, max: 200 }
      },
      'oxygen_saturation': {
        critical: { min: 85, max: 100 },
        warning: { min: 90, max: 100 }
      }
    };

    Object.entries(defaultThresholds).forEach(([metric, thresholds]) => {
      this.alertThresholds.set(metric, thresholds);
    });
  }

  private async setupDeviceListeners(): Promise<void> {
    // Simulate device connections - in production, this would use actual IoT protocols
    this.connectedDevices.forEach((device, deviceId) => {
      this.setupDeviceStream(deviceId, device.type);
    });
  }

  private setupDeviceStream(deviceId: string, deviceType: string): void {
    // Simulate real-time data streams
    const interval = this.getStreamInterval(deviceType);
    
    const stream = setInterval(async () => {
      await this.simulateDeviceData(deviceId, deviceType);
    }, interval);

    this.deviceStreams.set(deviceId, stream);
  }

  private getStreamInterval(deviceType: string): number {
    const intervals = {
      'wearable': 30000, // 30 seconds
      'bp_monitor': 300000, // 5 minutes
      'glucometer': 900000, // 15 minutes
      'smart_scale': 86400000, // 24 hours
      'sensor': 60000, // 1 minute
      'medical_device': 120000 // 2 minutes
    };

    return intervals[deviceType] || 60000;
  }

  private async simulateDeviceData(deviceId: string, deviceType: string): Promise<void> {
    try {
      const device = this.connectedDevices.get(deviceId);
      if (!device) return;

      const metrics = this.generateSimulatedMetrics(deviceType);
      
      for (const metric of metrics) {
        await this.processHealthMetric({
          id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          deviceId,
          patientId: device.patientId,
          metricType: metric.type,
          value: metric.value,
          unit: metric.unit,
          timestamp: new Date().toISOString(),
          quality: metric.quality,
          context: metric.context
        });
      }
    } catch (error) {
      logger.error('Failed to simulate device data', 'IOT_MONITORING', error);
    }
  }

  private generateSimulatedMetrics(deviceType: string): any[] {
    switch (deviceType) {
      case 'wearable':
        return [
          {
            type: 'heart_rate',
            value: 60 + Math.random() * 40,
            unit: 'bpm',
            quality: 'good'
          },
          {
            type: 'steps',
            value: Math.floor(Math.random() * 1000),
            unit: 'steps',
            quality: 'excellent'
          }
        ];

      case 'bp_monitor':
        return [{
          type: 'blood_pressure',
          value: `${Math.floor(110 + Math.random() * 40)}/${Math.floor(70 + Math.random() * 20)}`,
          unit: 'mmHg',
          quality: 'good'
        }];

      case 'glucometer':
        return [{
          type: 'glucose',
          value: 80 + Math.random() * 60,
          unit: 'mg/dL',
          quality: 'excellent',
          context: { medication: Math.random() > 0.5 }
        }];

      case 'smart_scale':
        return [{
          type: 'weight',
          value: 70 + Math.random() * 30,
          unit: 'kg',
          quality: 'excellent'
        }];

      default:
        return [];
    }
  }

  async registerDevice(device: Omit<IoTDevice, 'id' | 'lastSync'>): Promise<IoTDevice> {
    try {
      const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newDevice: IoTDevice = {
        ...device,
        id: deviceId,
        lastSync: new Date().toISOString()
      };

      await supabase.from('iot_devices').insert(newDevice);
      
      this.connectedDevices.set(deviceId, newDevice);
      this.setupDeviceStream(deviceId, device.type);

      logger.info('IoT device registered', 'IOT_MONITORING', { deviceId, type: device.type });
      return newDevice;
    } catch (error) {
      errorHandler.handleError(error, 'registerDevice');
      throw error;
    }
  }

  async processHealthMetric(metric: HealthMetric): Promise<void> {
    try {
      // Apply calibration if available
      const calibratedMetric = await this.applyCalibratedValue(metric);
      
      // Store metric
      await supabase.from('health_metrics').insert(calibratedMetric);
      
      // Check for alerts
      await this.checkAlertThresholds(calibratedMetric);
      
      // Update device sync time
      await this.updateDeviceSync(metric.deviceId);
      
      logger.debug('Health metric processed', 'IOT_MONITORING', {
        deviceId: metric.deviceId,
        metricType: metric.metricType,
        value: metric.value
      });
    } catch (error) {
      errorHandler.handleError(error, 'processHealthMetric');
    }
  }

  private async applyCalibratedValue(metric: HealthMetric): Promise<HealthMetric> {
    const calibration = this.calibrationData.get(`${metric.deviceId}_${metric.metricType}`);
    
    if (calibration && new Date(calibration.validUntil) > new Date()) {
      if (typeof metric.value === 'number') {
        metric.value = metric.value * calibration.adjustmentFactor;
      }
    }
    
    return metric;
  }

  private async checkAlertThresholds(metric: HealthMetric): Promise<void> {
    const thresholds = this.alertThresholds.get(metric.metricType);
    if (!thresholds) return;

    const alerts: Alert[] = [];
    
    if (typeof metric.value === 'number') {
      // Check critical thresholds
      if (thresholds.critical) {
        if (metric.value < thresholds.critical.min || metric.value > thresholds.critical.max) {
          alerts.push(await this.createAlert(metric, 'critical', thresholds.critical));
        }
      }
      
      // Check warning thresholds
      if (thresholds.warning && alerts.length === 0) {
        if (metric.value < thresholds.warning.min || metric.value > thresholds.warning.max) {
          alerts.push(await this.createAlert(metric, 'warning', thresholds.warning));
        }
      }
    }

    // Special handling for blood pressure
    if (metric.metricType === 'blood_pressure' && typeof metric.value === 'string') {
      const [systolic, diastolic] = metric.value.split('/').map(Number);
      
      if (thresholds.critical) {
        if (systolic < thresholds.critical.systolic.min || systolic > thresholds.critical.systolic.max ||
            diastolic < thresholds.critical.diastolic.min || diastolic > thresholds.critical.diastolic.max) {
          alerts.push(await this.createAlert(metric, 'critical', thresholds.critical));
        }
      }
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  private async createAlert(metric: HealthMetric, type: Alert['type'], threshold: any): Promise<Alert> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let message = '';
    if (type === 'critical') {
      message = `CRITICAL: ${metric.metricType} value ${metric.value} ${metric.unit} is outside safe range`;
    } else {
      message = `WARNING: ${metric.metricType} value ${metric.value} ${metric.unit} requires attention`;
    }

    const alert: Alert = {
      id: alertId,
      patientId: metric.patientId,
      deviceId: metric.deviceId,
      type,
      message,
      metricType: metric.metricType,
      value: metric.value,
      threshold,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };

    await supabase.from('health_alerts').insert(alert);
    return alert;
  }

  private async sendAlert(alert: Alert): Promise<void> {
    try {
      // Send to healthcare providers
      await this.notifyHealthcareProviders(alert);
      
      // Send to patient if not critical (critical alerts go to providers first)
      if (alert.type !== 'critical') {
        await this.notifyPatient(alert);
      }
      
      // Log alert
      logger.info('Health alert sent', 'IOT_MONITORING', {
        alertId: alert.id,
        type: alert.type,
        patientId: alert.patientId
      });
    } catch (error) {
      logger.error('Failed to send alert', 'IOT_MONITORING', error);
    }
  }

  private async notifyHealthcareProviders(alert: Alert): Promise<void> {
    // Get patient's healthcare providers
    const { data: providers } = await supabase
      .from('patient_providers')
      .select('provider_id')
      .eq('patient_id', alert.patientId);

    if (providers) {
      for (const provider of providers) {
        // Send notification (would integrate with notification service)
        await supabase.from('notifications').insert({
          recipient_id: provider.provider_id,
          type: 'health_alert',
          title: `Health Alert: ${alert.type.toUpperCase()}`,
          message: alert.message,
          data: JSON.stringify(alert),
          created_at: new Date().toISOString()
        });
      }
    }
  }

  private async notifyPatient(alert: Alert): Promise<void> {
    await supabase.from('notifications').insert({
      recipient_id: alert.patientId,
      type: 'health_alert',
      title: 'Health Monitoring Alert',
      message: alert.message,
      data: JSON.stringify(alert),
      created_at: new Date().toISOString()
    });
  }

  private async updateDeviceSync(deviceId: string): Promise<void> {
    await supabase
      .from('iot_devices')
      .update({ lastSync: new Date().toISOString() })
      .eq('id', deviceId);
  }

  async getDeviceMetrics(deviceId: string, timeRange: string = '24h'): Promise<HealthMetric[]> {
    try {
      const startTime = this.calculateStartTime(timeRange);
      
      const { data: metrics } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('deviceId', deviceId)
        .gte('timestamp', startTime)
        .order('timestamp', { ascending: false });

      return metrics || [];
    } catch (error) {
      errorHandler.handleError(error, 'getDeviceMetrics');
      return [];
    }
  }

  async getPatientMetrics(patientId: string, metricType?: string, timeRange: string = '7d'): Promise<HealthMetric[]> {
    try {
      const startTime = this.calculateStartTime(timeRange);
      
      let query = supabase
        .from('health_metrics')
        .select('*')
        .eq('patientId', patientId)
        .gte('timestamp', startTime);

      if (metricType) {
        query = query.eq('metricType', metricType);
      }

      const { data: metrics } = await query.order('timestamp', { ascending: false });
      return metrics || [];
    } catch (error) {
      errorHandler.handleError(error, 'getPatientMetrics');
      return [];
    }
  }

  private calculateStartTime(timeRange: string): string {
    const now = new Date();
    const ranges = {
      '1h': 1 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const milliseconds = ranges[timeRange] || ranges['24h'];
    return new Date(now.getTime() - milliseconds).toISOString();
  }

  async calibrateDevice(
    deviceId: string,
    metricType: string,
    referenceValue: number,
    deviceValue: number
  ): Promise<void> {
    try {
      const adjustmentFactor = referenceValue / deviceValue;
      const calibration: DeviceCalibration = {
        deviceId,
        calibrationType: metricType,
        referenceValue,
        deviceValue,
        adjustmentFactor,
        calibratedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      };

      await supabase.from('device_calibrations').insert(calibration);
      this.calibrationData.set(`${deviceId}_${metricType}`, calibration);

      logger.info('Device calibrated', 'IOT_MONITORING', {
        deviceId,
        metricType,
        adjustmentFactor
      });
    } catch (error) {
      errorHandler.handleError(error, 'calibrateDevice');
    }
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('health_alerts')
        .update({ acknowledged: true, acknowledgedBy: userId, acknowledgedAt: new Date().toISOString() })
        .eq('id', alertId);

      logger.info('Alert acknowledged', 'IOT_MONITORING', { alertId, userId });
    } catch (error) {
      errorHandler.handleError(error, 'acknowledgeAlert');
    }
  }

  async getActiveAlerts(patientId: string): Promise<Alert[]> {
    try {
      const { data: alerts } = await supabase
        .from('health_alerts')
        .select('*')
        .eq('patientId', patientId)
        .eq('acknowledged', false)
        .order('timestamp', { ascending: false });

      return alerts || [];
    } catch (error) {
      errorHandler.handleError(error, 'getActiveAlerts');
      return [];
    }
  }

  async generateHealthReport(patientId: string, timeRange: string = '30d'): Promise<any> {
    try {
      const metrics = await this.getPatientMetrics(patientId, undefined, timeRange);
      const alerts = await this.getActiveAlerts(patientId);
      
      const metricsByType = metrics.reduce((acc, metric) => {
        if (!acc[metric.metricType]) acc[metric.metricType] = [];
        acc[metric.metricType].push(metric);
        return acc;
      }, {} as Record<string, HealthMetric[]>);

      const report = {
        patientId,
        timeRange,
        totalMetrics: metrics.length,
        activeAlerts: alerts.length,
        metricTypes: Object.keys(metricsByType),
        summary: Object.entries(metricsByType).map(([type, typeMetrics]) => ({
          metricType: type,
          count: typeMetrics.length,
          latest: typeMetrics[0]?.value,
          average: this.calculateAverage(typeMetrics),
          trend: this.calculateTrend(typeMetrics)
        })),
        alerts: alerts.map(alert => ({
          type: alert.type,
          message: alert.message,
          timestamp: alert.timestamp
        })),
        generatedAt: new Date().toISOString()
      };

      return report;
    } catch (error) {
      errorHandler.handleError(error, 'generateHealthReport');
      return null;
    }
  }

  private calculateAverage(metrics: HealthMetric[]): number {
    const numericMetrics = metrics.filter(m => typeof m.value === 'number');
    if (numericMetrics.length === 0) return 0;
    
    const sum = numericMetrics.reduce((acc, m) => acc + (m.value as number), 0);
    return sum / numericMetrics.length;
  }

  private calculateTrend(metrics: HealthMetric[]): 'increasing' | 'decreasing' | 'stable' {
    if (metrics.length < 2) return 'stable';
    
    const numericMetrics = metrics
      .filter(m => typeof m.value === 'number')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    if (numericMetrics.length < 2) return 'stable';
    
    const first = numericMetrics[0].value as number;
    const last = numericMetrics[numericMetrics.length - 1].value as number;
    const change = (last - first) / first;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private async startHealthMonitoring(): Promise<void> {
    // Start background monitoring tasks
    setInterval(async () => {
      await this.checkDeviceHealth();
    }, 300000); // Check every 5 minutes

    setInterval(async () => {
      await this.cleanupOldData();
    }, 3600000); // Cleanup every hour
  }

  private async checkDeviceHealth(): Promise<void> {
    try {
      const now = new Date();
      
      this.connectedDevices.forEach(async (device) => {
        const lastSync = new Date(device.lastSync);
        const timeDiff = now.getTime() - lastSync.getTime();
        const expectedInterval = this.getStreamInterval(device.type);
        
        // If device hasn't synced in 3x expected interval, mark as error
        if (timeDiff > expectedInterval * 3) {
          await supabase
            .from('iot_devices')
            .update({ status: 'error' })
            .eq('id', device.id);
          
          logger.warn('Device health check failed', 'IOT_MONITORING', {
            deviceId: device.id,
            lastSync: device.lastSync
          });
        }
      });
    } catch (error) {
      logger.error('Device health check failed', 'IOT_MONITORING', error);
    }
  }

  private async cleanupOldData(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
      
      await supabase
        .from('health_metrics')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());
      
      logger.info('Old health metrics cleaned up', 'IOT_MONITORING');
    } catch (error) {
      logger.error('Failed to cleanup old data', 'IOT_MONITORING', error);
    }
  }

  // Get all connected devices
  getDevices(): IoTDevice[] {
    return Array.from(this.connectedDevices.values());
  }

  // Get devices for a specific patient
  getPatientDevices(patientId: string): IoTDevice[] {
    return Array.from(this.connectedDevices.values())
      .filter(device => device.patientId === patientId);
  }

  cleanup(): void {
    // Stop all device streams
    this.deviceStreams.forEach(stream => {
      clearInterval(stream);
    });
    this.deviceStreams.clear();
  }
}

export const iotHealthMonitoring = new IoTHealthMonitoring();
