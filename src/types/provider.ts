import type { LatLngTuple } from "leaflet";

export interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  bio?: string;
  avatar_url?: string;
  expertise?: string[];
  location: {
    latitude: number;
    longitude: number;
  };
  consultation_fee?: number;
  default_service_id?: string;
}

export interface MapProvider {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  location: LatLngTuple;
  rating?: number;
}