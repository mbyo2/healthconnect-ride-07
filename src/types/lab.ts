
export type LabTestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type LabTestPriority = 'routine' | 'urgent' | 'stat';

export interface LabTest {
    id: string;
    name: string;
    code: string;
    category: string;
    price: number;
    turnaround_time_hours: number;
    description?: string;
}

export interface LabRequest {
    id: string;
    patient_id: string;
    provider_id: string;
    test_id: string;
    status: LabTestStatus;
    priority: LabTestPriority;
    notes?: string;
    created_at: string;
    updated_at: string;
    // Joined fields
    patient?: {
        first_name: string;
        last_name: string;
        avatar_url?: string;
    };
    test?: LabTest;
    provider?: {
        first_name: string;
        last_name: string;
    };
}

export interface LabResult {
    id: string;
    request_id: string;
    test_id: string;
    patient_id: string;
    technician_id: string;
    result_value: string;
    unit?: string;
    reference_range?: string;
    is_abnormal: boolean;
    comments?: string;
    verified_at?: string;
    created_at: string;
}
