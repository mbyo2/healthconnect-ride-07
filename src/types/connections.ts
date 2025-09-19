export interface UserConnection {
  id: string;
  patient_id: string;
  provider_id: string;
  connection_type: 'manual' | 'automatic' | 'appointment_based' | 'chat_based';
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  requested_by: string;
  requested_at: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    email?: string;
  } | null;
  provider?: {
    id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    specialty?: string;
    email?: string;
  } | null;
}

export interface PrimaryProviderAssignment {
  id: string;
  patient_id: string;
  provider_id: string;
  assigned_at: string;
  assigned_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  provider?: {
    id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    specialty?: string;
    email?: string;
  } | null;
}

export interface ConnectionRequest {
  patient_id: string;
  provider_id: string;
  connection_type: 'manual';
  notes?: string;
}

// TODO: Implement logic for connection status transitions (pending, approved, rejected, blocked) and update UI accordingly
