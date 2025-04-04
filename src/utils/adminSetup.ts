
import { createAdmin } from './createAdmin';

/**
 * A utility function to create an admin user
 * Run this in the browser console:
 * 
 * import { setupAdmin } from './utils/adminSetup';
 * setupAdmin('admin@example.com', 'adminpassword123', 'Admin', 'User');
 */
export async function setupAdmin(email: string, password: string, firstName: string, lastName: string) {
  try {
    const result = await createAdmin(email, password, firstName, lastName);
    if (result.success) {
      console.log(`✅ Admin created successfully with ID: ${result.userId}`);
      console.log('Login with these credentials:');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      return result;
    } else {
      console.error('❌ Failed to create admin:', result.error);
      return result;
    }
  } catch (error) {
    console.error('❌ Error in setupAdmin:', error);
    return { success: false, error };
  }
}
