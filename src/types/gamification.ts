// Gamification types for badges, achievements, and user progress

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon_url?: string;
    category: 'onboarding' | 'health' | 'social' | 'achievement' | 'milestone';
    created_at: string;
}

export interface UserBadge {
    id: string;
    user_id: string;
    badge_id: string;
    earned_at: string;
    badge?: Badge;
}

export interface Achievement {
    id: string;
    user_id: string;
    achievement_type: 'first_login' | 'profile_complete' | 'first_appointment' | 'health_streak' | 'community_helper';
    progress: number;
    target: number;
    completed: boolean;
    completed_at?: string;
    created_at: string;
}

export interface UserStreak {
    user_id: string;
    current_streak: number;
    longest_streak: number;
    last_activity: string;
}

export interface GamificationStats {
    total_badges: number;
    total_achievements: number;
    current_streak: number;
    level: number;
    points: number;
}

// Badge categories for organization
export const BADGE_CATEGORIES = {
    ONBOARDING: 'onboarding',
    HEALTH: 'health',
    SOCIAL: 'social',
    ACHIEVEMENT: 'achievement',
    MILESTONE: 'milestone'
} as const;

// Predefined badges
export const PREDEFINED_BADGES = {
    NEWCOMER: {
        name: 'Newcomer',
        description: 'Completed your profile setup',
        category: 'onboarding' as const
    },
    FIRST_APPOINTMENT: {
        name: 'First Step',
        description: 'Booked your first appointment',
        category: 'health' as const
    },
    HEALTH_CHAMPION: {
        name: 'Health Champion',
        description: 'Logged health data for 7 consecutive days',
        category: 'achievement' as const
    },
    COMMUNITY_STAR: {
        name: 'Community Star',
        description: 'Helped 5 community members',
        category: 'social' as const
    },
    MILESTONE_100: {
        name: 'Century',
        description: 'Completed 100 health activities',
        category: 'milestone' as const
    }
} as const;
