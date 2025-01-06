export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          patient_id: string
          provider_id: string
          status: string
          time: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          patient_id: string
          provider_id: string
          status?: string
          time: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          patient_id?: string
          provider_id?: string
          status?: string
          time?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_records: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          paid_date: string | null
          patient_id: string
          payment_method: string | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          paid_date?: string | null
          patient_id: string
          payment_method?: string | null
          status: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          paid_date?: string | null
          patient_id?: string
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_signatures: {
        Row: {
          created_at: string | null
          document_type: string
          id: string
          provider_id: string
          signature_data: string
        }
        Insert: {
          created_at?: string | null
          document_type: string
          id?: string
          provider_id: string
          signature_data: string
        }
        Update: {
          created_at?: string | null
          document_type?: string
          id?: string
          provider_id?: string
          signature_data?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_signatures_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          patient_id: string
          phone: string
          relationship: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          patient_id: string
          phone: string
          relationship: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          patient_id?: string
          phone?: string
          relationship?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string | null
          id: string
          is_dependent: boolean | null
          member_profile_id: string
          primary_user_id: string
          relationship: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_dependent?: boolean | null
          member_profile_id: string
          primary_user_id: string
          relationship: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_dependent?: boolean | null
          member_profile_id?: string
          primary_user_id?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_member_profile_id_fkey"
            columns: ["member_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_primary_user_id_fkey"
            columns: ["primary_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_articles: {
        Row: {
          author_id: string | null
          category: string
          content: string
          id: string
          published_at: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          category: string
          content: string
          id?: string
          published_at?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          id?: string
          published_at?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_metrics: {
        Row: {
          id: string
          metric_type: string
          notes: string | null
          recorded_at: string | null
          unit: string
          user_id: string
          value: number
        }
        Insert: {
          id?: string
          metric_type: string
          notes?: string | null
          recorded_at?: string | null
          unit: string
          user_id: string
          value: number
        }
        Update: {
          id?: string
          metric_type?: string
          notes?: string | null
          recorded_at?: string | null
          unit?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_personnel_applications: {
        Row: {
          created_at: string | null
          documents_url: string[] | null
          id: string
          license_number: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string
          status: string
          updated_at: string | null
          user_id: string | null
          years_of_experience: number
        }
        Insert: {
          created_at?: string | null
          documents_url?: string[] | null
          id?: string
          license_number: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
          years_of_experience: number
        }
        Update: {
          created_at?: string | null
          documents_url?: string[] | null
          id?: string
          license_number?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
          years_of_experience?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_personnel_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_personnel_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      healthcare_services: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          is_available: boolean | null
          name: string
          price: number
          provider_id: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_available?: boolean | null
          name: string
          price: number
          provider_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_available?: boolean | null
          name?: string
          price?: number
          provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "healthcare_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_information: {
        Row: {
          coverage_end_date: string | null
          coverage_start_date: string
          created_at: string | null
          group_number: string | null
          id: string
          patient_id: string
          policy_number: string
          provider_name: string
          updated_at: string | null
        }
        Insert: {
          coverage_end_date?: string | null
          coverage_start_date: string
          created_at?: string | null
          group_number?: string | null
          id?: string
          patient_id: string
          policy_number: string
          provider_name: string
          updated_at?: string | null
        }
        Update: {
          coverage_end_date?: string | null
          coverage_start_date?: string
          created_at?: string | null
          group_number?: string | null
          id?: string
          patient_id?: string
          policy_number?: string
          provider_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_information_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          created_at: string | null
          document_url: string | null
          id: string
          notes: string | null
          patient_id: string
          reference_range: string | null
          result_value: string
          test_date: string
          test_name: string
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          document_url?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          reference_range?: string | null
          result_value: string
          test_date: string
          test_name: string
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          document_url?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          reference_range?: string | null
          result_value?: string
          test_date?: string
          test_name?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          id: string
          patient_id: string
          record_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          patient_id: string
          record_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          patient_id?: string
          record_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_reminders: {
        Row: {
          active: boolean | null
          created_at: string | null
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          medication_name: string
          reminder_time: string[]
          start_date: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          medication_name: string
          reminder_time: string[]
          start_date: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          medication_name?: string
          reminder_time?: string[]
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read: boolean | null
          receiver_id: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          receiver_id: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_queue: {
        Row: {
          check_in_time: string | null
          created_at: string | null
          estimated_duration: number | null
          id: string
          notes: string | null
          patient_id: string
          priority: number | null
          provider_id: string
          status: string
        }
        Insert: {
          check_in_time?: string | null
          created_at?: string | null
          estimated_duration?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          priority?: number | null
          provider_id: string
          status: string
        }
        Update: {
          check_in_time?: string | null
          created_at?: string | null
          estimated_duration?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          priority?: number | null
          provider_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_queue_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_queue_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          invoice_number: string | null
          patient_id: string
          payment_date: string | null
          payment_method: string | null
          provider_id: string
          service_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          patient_id: string
          payment_date?: string | null
          payment_method?: string | null
          provider_id: string
          service_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          patient_id?: string
          payment_date?: string | null
          payment_method?: string | null
          provider_id?: string
          service_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "healthcare_services"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string | null
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          medication_name: string
          notes: string | null
          patient_id: string
          prescribed_by: string
          prescribed_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          medication_name: string
          notes?: string | null
          patient_id: string
          prescribed_by: string
          prescribed_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          medication_name?: string
          notes?: string | null
          patient_id?: string
          prescribed_by?: string
          prescribed_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          is_profile_complete: boolean | null
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id: string
          is_profile_complete?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          is_profile_complete?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          provider_id: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          provider_id: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          provider_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      symptoms_diary: {
        Row: {
          created_at: string | null
          date: string
          id: string
          notes: string | null
          patient_id: string
          severity: string
          symptoms: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          patient_id: string
          severity: string
          symptoms: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          patient_id?: string
          severity?: string
          symptoms?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "symptoms_diary_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccination_records: {
        Row: {
          administered_by: string | null
          administered_date: string
          batch_number: string | null
          created_at: string | null
          dose_number: number
          id: string
          next_due_date: string | null
          notes: string | null
          patient_id: string
          vaccine_name: string
        }
        Insert: {
          administered_by?: string | null
          administered_date: string
          batch_number?: string | null
          created_at?: string | null
          dose_number: number
          id?: string
          next_due_date?: string | null
          notes?: string | null
          patient_id: string
          vaccine_name: string
        }
        Update: {
          administered_by?: string | null
          administered_date?: string
          batch_number?: string | null
          created_at?: string | null
          dose_number?: number
          id?: string
          next_due_date?: string | null
          notes?: string | null
          patient_id?: string
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_consultations: {
        Row: {
          created_at: string | null
          id: string
          meeting_url: string | null
          notes: string | null
          patient_id: string
          provider_id: string
          scheduled_end: string
          scheduled_start: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          meeting_url?: string | null
          notes?: string | null
          patient_id: string
          provider_id: string
          scheduled_end: string
          scheduled_start: string
          status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          meeting_url?: string | null
          notes?: string | null
          patient_id?: string
          provider_id?: string
          scheduled_end?: string
          scheduled_start?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_consultations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      insert_applications_for_doctors: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      user_role: "admin" | "health_personnel" | "patient"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
