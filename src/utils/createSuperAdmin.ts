
import { supabase } from '@/integrations/supabase/client';

export async function createSuperAdmin(email: string, password: string, firstName: string, lastName: string) {
  try {
    // Create the admin user using the RPC function
    const { data: newUserId, error: createError } = await supabase
      .rpc('create_admin_user', { 
        email,
        password,
        is_superadmin: true
      });
      
    if (createError) throw createError;
    
    // Update user profile with names
    if (newUserId) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName
        })
        .eq('id', newUserId);
        
      if (updateError) throw updateError;
    }
    
    return { success: true, userId: newUserId };
  } catch (error: any) {
    console.error("Error creating superadmin:", error);
    return { success: false, error: error.message || "Failed to create superadmin" };
  }
}
