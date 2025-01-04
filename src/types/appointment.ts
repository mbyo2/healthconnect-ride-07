export interface Appointment {
  id: string;
  patient_id: string;
  provider_id: string;
  date: string;
  time: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  type: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  providers?: {
    first_name: string;
    last_name: string;
    specialty: string;
  };
}