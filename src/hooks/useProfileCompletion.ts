
import { useState, useEffect } from 'react';
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

  const checkWorkflowCompletion = async () => {
    if (!user) return;

    try {
      // Check profile completion
      const profileComplete = profile?.is_profile_complete || false;
      
      // Check if user has any appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('patient_id', user.id)
        .limit(1);

      // Check if user has any health metrics
      const { data: healthMetrics } = await supabase
        .from('health_metrics')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      // Check if user has any medical records
      const { data: medicalRecords } = await supabase
        .from('medical_records')
        .select('id')
        .eq('patient_id', user.id)
        .limit(1);

      // Check if user has insurance information
      const { data: insuranceInfo } = await supabase
        .from('insurance_information')
        .select('id')
        .eq('patient_id', user.id)
        .limit(1);

      // Check if user has any payments (indicating payment methods are set up)
      const { data: paymentHistory } = await supabase
        .from('payments')
        .select('id')
        .eq('patient_id', user.id)
        .limit(1);

      // Define workflow steps with completion status
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
          route: '/dashboard?tab=insurance',
          completed: !!insuranceInfo?.length,
          required: false
        },
        {
          id: 'payment',
          title: 'Payment Methods',
          description: 'Add payment methods for appointments and services',
          icon: 'CreditCard',
          route: '/wallet?tab=payment-methods',
          completed: !!paymentHistory?.length, // Check if user has made any payments
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
          id: 'symptoms',
          title: 'Track Health',
          description: 'Start tracking your health by recording symptoms or metrics',
          icon: 'Activity',
          route: '/dashboard?tab=symptoms',
          completed: !!healthMetrics?.length,
          required: false
        },
        {
          id: 'search',
          title: 'Find Providers',
          description: 'Explore and search for healthcare providers near you',
          icon: 'Search',
          route: '/search',
          completed: false, // This is more of an exploratory step
          required: false
        }
      ];

      setWorkflowSteps(steps);
      setIsProfileComplete(profileComplete);
    } catch (error) {
      console.error('Error checking workflow completion:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkWorkflowCompletion();
  }, [user, profile]);

  const getCompletionPercentage = () => {
    if (workflowSteps.length === 0) return 0;
    const completedSteps = workflowSteps.filter(step => step.completed).length;
    return Math.round((completedSteps / workflowSteps.length) * 100);
  };

  const getNextStep = () => {
    // First check for required steps
    const nextRequired = workflowSteps.find(step => !step.completed && step.required);
    if (nextRequired) return nextRequired;
    
    // Then check for optional steps
    return workflowSteps.find(step => !step.completed && !step.required);
  };

  const isWorkflowComplete = () => {
    const requiredSteps = workflowSteps.filter(step => step.required);
    return requiredSteps.every(step => step.completed);
  };

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
