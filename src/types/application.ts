export interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  specialty?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  updated_at: string;
  read: boolean;
  attachments: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

export interface VideoConsultationDetails {
  id: string;
  patient_id: string;
  provider_id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  meeting_url: string;
  notes?: string;
  provider: {
    first_name: string;
    last_name: string;
    specialty: string;
  };
}

export interface Appointment {
  id: string;
  patient_id: string;
  provider_id: string;
  date: string;
  time: string;
  status: string;
  type: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  patient: {
    first_name: string;
    last_name: string;
  };
}

export interface AppointmentWithProvider extends Appointment {
  provider: {
    first_name: string;
    last_name: string;
    specialty?: string;
  };
}