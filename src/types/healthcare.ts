export type HealthcareProviderType = 
  | 'doctor'
  | 'nurse'
  | 'hospital'
  | 'clinic'
  | 'pharmacy'
  | 'nursing_home'
  | 'dentist';

export interface HealthcareLocation {
  id: string;
  name: string;
  type: HealthcareProviderType;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  services?: string[];
  operating_hours?: {
    [key: string]: string;
  };
}