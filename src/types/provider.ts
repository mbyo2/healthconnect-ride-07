export interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  specialty?: string;
  rating?: number;
  location?: [number, number];
  availability?: string;
  expertise?: string[];
  avatar_url?: string;
  bio?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  role?: string;
  is_profile_complete?: boolean;
  date_of_birth?: string;
  gender?: string;
  created_at?: string;
  name?: string; // Added for ProviderCard
}