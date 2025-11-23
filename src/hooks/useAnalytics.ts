import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EventType, PageViewEvent, ButtonClickEvent, FormSubmitEvent } from '@/types/analytics';

export function useAnalytics(userId: string | undefined) {

    const trackEvent = useCallback(async (
        eventType: EventType,
        eventData: Record<string, any>
    ) => {
        if (!userId) return;

        try {
            const { error } = await supabase
                .from('user_events' as any)
                .insert({
                    user_id: userId,
                    event_type: eventType,
                    event_data: eventData
                });

            if (error) {
                console.error('Error tracking event:', error);
            }
        } catch (error) {
            console.error('Error tracking event:', error);
        }
    }, [userId]);

    const trackPageView = useCallback((pageData: PageViewEvent) => {
        trackEvent('page_view', pageData);
    }, [trackEvent]);

    const trackButtonClick = useCallback((buttonData: ButtonClickEvent) => {
        trackEvent('button_click', buttonData);
    }, [trackEvent]);

    const trackFormSubmit = useCallback((formData: FormSubmitEvent) => {
        trackEvent('form_submit', formData);
    }, [trackEvent]);

    // Auto-track page views
    useEffect(() => {
        if (!userId) return;

        const path = window.location.pathname;
        const title = document.title;

        trackPageView({
            page_path: path,
            page_title: title,
            referrer: document.referrer
        });
    }, [userId, trackPageView]);

    return {
        trackEvent,
        trackPageView,
        trackButtonClick,
        trackFormSubmit
    };
}
