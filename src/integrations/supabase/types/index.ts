import { Database as GeneratedDatabase } from './generated';

export type Database = GeneratedDatabase;

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

export type UserRole = Database['public']['Enums']['user_role'];
export type Appointment = Tables<'appointments'>;