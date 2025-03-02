
import type { LatLngTuple } from "leaflet";
import { HealthcareProviderType } from "./healthcare";

export interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  bio?: string;
  avatar_url?: string;
  expertise?: string[];
  provider_type?: HealthcareProviderType;
  location: {
    latitude: number;
    longitude: number;
  };
  consultation_fee?: number;
  default_service_id?: string;
  rating?: number;
  distance?: number;
}

export interface MapProvider {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  location: LatLngTuple;
  rating?: number;
  distance?: number;
}
