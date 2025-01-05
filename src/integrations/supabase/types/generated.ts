export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          provider_id: string;
          date: string;
          time: string;
          status: 'scheduled' | 'cancelled' | 'completed';
          type: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          provider_id: string;
          date: string;
          time: string;
          status?: 'scheduled' | 'cancelled' | 'completed';
          type: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          provider_id?: string;
          date?: string;
          time?: string;
          status?: 'scheduled' | 'cancelled' | 'completed';
          type?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      provider_availability: {
        Row: {
          id: string;
          provider_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at?: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          created_at?: string;
        };
      };
      medical_records: {
        Row: {
          id: string;
          patient_id: string;
          record_type: string;
          description: string;
          date: string;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          record_type: string;
          description: string;
          date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          record_type?: string;
          description?: string;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      prescriptions: {
        Row: {
          id: string;
          patient_id: string;
          prescribed_by: string;
          medication_name: string;
          dosage: string;
          frequency: string;
          duration: string;
          notes?: string;
          prescribed_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          prescribed_by: string;
          medication_name: string;
          dosage: string;
          frequency: string;
          duration: string;
          notes?: string;
          prescribed_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          prescribed_by?: string;
          medication_name?: string;
          dosage?: string;
          frequency?: string;
          duration?: string;
          notes?: string;
          prescribed_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string;
          specialty?: string;
          bio?: string;
          avatar_url?: string;
          role: 'admin' | 'health_personnel' | 'patient';
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string;
          specialty?: string;
          bio?: string;
          avatar_url?: string;
          role?: 'admin' | 'health_personnel' | 'patient';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string;
          specialty?: string;
          bio?: string;
          avatar_url?: string;
          role?: 'admin' | 'health_personnel' | 'patient';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: "admin" | "health_personnel" | "patient";
    };
  };
};