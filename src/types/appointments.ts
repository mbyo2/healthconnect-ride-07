
export interface Appointment {
  id: string;
  patient_id: string;
  provider_id: string;
  date: string;
  time: string;
  type: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  duration?: number;
  notes?: string;
}

export interface AppointmentWithProvider extends Appointment {
  provider: {
    first_name: string;
    last_name: string;
    specialty?: string;
  };
}
