export interface ApplicationWithProfile {
  id: string;
  user_id: string;
  license_number: string;
  specialty: string;
  years_of_experience: number;
  status: string;
  documents_url?: string[];
  reviewed_by?: string;
  reviewed_at?: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}