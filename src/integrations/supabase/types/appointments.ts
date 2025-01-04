export interface AppointmentTypes {
  Row: {
    id: string;
    patient_id: string;
    provider_id: string;
    date: string;
    time: string;
    status: 'scheduled' | 'cancelled' | 'completed';
    type: string;
    notes?: string;
    created_at: string;
    updated_at: string;
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
  Relationships: [
    {
      foreignKeyName: "appointments_patient_id_fkey";
      columns: ["patient_id"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "appointments_provider_id_fkey";
      columns: ["provider_id"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    }
  ];
}