
import { supabase } from '@/integrations/supabase/client';

export async function createSuperAdmin(email: string, password: string, firstName: string, lastName: string) {
  try {
    // Create the user with Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
          admin_level: 'superadmin'
        }
      }
    });
      
    if (authError) throw authError;
    
    // Update user profile with names and admin level
    if (authData.user) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
          admin_level: 'superadmin',
          is_profile_complete: true
        })
        .eq('id', authData.user.id);
        
      if (updateError) throw updateError;
    }
    
    return { success: true, userId: authData.user?.id };
  } catch (error: any) {
    console.error("Error creating superadmin:", error);
    return { success: false, error: error.message || "Failed to create superadmin" };
  }
}
