import { AppointmentTypes } from './appointments';
import { Database as GeneratedDatabase } from '../types';

export type Database = GeneratedDatabase;

export type { AppointmentTypes };

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];