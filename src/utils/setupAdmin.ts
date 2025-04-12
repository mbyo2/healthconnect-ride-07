
import { createAdmin } from './createAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * A utility function to create an admin user
 * This can be run in development environments via the browser console
 */
export async function setupAdmin() {
  // Admin credentials - in a real app these would be set securely
  const email = "admin@doc-o-clock.com";
  const password = "Admin123!";
  const firstName = "Admin";
  const lastName = "User";
  
  try {
    console.log("Creating admin account...");
    const result = await createAdmin(email, password, firstName, lastName);
    
    if (result.success) {
      console.log(`✅ Admin created successfully with ID: ${result.userId}`);
      console.log('Login with these credentials:');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      return { success: true, credentials: { email, password } };
    } else {
      console.error('❌ Failed to create admin:', result.error);
      
      // Check if the admin already exists
      try {
        const { data: adminCheck, error: checkError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (!checkError && adminCheck.user) {
          console.log("✅ Admin account already exists. You can use these credentials:");
          console.log(`Email: ${email}`);
          console.log(`Password: ${password}`);
          return { success: true, credentials: { email, password }, alreadyExists: true };
        }
      } catch (checkError) {
        console.error("Error checking for existing admin:", checkError);
      }
      
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('❌ Error in setupAdmin:', error);
    toast.error("Failed to create admin account");
    return { success: false, error };
  }
}

/**
 * A utility function to create a superadmin user
 * This can be run in development environments via the browser console
 */
export async function setupSuperAdmin() {
  // SuperAdmin credentials - in a real app these would be set securely
  const email = "superadmin@doc-o-clock.com";
  const password = "SuperAdmin123!";
  const firstName = "Super";
  const lastName = "Admin";
  
  try {
    // First import the function
    const { createSuperAdmin } = await import('./createSuperAdmin');
    
    console.log("Creating superadmin account...");
    const result = await createSuperAdmin(email, password, firstName, lastName);
    
    if (result.success) {
      console.log(`✅ SuperAdmin created successfully with ID: ${result.userId}`);
      console.log('Login with these credentials:');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      return { success: true, credentials: { email, password } };
    } else {
      console.error('❌ Failed to create superadmin:', result.error);
      
      // Check if the superadmin already exists
      try {
        const { data: adminCheck, error: checkError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (!checkError && adminCheck.user) {
          console.log("✅ SuperAdmin account already exists. You can use these credentials:");
          console.log(`Email: ${email}`);
          console.log(`Password: ${password}`);
          return { success: true, credentials: { email, password }, alreadyExists: true };
        }
      } catch (checkError) {
        console.error("Error checking for existing superadmin:", checkError);
      }
      
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('❌ Error in setupSuperAdmin:', error);
    toast.error("Failed to create superadmin account");
    return { success: false, error };
  }
}
