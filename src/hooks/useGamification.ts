import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge, UserBadge, Achievement, PREDEFINED_BADGES } from '@/types/gamification';

export function useGamification(userId: string | undefined) {
    const [badges, setBadges] = useState<UserBadge[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        fetchUserBadges();
        fetchAchievements();
    }, [userId]);

    const fetchUserBadges = async () => {
        if (!userId) return;

        try {
            const { data, error } = await supabase
                .from('user_badges')
                .select(`
                    *,
                    badge:badges(*)
                `)
                .eq('user_id', userId);

            if (error) throw error;

            if (data) {
                // Transform data to match UserBadge interface if needed
                // The query returns the joined badge data in the 'badge' property
                setBadges(data as unknown as UserBadge[]);
            }
        } catch (error) {
            console.error('Error fetching badges:', error);
        }
    };

    const fetchAchievements = async () => {
        if (!userId) return;

        try {
            const { data, error } = await supabase
                .from('achievements')
                .select('*')
                .eq('user_id', userId);

            if (error) throw error;

            if (data) {
                setAchievements(data as Achievement[]);
            }
        } catch (error) {
            console.error('Error fetching achievements:', error);
        } finally {
            setLoading(false);
        }
    };

    const awardBadge = async (badgeType: keyof typeof PREDEFINED_BADGES) => {
        if (!userId) return;

        const badgeInfo = PREDEFINED_BADGES[badgeType];

        try {
            // Get badge ID from database first (assuming names match or we have a mapping)
            // For simplicity, we'll query by name
            const { data: badgeData, error: badgeError } = await supabase
                .from('badges')
                .select('id')
                .eq('name', badgeInfo.name)
                .single();

            if (badgeError) throw badgeError;
            if (!badgeData) throw new Error('Badge not found');

            const { error } = await supabase
                .from('user_badges')
                .insert({
                    user_id: userId,
                    badge_id: badgeData.id
                });

            if (error) {
                // Ignore duplicate key error (already earned)
                if (error.code !== '23505') throw error;
                return;
            }

            // Show toast notification
            toast.success(`🏆 Badge Earned: ${badgeInfo.name}`, {
                description: badgeInfo.description
            });

            // Refresh badges
            fetchUserBadges();

        } catch (error) {
            console.error('Error awarding badge:', error);
        }
    };

    const updateAchievementProgress = async (
        achievementType: Achievement['achievement_type'],
        progress: number
    ) => {
        if (!userId) return;

        try {
            // Check if achievement exists
            const { data: existing } = await supabase
                .from('achievements')
                .select('*')
                .eq('user_id', userId)
                .eq('achievement_type', achievementType)
                .single();

            const target = existing?.target || 100; // Default target
            const completed = progress >= target;

            const { error } = await supabase
                .from('achievements')
                .upsert({
                    user_id: userId,
                    achievement_type: achievementType,
                    progress,
                    target,
                    completed,
                    completed_at: completed ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, achievement_type' });

            if (error) throw error;

            // Refresh achievements
            fetchAchievements();

        } catch (error) {
            console.error('Error updating achievement:', error);
        }
    };

    return {
        badges,
        achievements,
        loading,
        awardBadge,
        updateAchievementProgress
    };
}
