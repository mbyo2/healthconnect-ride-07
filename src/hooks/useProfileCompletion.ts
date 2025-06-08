
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
          completed: false, // This would need to be checked against a payment_methods table
          required: false
        },
        {
          id: 'symptoms',
          title: 'Report Symptoms',
          description: 'Track your health by recording symptoms',
          icon: 'Activity',
          route: '/dashboard?tab=symptoms',
          completed: !!healthMetrics?.length,
          required: false
        },
        {
          id: 'search',
          title: 'Find Healthcare',
          description: 'Search for doctors and specialists near you',
          icon: 'Search',
          route: '/search',
          completed: false,
          required: false
        },
        {
          id: 'appointments',
          title: 'Book Appointments',
          description: 'Schedule appointments with healthcare providers',
          icon: 'Calendar',
          route: '/appointments',
          completed: !!appointments?.length,
          required: false
        },
        {
          id: 'medical-records',
          title: 'Medical Records',
          description: 'Access and manage your health records',
          icon: 'FileText',
          route: '/dashboard?tab=records',
          completed: !!medicalRecords?.length,
          required: false
        },
        {
          id: 'health-dashboard',
          title: 'Health Dashboard',
          description: 'View your health metrics and progress',
          icon: 'Heart',
          route: '/dashboard?tab=health',
          completed: !!healthMetrics?.length,
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
    return workflowSteps.find(step => !step.completed && step.required) || 
           workflowSteps.find(step => !step.completed);
  };

  return {
    isProfileComplete,
    workflowSteps,
    loading,
    completionPercentage: getCompletionPercentage(),
    nextStep: getNextStep(),
    refreshCompletion: checkWorkflowCompletion
  };
};
