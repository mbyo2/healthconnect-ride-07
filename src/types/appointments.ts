export interface Appointment {
  id: string;
  patient_id: string;
  provider_id: string;
  date: string;
  time: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  type: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentWithProvider extends Appointment {
  provider: {
    first_name: string | null;
    last_name: string | null;
    specialty?: string | null;
  };
}