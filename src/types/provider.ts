import type { LatLngTuple } from "leaflet";
import { HealthcareProviderType, InsuranceProvider } from "./healthcare";

export interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  bio?: string;
  avatar_url?: string;
  expertise?: string[];
  provider_type?: HealthcareProviderType;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
  consultation_fee?: number;
  default_service_id?: string;
  rating?: number;
  distance?: number;
  institution_id?: string;
  accepted_insurances?: InsuranceProvider[] | string[];
  // Base profile fields
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  // ── New fields from migration 20260904_provider_institution_enhancements ──
  medical_school?: string;
  graduation_year?: number;
  board_certifications?: string[];
  subspecialties?: string[];
  languages_spoken?: string[];
  primary_practice_location?: string;
  affiliated_hospitals?: string[];
  consultation_fee_min?: number;
  consultation_fee_max?: number;
  accepts_insurance?: boolean;
  insurance_providers_accepted?: string[];
  telemedicine_available?: boolean;
  home_visits_available?: boolean;
  typical_wait_time?: string;
  appointment_types?: string[];
  availability_schedule?: Record<string, { available: boolean; hours: string[] }>;
  professional_references?: Array<{
    name: string;
    title: string;
    institution: string;
    phone: string;
    email: string;
  }>;
  years_experience?: number;
}

export interface MapProvider {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  location: LatLngTuple;
  rating?: number;
  distance?: number;
  provider_type?: HealthcareProviderType;
}
