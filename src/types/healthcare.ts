
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

export type SpecialtyType = 
  | 'General Practice'
  | 'Cardiology'
  | 'Neurology'
  | 'Pediatrics'
  | 'Orthopedics'
  | 'Dermatology'
  | 'Gynecology'
  | 'Oncology'
  | 'Psychiatry'
  | 'Ophthalmology'
  | 'Family Medicine'
  | 'Internal Medicine'
  | 'Emergency Medicine'
  | 'Radiology'
  | 'Anesthesiology'
  | 'Urology'
  | 'General Dentistry'
  | 'Orthodontics';

// Convert from type to enum so we can use it as a value
export enum InsuranceProvider {
  MEDICARE = 'Medicare',
  MEDICAID = 'Medicaid',
  BLUE_CROSS = 'Blue Cross',
  CIGNA = 'Cigna',
  UNITED_HEALTHCARE = 'UnitedHealthcare',
  AETNA = 'Aetna',
  HUMANA = 'Humana',
  KAISER_PERMANENTE = 'Kaiser Permanente',
  TRICARE = 'TRICARE',
  OTHER = 'Other',
  NONE = 'None'
}
