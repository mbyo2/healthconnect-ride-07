
import { createAdmin } from './createAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * A utility function to create an admin user
 * This can be run in development environments via the browser console
 */
export async function setupAdmin() {
  try {
    console.log("Setting up admin user...");
    
    // Generate secure random credentials
    const generateSecurePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };
    
    const adminEmail = `admin-${Date.now()}@doc-o-clock.internal`;
    const adminPassword = generateSecurePassword();
    
    console.log("Creating admin account...");
    const result = await createAdmin(adminEmail, adminPassword, "System", "Administrator");
    
    if (result.success) {
      console.log("✅ Admin user created successfully!");
      console.log("📧 Email: " + adminEmail);
      console.log("🔐 Password: " + adminPassword);
      console.warn("⚠️ SECURITY: Store these credentials securely and change the password immediately!");
      toast.success("Admin account created successfully");
      return {
        success: true,
        credentials: {
          email: adminEmail,
          password: adminPassword,
          role: "admin"
        }
      };
    } else {
      console.log("❌ Failed to create admin user:", result.error);
      toast.error("Failed to create admin account");
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error("Error in setupAdmin:", error);
    toast.error("Failed to create admin account");
    return { success: false, error: error.message };
  }
}

/**
 * A utility function to create a superadmin user
 * This can be run in development environments via the browser console
 */
export async function setupSuperAdmin() {
  try {
    console.log("Setting up superadmin user...");
    
    // Generate secure random credentials
    const generateSecurePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 20; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };
    
    const superAdminEmail = `superadmin-${Date.now()}@doc-o-clock.internal`;
    const superAdminPassword = generateSecurePassword();
    
    // First import the function
    const { createSuperAdmin } = await import('./createSuperAdmin');
    
    console.log("Creating superadmin account...");
    const result = await createSuperAdmin(superAdminEmail, superAdminPassword, "System", "SuperAdmin");
    
    if (result.success) {
      console.log("✅ Superadmin user created successfully!");
      console.log("📧 Email: " + superAdminEmail);
      console.log("🔐 Password: " + superAdminPassword);
      console.warn("⚠️ SECURITY: Store these credentials securely and change the password immediately!");
      toast.success("Superadmin account created successfully");
      return {
        success: true,
        credentials: {
          email: superAdminEmail,
          password: superAdminPassword,
          role: "superadmin"
        }
      };
    } else {
      console.log("❌ Failed to create superadmin user:", result.error);
      toast.error("Failed to create superadmin account");
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error("Error in setupSuperAdmin:", error);
    toast.error("Failed to create superadmin account");
    return { success: false, error: error.message };
  }
}
