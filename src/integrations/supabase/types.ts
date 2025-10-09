export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ai_diagnosis_history: {
        Row: {
          analysis: string | null
          created_at: string
          id: string
          patient_context: Json | null
          symptoms: string
          user_id: string
        }
        Insert: {
          analysis?: string | null
          created_at?: string
          id?: string
          patient_context?: Json | null
          symptoms: string
          user_id: string
        }
        Update: {
          analysis?: string | null
          created_at?: string
          id?: string
          patient_context?: Json | null
          symptoms?: string
          user_id?: string
        }
        Relationships: []
      }
      app_owner_wallet: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          created_at: string
          date: string
          duration: number | null
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
          duration?: number | null
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
          duration?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          provider_id?: string
          status?: string
          time?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      chat_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_url: string
          id: string
          message_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_url: string
          id?: string
          message_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_settings: {
        Row: {
          commission_percentage: number
          created_at: string
          entity_type: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          commission_percentage?: number
          created_at?: string
          entity_type: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          commission_percentage?: number
          created_at?: string
          entity_type?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      comprehensive_health_metrics: {
        Row: {
          created_at: string | null
          device_used: string | null
          id: string
          is_patient_entered: boolean | null
          metric_category: string
          metric_name: string
          notes: string | null
          recorded_at: string | null
          recorded_by: string | null
          reference_range_max: number | null
          reference_range_min: number | null
          status: string | null
          trend_direction: string | null
          unit: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          device_used?: string | null
          id?: string
          is_patient_entered?: boolean | null
          metric_category: string
          metric_name: string
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          status?: string | null
          trend_direction?: string | null
          unit: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          device_used?: string | null
          id?: string
          is_patient_entered?: boolean | null
          metric_category?: string
          metric_name?: string
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          status?: string | null
          trend_direction?: string | null
          unit?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      comprehensive_medical_records: {
        Row: {
          attachments: string[] | null
          clinical_data: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_private: boolean | null
          patient_id: string
          provider_id: string | null
          record_type: string
          severity_level: string | null
          status: string | null
          title: string
          updated_at: string | null
          visit_date: string
        }
        Insert: {
          attachments?: string[] | null
          clinical_data?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          patient_id: string
          provider_id?: string | null
          record_type: string
          severity_level?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          visit_date: string
        }
        Update: {
          attachments?: string[] | null
          clinical_data?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          patient_id?: string
          provider_id?: string | null
          record_type?: string
          severity_level?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          visit_date?: string
        }
        Relationships: []
      }
      comprehensive_prescriptions: {
        Row: {
          created_at: string | null
          digital_signature: string | null
          dosage: string
          duration_days: number | null
          expiry_date: string | null
          generic_name: string | null
          id: string
          indication: string | null
          instructions: string
          is_controlled_substance: boolean | null
          medication_name: string
          notes: string | null
          patient_id: string
          pharmacy_id: string | null
          prescribed_date: string
          prescription_number: string | null
          provider_id: string
          quantity: number
          refills_remaining: number | null
          status: string | null
          strength: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          digital_signature?: string | null
          dosage: string
          duration_days?: number | null
          expiry_date?: string | null
          generic_name?: string | null
          id?: string
          indication?: string | null
          instructions: string
          is_controlled_substance?: boolean | null
          medication_name: string
          notes?: string | null
          patient_id: string
          pharmacy_id?: string | null
          prescribed_date?: string
          prescription_number?: string | null
          provider_id: string
          quantity: number
          refills_remaining?: number | null
          status?: string | null
          strength?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          digital_signature?: string | null
          dosage?: string
          duration_days?: number | null
          expiry_date?: string | null
          generic_name?: string | null
          id?: string
          indication?: string | null
          instructions?: string
          is_controlled_substance?: boolean | null
          medication_name?: string
          notes?: string | null
          patient_id?: string
          pharmacy_id?: string | null
          prescribed_date?: string
          prescription_number?: string | null
          provider_id?: string
          quantity?: number
          refills_remaining?: number | null
          status?: string | null
          strength?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comprehensive_prescriptions_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "healthcare_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tracking: {
        Row: {
          created_at: string | null
          delivery_time: string | null
          driver_id: string | null
          id: string
          order_id: string
          pickup_time: string | null
          status: string
          tracking_notes: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_time?: string | null
          driver_id?: string | null
          id?: string
          order_id: string
          pickup_time?: string | null
          status?: string
          tracking_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_time?: string | null
          driver_id?: string | null
          id?: string
          order_id?: string
          pickup_time?: string | null
          status?: string
          tracking_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          coordinates: Json
          created_at: string
          delivery_fee: number
          id: string
          is_active: boolean
          max_delivery_time: number
          pharmacy_id: string
          restrictions: string[] | null
          zone_name: string
        }
        Insert: {
          coordinates: Json
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean
          max_delivery_time?: number
          pharmacy_id: string
          restrictions?: string[] | null
          zone_name: string
        }
        Update: {
          coordinates?: Json
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean
          max_delivery_time?: number
          pharmacy_id?: string
          restrictions?: string[] | null
          zone_name?: string
        }
        Relationships: []
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
      emergency_events: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          message: string | null
          patient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          patient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          patient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      emergency_protocols: {
        Row: {
          condition_description: string
          created_at: string | null
          emergency_contact_ids: string[] | null
          emergency_instructions: string
          emergency_medications: string[] | null
          healthcare_provider_contact: string | null
          id: string
          is_active: boolean | null
          medications_to_avoid: string[] | null
          patient_id: string
          priority_level: number | null
          protocol_type: string
          special_considerations: string | null
          updated_at: string | null
        }
        Insert: {
          condition_description: string
          created_at?: string | null
          emergency_contact_ids?: string[] | null
          emergency_instructions: string
          emergency_medications?: string[] | null
          healthcare_provider_contact?: string | null
          id?: string
          is_active?: boolean | null
          medications_to_avoid?: string[] | null
          patient_id: string
          priority_level?: number | null
          protocol_type: string
          special_considerations?: string | null
          updated_at?: string | null
        }
        Update: {
          condition_description?: string
          created_at?: string | null
          emergency_contact_ids?: string[] | null
          emergency_instructions?: string
          emergency_medications?: string[] | null
          healthcare_provider_contact?: string | null
          id?: string
          is_active?: boolean | null
          medications_to_avoid?: string[] | null
          patient_id?: string
          priority_level?: number | null
          protocol_type?: string
          special_considerations?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          experience_level: Database["public"]["Enums"]["experience_level"]
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
          experience_level?: Database["public"]["Enums"]["experience_level"]
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
          experience_level?: Database["public"]["Enums"]["experience_level"]
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
      healthcare_institutions: {
        Row: {
          address: string | null
          admin_id: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          is_verified: boolean | null
          license_number: string | null
          name: string
          operating_hours: Json | null
          phone: string | null
          postal_code: string | null
          state: string | null
          type: Database["public"]["Enums"]["healthcare_provider_type"]
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          admin_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          license_number?: string | null
          name: string
          operating_hours?: Json | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          type: Database["public"]["Enums"]["healthcare_provider_type"]
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          admin_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          license_number?: string | null
          name?: string
          operating_hours?: Json | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          type?: Database["public"]["Enums"]["healthcare_provider_type"]
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
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
      institution_locations: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string | null
          is_primary: boolean | null
          latitude: number
          longitude: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_primary?: boolean | null
          latitude: number
          longitude: number
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_primary?: boolean | null
          latitude?: number
          longitude?: number
        }
        Relationships: [
          {
            foreignKeyName: "institution_locations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "healthcare_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_services: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          institution_id: string | null
          is_available: boolean | null
          name: string
          price: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          institution_id?: string | null
          is_available?: boolean | null
          name: string
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          institution_id?: string | null
          is_available?: boolean | null
          name?: string
          price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_services_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "healthcare_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_staff: {
        Row: {
          created_at: string | null
          department: string | null
          end_date: string | null
          id: string
          institution_id: string | null
          is_active: boolean | null
          provider_id: string | null
          role: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          end_date?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          provider_id?: string | null
          role: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          end_date?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          provider_id?: string | null
          role?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_staff_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "healthcare_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_staff_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          institution_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          institution_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          institution_id?: string
          updated_at?: string
        }
        Relationships: []
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
      insurance_verifications: {
        Row: {
          copay_amount: number | null
          coverage_details: Json | null
          coverage_percentage: number | null
          created_at: string | null
          deductible_remaining: number | null
          expiry_date: string | null
          id: string
          insurance_info_id: string | null
          patient_id: string
          pre_authorization_required: boolean | null
          updated_at: string | null
          verification_date: string | null
          verification_notes: string | null
          verification_status: string | null
          verified_by: string | null
        }
        Insert: {
          copay_amount?: number | null
          coverage_details?: Json | null
          coverage_percentage?: number | null
          created_at?: string | null
          deductible_remaining?: number | null
          expiry_date?: string | null
          id?: string
          insurance_info_id?: string | null
          patient_id: string
          pre_authorization_required?: boolean | null
          updated_at?: string | null
          verification_date?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_by?: string | null
        }
        Update: {
          copay_amount?: number | null
          coverage_details?: Json | null
          coverage_percentage?: number | null
          created_at?: string | null
          deductible_remaining?: number | null
          expiry_date?: string | null
          id?: string
          insurance_info_id?: string | null
          patient_id?: string
          pre_authorization_required?: boolean | null
          updated_at?: string | null
          verification_date?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_verifications_insurance_info_id_fkey"
            columns: ["insurance_info_id"]
            isOneToOne: false
            referencedRelation: "insurance_information"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          invoice_number: string | null
          medication_inventory_id: string
          notes: string | null
          performed_by: string | null
          prescription_id: string | null
          quantity: number
          supplier: string | null
          transaction_date: string
          transaction_type: string
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_number?: string | null
          medication_inventory_id: string
          notes?: string | null
          performed_by?: string | null
          prescription_id?: string | null
          quantity: number
          supplier?: string | null
          transaction_date?: string
          transaction_type: string
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          invoice_number?: string | null
          medication_inventory_id?: string
          notes?: string | null
          performed_by?: string | null
          prescription_id?: string | null
          quantity?: number
          supplier?: string | null
          transaction_date?: string
          transaction_type?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_medication_inventory_id_fkey"
            columns: ["medication_inventory_id"]
            isOneToOne: false
            referencedRelation: "medication_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
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
      location_updates: {
        Row: {
          delivery_id: string
          id: string
          latitude: number
          longitude: number
          notes: string | null
          timestamp: string | null
        }
        Insert: {
          delivery_id: string
          id?: string
          latitude: number
          longitude: number
          notes?: string | null
          timestamp?: string | null
        }
        Update: {
          delivery_id?: string
          id?: string
          latitude?: number
          longitude?: number
          notes?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_updates_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "delivery_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          can_be_delivered: boolean
          category: string
          created_at: string | null
          description: string | null
          dosage: string
          generic_name: string | null
          id: string
          image_url: string | null
          is_active: boolean
          manufacturer: string | null
          medication_name: string
          pharmacy_id: string
          price: number
          requires_prescription: boolean
          stock_quantity: number
          updated_at: string | null
        }
        Insert: {
          can_be_delivered?: boolean
          category: string
          created_at?: string | null
          description?: string | null
          dosage: string
          generic_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          manufacturer?: string | null
          medication_name: string
          pharmacy_id: string
          price: number
          requires_prescription?: boolean
          stock_quantity?: number
          updated_at?: string | null
        }
        Update: {
          can_be_delivered?: boolean
          category?: string
          created_at?: string | null
          description?: string | null
          dosage?: string
          generic_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          manufacturer?: string | null
          medication_name?: string
          pharmacy_id?: string
          price?: number
          requires_prescription?: boolean
          stock_quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_products_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "healthcare_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_sales: {
        Row: {
          app_owner_commission: number
          created_at: string | null
          id: string
          order_id: string
          patient_id: string
          pharmacy_commission: number
          pharmacy_id: string
          processed_at: string | null
          total_amount: number
        }
        Insert: {
          app_owner_commission: number
          created_at?: string | null
          id?: string
          order_id: string
          patient_id: string
          pharmacy_commission: number
          pharmacy_id: string
          processed_at?: string | null
          total_amount: number
        }
        Update: {
          app_owner_commission?: number
          created_at?: string | null
          id?: string
          order_id?: string
          patient_id?: string
          pharmacy_commission?: number
          pharmacy_id?: string
          processed_at?: string | null
          total_amount?: number
        }
        Relationships: []
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
      medication_inventory: {
        Row: {
          batch_number: string | null
          created_at: string
          dosage: string
          expiry_date: string
          generic_name: string | null
          id: string
          institution_id: string
          manufacturer: string | null
          medication_name: string
          medication_type: Database["public"]["Enums"]["medication_type"]
          minimum_stock_level: number | null
          quantity_available: number
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          dosage: string
          expiry_date: string
          generic_name?: string | null
          id?: string
          institution_id: string
          manufacturer?: string | null
          medication_name: string
          medication_type: Database["public"]["Enums"]["medication_type"]
          minimum_stock_level?: number | null
          quantity_available?: number
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          dosage?: string
          expiry_date?: string
          generic_name?: string | null
          id?: string
          institution_id?: string
          manufacturer?: string | null
          medication_name?: string
          medication_type?: Database["public"]["Enums"]["medication_type"]
          minimum_stock_level?: number | null
          quantity_available?: number
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_inventory_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "healthcare_institutions"
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
      mobile_money_payments: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          external_transaction_id: string | null
          failure_reason: string | null
          id: string
          initiated_at: string
          payment_id: string | null
          phone_number: string
          provider: string
          status: string
          transaction_reference: string | null
          webhook_data: Json | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          external_transaction_id?: string | null
          failure_reason?: string | null
          id?: string
          initiated_at?: string
          payment_id?: string | null
          phone_number: string
          provider: string
          status?: string
          transaction_reference?: string | null
          webhook_data?: Json | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          external_transaction_id?: string | null
          failure_reason?: string | null
          id?: string
          initiated_at?: string
          payment_id?: string | null
          phone_number?: string
          provider?: string
          status?: string
          transaction_reference?: string | null
          webhook_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_money_payments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          appointment_reminders: boolean | null
          created_at: string | null
          email_notifications: boolean | null
          id: string
          message_alerts: boolean | null
          push_notifications: boolean | null
          system_updates: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appointment_reminders?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          message_alerts?: boolean | null
          push_notifications?: boolean | null
          system_updates?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appointment_reminders?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          message_alerts?: boolean | null
          push_notifications?: boolean | null
          system_updates?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_delivery_time: string | null
          created_at: string | null
          delivery_address: string
          delivery_instructions: string | null
          delivery_phone: string
          estimated_delivery_time: string | null
          id: string
          patient_id: string
          pharmacy_id: string | null
          prescription_id: string | null
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          actual_delivery_time?: string | null
          created_at?: string | null
          delivery_address: string
          delivery_instructions?: string | null
          delivery_phone: string
          estimated_delivery_time?: string | null
          id?: string
          patient_id: string
          pharmacy_id?: string | null
          prescription_id?: string | null
          status?: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          actual_delivery_time?: string | null
          created_at?: string | null
          delivery_address?: string
          delivery_instructions?: string | null
          delivery_phone?: string
          estimated_delivery_time?: string | null
          id?: string
          patient_id?: string
          pharmacy_id?: string | null
          prescription_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "healthcare_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
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
      payment_splits: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_id: string
          percentage: number
          processed_at: string | null
          recipient_id: string
          recipient_type: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_id: string
          percentage: number
          processed_at?: string | null
          recipient_id: string
          recipient_type: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_id?: string
          percentage?: number
          processed_at?: string | null
          recipient_id?: string
          recipient_type?: string
          status?: string
        }
        Relationships: []
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
      pharmacy_hours: {
        Row: {
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_24_hours: boolean
          is_closed: boolean
          open_time: string
          pharmacy_id: string
        }
        Insert: {
          close_time: string
          created_at?: string
          day_of_week: number
          id?: string
          is_24_hours?: boolean
          is_closed?: boolean
          open_time: string
          pharmacy_id: string
        }
        Update: {
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_24_hours?: boolean
          is_closed?: boolean
          open_time?: string
          pharmacy_id?: string
        }
        Relationships: []
      }
      pharmacy_staff: {
        Row: {
          created_at: string
          hire_date: string
          id: string
          is_active: boolean
          pharmacy_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hire_date?: string
          id?: string
          is_active?: boolean
          pharmacy_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hire_date?: string
          id?: string
          is_active?: boolean
          pharmacy_id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
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
      primary_provider_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          patient_id: string
          provider_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          provider_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          provider_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_insurances: string[] | null
          address: string | null
          admin_level: Database["public"]["Enums"]["admin_level"] | null
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
          provider_type:
            | Database["public"]["Enums"]["healthcare_provider_type"]
            | null
          role: Database["public"]["Enums"]["user_role"]
          specialty: string | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          accepted_insurances?: string[] | null
          address?: string | null
          admin_level?: Database["public"]["Enums"]["admin_level"] | null
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
          provider_type?:
            | Database["public"]["Enums"]["healthcare_provider_type"]
            | null
          role?: Database["public"]["Enums"]["user_role"]
          specialty?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          accepted_insurances?: string[] | null
          address?: string | null
          admin_level?: Database["public"]["Enums"]["admin_level"] | null
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
          provider_type?:
            | Database["public"]["Enums"]["healthcare_provider_type"]
            | null
          role?: Database["public"]["Enums"]["user_role"]
          specialty?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          break_end: string | null
          break_start: string | null
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_recurring: boolean | null
          provider_id: string
          specific_date: string | null
          start_time: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_recurring?: boolean | null
          provider_id: string
          specific_date?: string | null
          start_time: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          provider_id?: string
          specific_date?: string | null
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
      provider_locations: {
        Row: {
          created_at: string | null
          id: string
          latitude: number
          longitude: number
          provider_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          latitude: number
          longitude: number
          provider_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_locations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          subscription: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          subscription: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          subscription?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_id: string
          reason: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_id: string
          reason: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_id?: string
          reason?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          min_experience_level: Database["public"]["Enums"]["experience_level"]
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          min_experience_level?: Database["public"]["Enums"]["experience_level"]
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          min_experience_level?: Database["public"]["Enums"]["experience_level"]
          name?: string
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          cost: number | null
          created_at: string
          id: string
          message: string
          patient_id: string | null
          phone: string
          provider: string | null
          response_data: Json | null
          status: string
          type: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          id?: string
          message: string
          patient_id?: string | null
          phone: string
          provider?: string | null
          response_data?: Json | null
          status?: string
          type: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          id?: string
          message?: string
          patient_id?: string | null
          phone?: string
          provider?: string | null
          response_data?: Json | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          institution_id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          institution_id: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "healthcare_institutions"
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
      user_connections: {
        Row: {
          approved_at: string | null
          connection_type: string
          created_at: string | null
          id: string
          notes: string | null
          patient_id: string
          provider_id: string
          requested_at: string | null
          requested_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          connection_type?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          provider_id: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          connection_type?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          provider_id?: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_two_factor: {
        Row: {
          backup_codes: string[]
          created_at: string | null
          enabled: boolean | null
          id: string
          secret: string
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes: string[]
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          secret: string
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes?: string[]
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          secret?: string
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string
          description: string | null
          id: string
          payment_id: string | null
          transaction_type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          payment_id?: string | null
          transaction_type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          payment_id?: string | null
          transaction_type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_perform_service: {
        Args: { provider_id: string; service_category_id: string }
        Returns: boolean
      }
      delete_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_current_user_admin_level: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["admin_level"]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_diagnosis_by_id: {
        Args: { diagnosis_id: string }
        Returns: {
          analysis: string | null
          created_at: string
          id: string
          patient_context: Json | null
          symptoms: string
          user_id: string
        }
      }
      get_my_diagnosis_history: {
        Args: Record<PropertyKey, never>
        Returns: {
          analysis: string | null
          created_at: string
          id: string
          patient_context: Json | null
          symptoms: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_applications_for_doctors: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      is_institution_admin: {
        Args: { institution_id: string }
        Returns: boolean
      }
      is_institution_staff: {
        Args: { institution_id: string; user_id: string }
        Returns: boolean
      }
      is_institution_staff_member: {
        Args: { institution_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      process_payment_with_splits: {
        Args:
          | {
              p_institution_id?: string
              p_payment_id: string
              p_payment_type?: string
              p_provider_id: string
              p_total_amount: number
            }
          | {
              p_institution_id?: string
              p_payment_id: string
              p_provider_id: string
              p_total_amount: number
            }
        Returns: Json
      }
      process_wallet_transaction: {
        Args: {
          p_amount: number
          p_description?: string
          p_payment_id?: string
          p_transaction_type: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      admin_level: "admin" | "superadmin"
      app_role: "patient" | "health_personnel" | "admin" | "institution_admin"
      experience_level: "entry" | "intermediate" | "expert"
      healthcare_provider_type:
        | "doctor"
        | "nurse"
        | "hospital"
        | "clinic"
        | "pharmacy"
        | "nursing_home"
        | "dentist"
      medication_type:
        | "tablet"
        | "capsule"
        | "liquid"
        | "injection"
        | "cream"
        | "ointment"
        | "drops"
        | "inhaler"
        | "powder"
        | "other"
      user_role: "admin" | "health_personnel" | "patient"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_level: ["admin", "superadmin"],
      app_role: ["patient", "health_personnel", "admin", "institution_admin"],
      experience_level: ["entry", "intermediate", "expert"],
      healthcare_provider_type: [
        "doctor",
        "nurse",
        "hospital",
        "clinic",
        "pharmacy",
        "nursing_home",
        "dentist",
      ],
      medication_type: [
        "tablet",
        "capsule",
        "liquid",
        "injection",
        "cream",
        "ointment",
        "drops",
        "inhaler",
        "powder",
        "other",
      ],
      user_role: ["admin", "health_personnel", "patient"],
    },
  },
} as const
