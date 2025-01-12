export interface Application {
  id: string;
  user_id: string;
  license_number: string;
  specialty: string;
  years_of_experience: number;
  status: 'pending' | 'approved' | 'rejected';
  documents_url?: string[];
  created_at?: string;
  updated_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
}