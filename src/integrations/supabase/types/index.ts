import { Database } from './database';

export type Tables = Database['public']['Tables'];
export type UserRole = 'admin' | 'health_personnel' | 'patient';

export interface Profile extends Tables['profiles']['Row'] {
  role: UserRole;
}

export * from './communication';
export * from './generated';