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
  provider: {
    first_name: string;
    last_name: string;
    specialty?: string;
  };
}