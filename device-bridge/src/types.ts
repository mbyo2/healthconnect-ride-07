export interface DeviceConfig {
  id: string // matches institution_devices.id in Doc'O Clock
  name: string
  brand:
    | 'philips'
    | 'ge'
    | 'draeger'
    | 'nihon-kohden'
    | 'mindray'
    | 'welch-allyn'
    | 'hl7-mllp'
  model?: string
  transport: 'tcp' | 'serial' | 'bluetooth'
  listen_port?: number
  serial_path?: string
  baud?: number
  room?: string
}

export interface CanonicalReading {
  device_id: string
  patient_id?: string | null
  data_type: string // e.g. 'heart_rate', 'spo2', 'nibp', 'etco2', 'temperature'
  data_value: Record<string, unknown>
  unit?: string | null
  is_critical?: boolean
  recorded_at?: string
  alert?: {
    alert_type: string
    severity: 'info' | 'warning' | 'critical'
    message: string
  }
}
