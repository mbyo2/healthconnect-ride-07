export interface Application {
  id: string;
  user_id: string | null;
  license_number: string;
  specialty: string;
  years_of_experience: number;
  status: string;
  documents_url: string[] | null;
  created_at: string | null;
  updated_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}