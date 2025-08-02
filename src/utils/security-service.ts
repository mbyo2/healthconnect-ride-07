
import { supabase } from '@/integrations/supabase/client';
import { createRateLimiter } from './input-validation';

// Enhanced security service with real audit logging
export const logSecurityEvent = async (action: string, details?: any): Promise<void> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const eventData = {
      user_id: session.user.id,
      event_type: action,
      event_data: details ? JSON.stringify(details) : null,
      ip_address: null, // Would be populated by server-side logging
      user_agent: navigator.userAgent,
    };
    
    // Insert into security audit log table
    const { error } = await supabase
      .from('security_audit_log')
      .insert(eventData);
    
    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

// Rate limiters for different operations
export const authRateLimiter = createRateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const messageRateLimiter = createRateLimiter(50, 60 * 1000); // 50 messages per minute
export const uploadRateLimiter = createRateLimiter(10, 60 * 1000); // 10 uploads per minute

// Security event types
export const SecurityEvents = {
  LOGIN_ATTEMPT: 'login_attempt',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  ROLE_CHANGE: 'role_change',
  PROFILE_UPDATE: 'profile_update',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  FILE_UPLOAD: 'file_upload',
  MESSAGE_SENT: 'message_sent',
  APPOINTMENT_CREATED: 'appointment_created',
  DATA_ACCESS: 'data_access',
} as const;

// Enhanced session monitoring
export const monitorSessionActivity = () => {
  const lastActivity = localStorage.getItem('lastActivity');
  const sessionTimeout = 30 * 60 * 1000; // 30 minutes
  
  if (lastActivity && Date.now() - parseInt(lastActivity) > sessionTimeout) {
    logSecurityEvent(SecurityEvents.SUSPICIOUS_ACTIVITY, {
      reason: 'session_timeout_exceeded',
      lastActivity: new Date(parseInt(lastActivity)).toISOString(),
    });
  }
  
  localStorage.setItem('lastActivity', Date.now().toString());
};

// Detect suspicious patterns
export const detectSuspiciousActivity = (action: string, context?: any): boolean => {
  // Check for rapid successive actions
  const recentActions = JSON.parse(localStorage.getItem('recentActions') || '[]');
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  
  // Filter recent actions (last 5 minutes)
  const recentActionsFiltered = recentActions.filter((timestamp: number) => timestamp > fiveMinutesAgo);
  
  // Add current action
  recentActionsFiltered.push(now);
  localStorage.setItem('recentActions', JSON.stringify(recentActionsFiltered));
  
  // Flag if more than 20 actions in 5 minutes
  if (recentActionsFiltered.length > 20) {
    logSecurityEvent(SecurityEvents.SUSPICIOUS_ACTIVITY, {
      reason: 'rapid_successive_actions',
      actionCount: recentActionsFiltered.length,
      action,
      context,
    });
    return true;
  }
  
  return false;
};

// Validate user permissions for resource access
export const validateResourceAccess = async (resourceType: string, resourceId: string, requiredRole?: string): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    
    // Log the access attempt
    logSecurityEvent(SecurityEvents.DATA_ACCESS, {
      resourceType,
      resourceId,
      requiredRole,
    });
    
    // Basic permission check would be implemented here
    // This is a placeholder that should be expanded based on your specific needs
    return true;
  } catch (error) {
    console.error('Error validating resource access:', error);
    return false;
  }
};
