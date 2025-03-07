
export interface VideoConsultationDetails {
  id: string;
  patient_id: string;
  provider_id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  meeting_url?: string;
  notes?: string;
  created_at: string;
  network_optimized?: boolean;
  provider: {
    first_name: string;
    last_name: string;
    specialty?: string;
  };
}

export interface NetworkQualityMetrics {
  downlink?: number;
  uplink?: number;
  rtt?: number;
  jitter?: number;
  packetLoss?: number;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
}
