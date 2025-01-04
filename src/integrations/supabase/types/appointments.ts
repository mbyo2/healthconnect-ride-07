export interface AppointmentTypes {
  Row: {
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
  };
  Insert: {
    id?: string;
    patient_id: string;
    provider_id: string;
    date: string;
    time: string;
    status?: 'scheduled' | 'cancelled' | 'completed';
    type: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    patient_id?: string;
    provider_id?: string;
    date?: string;
    time?: string;
    status?: 'scheduled' | 'cancelled' | 'completed';
    type?: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
  };
}