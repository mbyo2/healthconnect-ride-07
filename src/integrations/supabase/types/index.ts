import { Database } from './database';

export type Tables = Database['public']['Tables'];
export type UserRole = Database['public']['Enums']['user_role'];

export interface Profile extends Tables['profiles']['Row'] {
  role: UserRole;
}

export * from './communication';
export * from './generated';