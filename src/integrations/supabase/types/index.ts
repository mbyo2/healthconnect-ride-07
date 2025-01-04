import { Database as GeneratedDatabase } from './generated';
import { AppointmentTypes } from './appointments';

export interface Database extends GeneratedDatabase {
  public: {
    Tables: {
      appointments: AppointmentTypes;
    } & GeneratedDatabase['public']['Tables'];
    Views: GeneratedDatabase['public']['Views'];
    Functions: GeneratedDatabase['public']['Functions'];
    Enums: GeneratedDatabase['public']['Enums'];
    CompositeTypes: GeneratedDatabase['public']['CompositeTypes'];
  };
}

export type { AppointmentTypes };