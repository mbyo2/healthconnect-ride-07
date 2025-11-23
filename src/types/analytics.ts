// Analytics types for tracking user events and behavior

export interface UserEvent {
    id: string;
    user_id: string;
    event_type: EventType;
    event_data: Record<string, any>;
    created_at: string;
}

export type EventType =
    | 'page_view'
    | 'button_click'
    | 'form_submit'
    | 'onboarding_start'
    | 'onboarding_complete'
    | 'appointment_booked'
    | 'appointment_cancelled'
    | 'profile_updated'
    | 'search_performed'
    | 'feature_used'
    | 'error_occurred';

export interface PageViewEvent {
    page_path: string;
    page_title: string;
    referrer?: string;
    duration?: number;
}

export interface ButtonClickEvent {
    button_id: string;
    button_text: string;
    page_path: string;
}

export interface FormSubmitEvent {
    form_id: string;
    form_name: string;
    success: boolean;
    error_message?: string;
}

export interface OnboardingEvent {
    step: number;
    total_steps: number;
    role_selected?: string;
    completed: boolean;
}

export interface AnalyticsSummary {
    total_events: number;
    unique_users: number;
    page_views: number;
    conversions: number;
    average_session_duration: number;
    bounce_rate: number;
}

export interface UserJourney {
    user_id: string;
    events: UserEvent[];
    start_time: string;
    end_time?: string;
    completed_goals: string[];
}

export interface ConversionFunnel {
    step_name: string;
    users_entered: number;
    users_completed: number;
    conversion_rate: number;
    drop_off_rate: number;
}

// Analytics configuration
export const ANALYTICS_CONFIG = {
    TRACK_PAGE_VIEWS: true,
    TRACK_CLICKS: true,
    TRACK_FORMS: true,
    TRACK_ERRORS: true,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    BATCH_SIZE: 10,
    FLUSH_INTERVAL: 5000 // 5 seconds
} as const;
