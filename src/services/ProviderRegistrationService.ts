import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export interface ProviderRegistrationData {
  // User Account Fields
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  
  // Profile Fields
  phone_number?: string;
  
  // Provider-Specific Fields
  license_number: string;
  specialty: string;
  years_of_experience: number;
  documents_url?: string[];
}

export interface RegistrationTransaction {
  userId?: string;
  profileCreated: boolean;
  roleAssigned: boolean;
  applicationCreated: boolean;
  authenticationComplete: boolean;
}

export interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  full_name?: string;
  phone_number?: string;
  license_number?: string;
  specialty?: string;
  years_of_experience?: string;
}

export class ProviderRegistrationService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_BASE = 1000; // 1 second

  /**
   * Validates the registration form data
   */
  static validateRegistrationData(data: ProviderRegistrationData): ValidationErrors {
    const errors: ValidationErrors = {};

    // Email validation
    if (!data.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!data.password) {
      errors.password = "Password is required";
    } else if (data.password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }

    // Confirm password validation
    if (!data.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (data.password !== data.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    // Full name validation
    if (!data.full_name.trim()) {
      errors.full_name = "Full name is required";
    }

    // Phone number validation (optional but must be valid if provided)
    if (data.phone_number && !/^\+?[\d\s\-\(\)]+$/.test(data.phone_number)) {
      errors.phone_number = "Please enter a valid phone number";
    }

    // License number validation
    if (!data.license_number.trim()) {
      errors.license_number = "License number is required";
    }

    // Specialty validation
    if (!data.specialty.trim()) {
      errors.specialty = "Specialty is required";
    }

    // Years of experience validation
    if (!data.years_of_experience && data.years_of_experience !== 0) {
      errors.years_of_experience = "Years of experience is required";
    } else if (data.years_of_experience < 0) {
      errors.years_of_experience = "Years of experience must be positive";
    }

    return errors;
  }

  /**
   * Checks if the form has any validation errors
   */
  static hasValidationErrors(errors: ValidationErrors): boolean {
    return Object.keys(errors).length > 0;
  }

  /**
   * Registers a new provider with complete account setup
   */
  static async registerProvider(data: ProviderRegistrationData): Promise<{
    success: boolean;
    error?: string;
    transaction?: RegistrationTransaction;
  }> {
    const transaction: RegistrationTransaction = {
      profileCreated: false,
      roleAssigned: false,
      applicationCreated: false,
      authenticationComplete: false,
    };

    try {
      // Step 1: Create user account
      const { data: authData, error: authError } = await this.retryOperation(
        () => supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.full_name,
            }
          }
        }),
        "User account creation"
      );

      if (authError || !authData.user) {
        throw new Error(authError?.message || "Failed to create user account");
      }

      transaction.userId = authData.user.id;

      // Step 2: Create/update profile
      const nameParts = data.full_name.trim().split(/\s+/);
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ');
      
      const profileData: Database['public']['Tables']['profiles']['Insert'] = {
        id: authData.user.id,
        email: data.email,
        first_name,
        last_name,
        phone: data.phone_number || null,
        is_profile_complete: true,
        role: 'health_personnel',
        specialty: data.specialty
      };

      const { error: profileError } = await this.retryOperation(
        async () => await supabase.from('profiles').upsert(profileData),
        "Profile creation"
      );

      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      transaction.profileCreated = true;

      // Step 3: Assign provider role
      const { error: roleError } = await this.retryOperation(
        async () => await supabase.from('user_roles').insert({
          user_id: authData.user.id,
          role: 'health_personnel'
        }),
        "Role assignment"
      );

      if (roleError) {
        throw new Error(`Failed to assign provider role: ${roleError.message}`);
      }

      transaction.roleAssigned = true;

      // Step 4: Create application record
      const applicationData: Database['public']['Tables']['health_personnel_applications']['Insert'] = {
        user_id: authData.user.id,
        license_number: data.license_number,
        specialty: data.specialty,
        years_of_experience: data.years_of_experience,
        documents_url: data.documents_url || [],
        status: 'approved' // Auto-approve for seamless onboarding
      };

      const { error: applicationError } = await this.retryOperation(
        async () => await supabase.from('health_personnel_applications').insert(applicationData),
        "Application creation"
      );

      if (applicationError) {
        throw new Error(`Failed to create application: ${applicationError.message}`);
      }

      transaction.applicationCreated = true;

      // Step 5: Sign in the user automatically
      const { error: signInError } = await this.retryOperation(
        () => supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        }),
        "User authentication"
      );

      if (signInError) {
        throw new Error(`Failed to authenticate user: ${signInError.message}`);
      }

      transaction.authenticationComplete = true;

      return {
        success: true,
        transaction
      };

    } catch (error: any) {
      console.error('Registration failed:', error);
      
      // Attempt rollback if we have a user ID
      if (transaction.userId) {
        await this.rollbackRegistration(transaction);
      }

      return {
        success: false,
        error: error.message || "Registration failed",
        transaction
      };
    }
  }

  /**
   * Retries an operation with exponential backoff
   */
  private static async retryOperation<T>(
    operation: () => PromiseLike<T>,
    operationName: string,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (retryCount < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY_BASE * Math.pow(2, retryCount);
        console.warn(`${operationName} failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryOperation(operation, operationName, retryCount + 1);
      }
      
      console.error(`${operationName} failed after ${this.MAX_RETRIES} retries:`, error);
      throw error;
    }
  }

  /**
   * Attempts to rollback a failed registration
   */
  private static async rollbackRegistration(transaction: RegistrationTransaction): Promise<void> {
    if (!transaction.userId) return;

    console.log('Attempting to rollback registration for user:', transaction.userId);

    try {
      // Remove application if created
      if (transaction.applicationCreated) {
        await supabase
          .from('health_personnel_applications')
          .delete()
          .eq('user_id', transaction.userId);
      }

      // Remove role if assigned
      if (transaction.roleAssigned) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', transaction.userId);
      }

      // Remove profile if created
      if (transaction.profileCreated) {
        await supabase
          .from('profiles')
          .delete()
          .eq('id', transaction.userId);
      }

      // Note: We cannot delete the auth user via client-side code
      // This would need to be handled by an admin function
      console.log('Rollback completed for user:', transaction.userId);
      
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
      // Log the error but don't throw - we don't want to mask the original error
    }
  }
}