import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  completed: boolean;
  required: boolean;
}

export const useProfileCompletion = () => {
  const { user, profile } = useAuth();
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);

  const checkWorkflowCompletion = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const profileComplete = profile?.is_profile_complete || false;
      const [
        { data: appointments },
        { data: healthMetrics },
        { data: insuranceInfo },
        { data: videoConsultations },
        { data: connections },
        { data: wallets },
        { data: searchLogs }
      ] = await Promise.all([
        supabase.from('appointments').select('id').eq('patient_id', user.id).limit(1),
        supabase.from('health_metrics').select('id').eq('user_id', user.id).limit(1),
        supabase.from('insurance_information').select('id').eq('patient_id', user.id).limit(1),
        supabase.from('video_consultations').select('id').eq('patient_id', user.id).limit(1),
        supabase.from('user_connections').select('id').eq('patient_id', user.id).eq('status', 'approved').limit(1),
        supabase.from('user_wallets').select('id').eq('user_id', user.id).limit(1),
        supabase.from('audit_logs').select('id').eq('user_id', user.id).eq('action', 'search').limit(1)
      ]);

      const steps: WorkflowStep[] = [
        {
          id: 'profile',
          title: 'Complete Profile',
          description: 'Set up your personal and medical information',
          icon: 'User',
          route: '/profile-setup',
          completed: profileComplete,
          required: true
        },
        {
          id: 'insurance',
          title: 'Add Insurance',
          description: 'Add your insurance information for coverage verification',
          icon: 'Shield',
          route: '/dashboard',
          completed: !!insuranceInfo?.length,
          required: false
        },
        {
          id: 'connections',
          title: 'Connect with Providers',
          description: 'Build your healthcare network by connecting with providers',
          icon: 'Users',
          route: '/connections',
          completed: !!connections?.length,
          required: false
        },
        {
          id: 'health-tracking',
          title: 'Track Health',
          description: 'Start tracking your health by recording symptoms or metrics',
          icon: 'Activity',
          route: '/symptoms',
          completed: !!healthMetrics?.length,
          required: false
        },
        {
          id: 'appointments',
          title: 'Book Appointment',
          description: 'Schedule your first appointment with a healthcare provider',
          icon: 'Calendar',
          route: '/appointments',
          completed: !!appointments?.length,
          required: false
        },
        {
          id: 'video-consultation',
          title: 'Video Consultation',
          description: 'Experience telehealth with video consultations',
          icon: 'Video',
          route: '/video-dashboard',
          completed: !!videoConsultations?.length,
          required: false
        },
        {
          id: 'payment-setup',
          title: 'Payment Setup',
          description: 'Set up secure payment methods for healthcare services',
          icon: 'CreditCard',
          route: '/settings',
          completed: !!wallets?.length,
          required: false
        },
        {
          id: 'search',
          title: 'Find Providers',
          description: 'Explore and search for healthcare providers near you',
          icon: 'Search',
          route: '/search',
          completed: !!searchLogs?.length,
          required: false
        }
      ];

      setWorkflowSteps(steps);
      setIsProfileComplete(profileComplete);
    } catch (error) {
      console.error('Error checking workflow completion:', error);
      setWorkflowSteps([]);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.is_profile_complete]);

  useEffect(() => {
    checkWorkflowCompletion();
  }, [checkWorkflowCompletion]);

  const getCompletionPercentage = useCallback(() => {
    if (workflowSteps.length === 0) return 0;
    const completedSteps = workflowSteps.filter(step => step.completed).length;
    return Math.round((completedSteps / workflowSteps.length) * 100);
  }, [workflowSteps]);

  const getNextStep = useCallback(() => {
    const nextRequired = workflowSteps.find(step => !step.completed && step.required);
    if (nextRequired) return nextRequired;
    return workflowSteps.find(step => !step.completed && !step.required);
  }, [workflowSteps]);

  const isWorkflowComplete = useCallback(() => {
    const requiredSteps = workflowSteps.filter(step => step.required);
    return requiredSteps.length > 0 && requiredSteps.every(step => step.completed);
  }, [workflowSteps]);

  return {
    isProfileComplete,
    workflowSteps,
    loading,
    completionPercentage: getCompletionPercentage(),
    nextStep: getNextStep(),
    isWorkflowComplete: isWorkflowComplete(),
    refreshCompletion: checkWorkflowCompletion
  };
};
