
import { supabase } from '@/integrations/supabase/client';

export const logSecurityEvent = async (action: string, details?: any): Promise<void> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const eventData = {
      user_id: session.user.id,
      action,
      timestamp: new Date().toISOString(),
      ip_address: "127.0.0.1", // In a real app, this would be the actual IP
      user_agent: navigator.userAgent,
      details
    };
    
    console.log("Security event logged:", eventData);
    
    // In a real implementation, this would insert into an audit_logs table
    // const { error } = await supabase.from('audit_logs').insert(eventData);
    // if (error) throw error;
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};
