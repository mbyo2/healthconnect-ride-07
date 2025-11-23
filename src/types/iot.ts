// IoT and health monitoring types

export interface IoTDevice {
    id: string;
    user_id: string;
    device_name: string;
    device_type: DeviceType;
    device_id: string;
    is_active: boolean;
    last_sync?: string;
    battery_level?: number;
    firmware_version?: string;
    created_at: string;
}

export type DeviceType =
    | 'smartwatch'
    | 'fitness_tracker'
    | 'blood_pressure_monitor'
    | 'glucose_meter'
    | 'pulse_oximeter'
    | 'thermometer'
    | 'weight_scale'
    | 'ecg_monitor';

export interface VitalSigns {
    id: string;
    user_id: string;
    device_id?: string;
    heart_rate?: number;
    blood_pressure?: BloodPressure;
    temperature?: number;
    oxygen_saturation?: number;
    respiratory_rate?: number;
    blood_glucose?: number;
    weight?: number;
    recorded_at: string;
}

export interface BloodPressure {
    systolic: number;
    diastolic: number;
}

export interface HealthMetrics {
    user_id: string;
    date: string;
    steps?: number;
    calories_burned?: number;
    distance?: number;
    active_minutes?: number;
    sleep_hours?: number;
    water_intake?: number;
}

export interface DeviceAlert {
    id: string;
    device_id: string;
    alert_type: AlertType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    triggered_at: string;
    acknowledged: boolean;
}

export type AlertType =
    | 'abnormal_reading'
    | 'low_battery'
    | 'connection_lost'
    | 'threshold_exceeded'
    | 'device_malfunction';

export interface HealthTrend {
    metric: string;
    current_value: number;
    previous_value: number;
    change_percentage: number;
    trend: 'improving' | 'stable' | 'declining';
    period: 'day' | 'week' | 'month';
}
