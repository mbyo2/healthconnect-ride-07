export interface SearchFilters {
  specialty?: string;
  availability?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number;
  distance?: number;
  serviceTypes?: string[];
}

export interface HealthcareService {
  id: string;
  name: string;
  description?: string;
  provider_id: string;
  category: string;
  price: number;
  duration?: number;
  is_available: boolean;
}