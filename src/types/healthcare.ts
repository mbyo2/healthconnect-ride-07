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

// Updated enum with Zambian insurance providers
export enum InsuranceProvider {
  // Global/International providers
  MEDICARE = 'Medicare',
  MEDICAID = 'Medicaid',
  BLUE_CROSS = 'Blue Cross',
  CIGNA = 'Cigna',
  UNITED_HEALTHCARE = 'UnitedHealthcare',
  AETNA = 'Aetna',
  HUMANA = 'Humana',
  KAISER_PERMANENTE = 'Kaiser Permanente',
  TRICARE = 'TRICARE',
  
  // Zambian insurance providers
  HOLLARD_HEALTH = 'Hollard Health',
  SANLAM = 'Sanlam Life Insurance',
  MADISON = 'Madison General Insurance',
  PROFESSIONAL_INSURANCE = 'Professional Insurance Corporation Zambia',
  UNITURTLE = 'Uniturtle Industries Ltd',
  SES_INTERNATIONAL = 'SES International Health',
  NHIMA = 'NHIMA',
  PRUDENTIAL = 'Prudential Life Assurance Zambia',
  
  // Other options
  OTHER = 'Other',
  NONE = 'None'
}
