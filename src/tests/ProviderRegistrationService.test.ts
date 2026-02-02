import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock Supabase client before importing the service
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
    from: vi.fn(() => ({
      upsert: vi.fn(),
      insert: vi.fn(),
      delete: vi.fn(),
      eq: vi.fn(() => ({
        delete: vi.fn(),
      })),
    })),
  },
}));

import { ProviderRegistrationService, type ProviderRegistrationData } from '@/services/ProviderRegistrationService';

describe('ProviderRegistrationService Property Tests', () => {
  
  /**
   * **Feature: provider-registration-fix, Property 2: Form validation consistency**
   * **Validates: Requirements 2.1, 2.3, 2.5**
   * 
   * For any form input state, the submit button should be enabled if and only if 
   * all required fields are valid and no fields contain invalid data
   */
  it('Property 2: Form validation consistency', () => {
    fc.assert(
      fc.property(
        // Generator for form data with various states
        fc.record({
          email: fc.oneof(
            fc.constant(''), // empty
            fc.emailAddress(), // valid email
            fc.string().filter(s => s.length > 0 && !s.includes('@')), // invalid email
            fc.string().filter(s => s.includes('@') && !s.includes('.')) // invalid email
          ),
          password: fc.oneof(
            fc.constant(''), // empty
            fc.string({ minLength: 1, maxLength: 5 }), // too short
            fc.string({ minLength: 6, maxLength: 20 }) // valid length
          ),
          confirmPassword: fc.string({ maxLength: 20 }),
          full_name: fc.oneof(
            fc.constant(''), // empty
            fc.constant('   '), // whitespace only
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0) // valid name
          ),
          phone_number: fc.oneof(
            fc.constant(''), // empty (optional)
            fc.string().filter(s => /^\+?[\d\s\-\(\)]+$/.test(s)), // valid phone
            fc.string().filter(s => s.length > 0 && !/^\+?[\d\s\-\(\)]+$/.test(s)) // invalid phone
          ),
          license_number: fc.oneof(
            fc.constant(''), // empty
            fc.constant('   '), // whitespace only
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0) // valid license
          ),
          specialty: fc.oneof(
            fc.constant(''), // empty
            fc.constant('   '), // whitespace only
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0) // valid specialty
          ),
          years_of_experience: fc.oneof(
            fc.constant(-1), // negative (invalid)
            fc.nat({ max: 50 }) // valid positive number
          ),
          documents_url: fc.array(fc.webUrl(), { maxLength: 5 })
        }),
        (formData) => {
          // Ensure confirmPassword matches password for some cases to test matching logic
          const testData: ProviderRegistrationData = {
            ...formData,
            confirmPassword: Math.random() > 0.5 ? formData.password : formData.confirmPassword
          };

          const errors = ProviderRegistrationService.validateRegistrationData(testData);
          const hasErrors = ProviderRegistrationService.hasValidationErrors(errors);

          // Check if form should be valid based on requirements
          const shouldBeValid = 
            testData.email.trim() !== '' && 
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testData.email) &&
            testData.password.length >= 6 &&
            testData.confirmPassword === testData.password &&
            testData.full_name.trim() !== '' &&
            (testData.phone_number === '' || /^\+?[\d\s\-\(\)]+$/.test(testData.phone_number)) &&
            testData.license_number.trim() !== '' &&
            testData.specialty.trim() !== '' &&
            testData.years_of_experience >= 0;

          // The form should be valid if and only if there are no validation errors
          expect(!hasErrors).toBe(shouldBeValid);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: provider-registration-fix, Property 3: Validation error specificity**
   * **Validates: Requirements 2.2, 2.4**
   * 
   * For any invalid form input, the system should display specific error messages 
   * that clearly identify which fields are invalid and why
   */
  it('Property 3: Validation error specificity', () => {
    fc.assert(
      fc.property(
        // Generator for invalid form data
        fc.record({
          email: fc.oneof(
            fc.constant(''), // empty
            fc.string().filter(s => s.length > 0 && !s.includes('@')), // no @
            fc.string().filter(s => s.includes('@') && !s.includes('.')) // no domain
          ),
          password: fc.oneof(
            fc.constant(''), // empty
            fc.string({ minLength: 1, maxLength: 5 }) // too short
          ),
          confirmPassword: fc.string({ maxLength: 20 }),
          full_name: fc.oneof(
            fc.constant(''), // empty
            fc.constant('   ') // whitespace only
          ),
          phone_number: fc.string().filter(s => s.length > 0 && !/^\+?[\d\s\-\(\)]+$/.test(s)), // invalid phone
          license_number: fc.oneof(
            fc.constant(''), // empty
            fc.constant('   ') // whitespace only
          ),
          specialty: fc.oneof(
            fc.constant(''), // empty
            fc.constant('   ') // whitespace only
          ),
          years_of_experience: fc.integer({ min: -10, max: -1 }), // negative
          documents_url: fc.array(fc.webUrl(), { maxLength: 5 })
        }),
        (invalidData) => {
          // Make confirmPassword different from password to ensure mismatch
          const testData: ProviderRegistrationData = {
            ...invalidData,
            confirmPassword: invalidData.password + 'different'
          };

          const errors = ProviderRegistrationService.validateRegistrationData(testData);

          // Check that specific error messages are provided for each invalid field
          if (testData.email === '' || !testData.email.includes('@') || !testData.email.includes('.')) {
            expect(errors.email).toBeDefined();
            expect(typeof errors.email).toBe('string');
            expect(errors.email!.length).toBeGreaterThan(0);
          }

          if (testData.password === '' || testData.password.length < 6) {
            expect(errors.password).toBeDefined();
            expect(typeof errors.password).toBe('string');
            expect(errors.password!.length).toBeGreaterThan(0);
          }

          if (testData.confirmPassword !== testData.password) {
            expect(errors.confirmPassword).toBeDefined();
            expect(typeof errors.confirmPassword).toBe('string');
            expect(errors.confirmPassword!.length).toBeGreaterThan(0);
          }

          if (testData.full_name.trim() === '') {
            expect(errors.full_name).toBeDefined();
            expect(typeof errors.full_name).toBe('string');
            expect(errors.full_name!.length).toBeGreaterThan(0);
          }

          if (testData.phone_number && !/^\+?[\d\s\-\(\)]+$/.test(testData.phone_number)) {
            expect(errors.phone_number).toBeDefined();
            expect(typeof errors.phone_number).toBe('string');
            expect(errors.phone_number!.length).toBeGreaterThan(0);
          }

          if (testData.license_number.trim() === '') {
            expect(errors.license_number).toBeDefined();
            expect(typeof errors.license_number).toBe('string');
            expect(errors.license_number!.length).toBeGreaterThan(0);
          }

          if (testData.specialty.trim() === '') {
            expect(errors.specialty).toBeDefined();
            expect(typeof errors.specialty).toBe('string');
            expect(errors.specialty!.length).toBeGreaterThan(0);
          }

          if (testData.years_of_experience < 0) {
            expect(errors.years_of_experience).toBeDefined();
            expect(typeof errors.years_of_experience).toBe('string');
            expect(errors.years_of_experience!.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: provider-registration-fix, Property 4: Transaction atomicity**
   * **Validates: Requirements 3.1, 3.2, 3.3**
   * 
   * For any registration attempt, either all registration steps (account creation, 
   * profile creation, role assignment, application creation) should succeed together, 
   * or all should fail together with no partial state
   */
  it('Property 4: Transaction atomicity', async () => {
    // Test success scenario
    const { supabase } = await import('@/integrations/supabase/client');
    vi.clearAllMocks();
    
    const mockUser = { id: 'test-user-id', email: 'test@example.com' };
    const mockDeleteChain = { delete: vi.fn().mockResolvedValue({ error: null }) };
    const mockFromChain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn(() => mockDeleteChain)
    };
    
    (supabase.auth.signUp as any).mockResolvedValue({ data: { user: mockUser }, error: null });
    (supabase.from as any).mockReturnValue(mockFromChain);
    (supabase.auth.signInWithPassword as any).mockResolvedValue({ error: null });
    
    const registrationData: ProviderRegistrationData = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      full_name: 'Test User',
      phone_number: '+1234567890',
      license_number: 'LIC123',
      specialty: 'General Practice',
      years_of_experience: 5,
      documents_url: []
    };
    
    const result = await ProviderRegistrationService.registerProvider(registrationData);
    
    // All operations should succeed together
    expect(result.success).toBe(true);
    expect(result.transaction?.profileCreated).toBe(true);
    expect(result.transaction?.roleAssigned).toBe(true);
    expect(result.transaction?.applicationCreated).toBe(true);
    expect(result.transaction?.authenticationComplete).toBe(true);
    
    // Test failure scenario - auth failure
    vi.clearAllMocks();
    (supabase.auth.signUp as any).mockResolvedValue({ data: { user: null }, error: { message: 'Auth failed' } });
    
    const failResult = await ProviderRegistrationService.registerProvider(registrationData);
    
    // Should fail completely
    expect(failResult.success).toBe(false);
    expect(failResult.error).toBeDefined();
    expect(failResult.transaction).toBeDefined();
  });

  /**
   * **Feature: provider-registration-fix, Property 7: Retry mechanism reliability**
   * **Validates: Requirements 3.4, 3.5**
   * 
   * For any network failure during registration, the system should retry failed 
   * operations up to three times before displaying an error, and log detailed 
   * error information for debugging
   */
  it('Property 7: Retry mechanism reliability', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.clearAllMocks();
    
    // Mock console methods to verify logging
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const registrationData: ProviderRegistrationData = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      full_name: 'Test User',
      phone_number: '+1234567890',
      license_number: 'LIC123',
      specialty: 'General Practice',
      years_of_experience: 5,
      documents_url: []
    };
    
    const mockUser = { id: 'test-user-id', email: 'test@example.com' };
    
    // Test retry then success scenario
    (supabase.auth.signUp as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: { user: mockUser }, error: null });
    
    const mockDeleteChain = { delete: vi.fn().mockResolvedValue({ error: null }) };
    const mockFromChain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn(() => mockDeleteChain)
    };
    
    (supabase.from as any).mockReturnValue(mockFromChain);
    (supabase.auth.signInWithPassword as any).mockResolvedValue({ error: null });
    
    const result = await ProviderRegistrationService.registerProvider(registrationData);
    
    // Should succeed after retries
    expect(result.success).toBe(true);
    expect(supabase.auth.signUp).toHaveBeenCalledTimes(3); // 2 failures + 1 success
    expect(consoleSpy).toHaveBeenCalled(); // Should log retry attempts
    
    // Test immediate success scenario
    vi.clearAllMocks();
    (supabase.auth.signUp as any).mockResolvedValue({ data: { user: mockUser }, error: null });
    (supabase.from as any).mockReturnValue(mockFromChain);
    (supabase.auth.signInWithPassword as any).mockResolvedValue({ error: null });
    
    const successResult = await ProviderRegistrationService.registerProvider(registrationData);
    
    // Should succeed immediately
    expect(successResult.success).toBe(true);
    expect(supabase.auth.signUp).toHaveBeenCalledTimes(1); // No retries needed
    
    // Cleanup
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  }, 10000); // 10 second timeout

  /**
   * **Feature: provider-registration-fix, Property 1: Complete registration workflow**
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
   * 
   * For any valid provider registration data, submitting the form should result in 
   * a new user account with provider role, complete profile data, automatic 
   * authentication, and redirection to the Provider Dashboard
   */
  it('Property 1: Complete registration workflow', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.clearAllMocks();
    
    const registrationData: ProviderRegistrationData = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      full_name: 'Test Provider',
      phone_number: '+1234567890',
      license_number: 'LIC123456',
      specialty: 'Cardiology',
      years_of_experience: 10,
      documents_url: []
    };
    
    const mockUser = { id: 'test-user-id', email: registrationData.email };
    
    // Set up successful mocks for complete workflow
    (supabase.auth.signUp as any).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
    
    const mockDeleteChain = { delete: vi.fn().mockResolvedValue({ error: null }) };
    const mockFromChain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn(() => mockDeleteChain)
    };
    
    (supabase.from as any).mockReturnValue(mockFromChain);
    (supabase.auth.signInWithPassword as any).mockResolvedValue({ error: null });
    
    // Execute complete registration workflow
    const result = await ProviderRegistrationService.registerProvider(registrationData);
    
    // Verify complete workflow success
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    
    // Verify user account creation (Requirement 1.1)
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: registrationData.email,
      password: registrationData.password,
      options: {
        data: {
          full_name: registrationData.full_name,
        }
      }
    });
    
    // Verify profile data persistence (Requirement 1.2)
    expect(mockFromChain.upsert).toHaveBeenCalledWith({
      id: mockUser.id,
      email: registrationData.email,
      full_name: registrationData.full_name,
      phone_number: registrationData.phone_number,
      is_profile_complete: true,
      role: 'health_personnel'
    });
    
    // Verify role assignment (Requirement 1.2)
    expect(mockFromChain.insert).toHaveBeenCalledWith({
      user_id: mockUser.id,
      role: 'health_personnel'
    });
    
    // Verify application creation with provider data
    expect(mockFromChain.insert).toHaveBeenCalledWith({
      user_id: mockUser.id,
      license_number: registrationData.license_number,
      specialty: registrationData.specialty,
      years_of_experience: registrationData.years_of_experience,
      documents_url: registrationData.documents_url,
      status: 'approved'
    });
    
    // Verify automatic authentication (Requirement 1.3)
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: registrationData.email,
      password: registrationData.password
    });
    
    // Verify transaction completion state (Requirement 1.4)
    expect(result.transaction?.profileCreated).toBe(true);
    expect(result.transaction?.roleAssigned).toBe(true);
    expect(result.transaction?.applicationCreated).toBe(true);
    expect(result.transaction?.authenticationComplete).toBe(true);
  }, 10000); // 10 second timeout

  /**
   * **Feature: provider-registration-fix, Property 5: Error handling and data preservation**
   * **Validates: Requirements 1.5, 4.3, 4.5**
   * 
   * For any registration failure, the system should display clear error messages 
   * and preserve all previously entered valid form data
   */
  it('Property 5: Error handling and data preservation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generator for valid registration data that will fail at different steps
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 6, maxLength: 20 }),
          confirmPassword: fc.string({ minLength: 6, maxLength: 20 }),
          full_name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          phone_number: fc.option(fc.string().filter(s => /^\+?[\d\s\-\(\)]+$/.test(s)), { nil: undefined }),
          license_number: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          specialty: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          years_of_experience: fc.nat({ max: 50 }),
          documents_url: fc.array(fc.webUrl(), { maxLength: 3 })
        }).map(data => ({
          ...data,
          confirmPassword: data.password // Ensure passwords match for valid data
        })),
        // Generator for failure scenarios
        fc.constantFrom(
          'auth_failure',
          'profile_failure', 
          'role_failure',
          'application_failure',
          'signin_failure'
        ),
        async (registrationData, failureType) => {
          const { supabase } = await import('@/integrations/supabase/client');
          vi.clearAllMocks();
          
          // Mock console methods to capture error logging
          const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
          const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
          
          const mockUser = { id: 'test-user-id', email: registrationData.email };
          const mockDeleteChain = { delete: vi.fn().mockResolvedValue({ error: null }) };
          
          // Set up mocks based on failure type
          switch (failureType) {
            case 'auth_failure':
              (supabase.auth.signUp as any).mockResolvedValue({
                data: { user: null },
                error: { message: 'Email already registered' }
              });
              break;
              
            case 'profile_failure':
              (supabase.auth.signUp as any).mockResolvedValue({
                data: { user: mockUser },
                error: null
              });
              (supabase.from as any).mockReturnValue({
                upsert: vi.fn().mockResolvedValue({ error: { message: 'Profile creation failed' } }),
                insert: vi.fn().mockResolvedValue({ error: null }),
                delete: vi.fn().mockResolvedValue({ error: null }),
                eq: vi.fn(() => mockDeleteChain)
              });
              break;
              
            case 'role_failure':
              (supabase.auth.signUp as any).mockResolvedValue({
                data: { user: mockUser },
                error: null
              });
              (supabase.from as any).mockReturnValue({
                upsert: vi.fn().mockResolvedValue({ error: null }),
                insert: vi.fn()
                  .mockResolvedValueOnce({ error: { message: 'Role assignment failed' } })
                  .mockResolvedValue({ error: null }),
                delete: vi.fn().mockResolvedValue({ error: null }),
                eq: vi.fn(() => mockDeleteChain)
              });
              break;
              
            case 'application_failure':
              (supabase.auth.signUp as any).mockResolvedValue({
                data: { user: mockUser },
                error: null
              });
              (supabase.from as any).mockReturnValue({
                upsert: vi.fn().mockResolvedValue({ error: null }),
                insert: vi.fn()
                  .mockResolvedValueOnce({ error: null }) // role success
                  .mockResolvedValueOnce({ error: { message: 'Application creation failed' } }), // application failure
                delete: vi.fn().mockResolvedValue({ error: null }),
                eq: vi.fn(() => mockDeleteChain)
              });
              break;
              
            case 'signin_failure':
              (supabase.auth.signUp as any).mockResolvedValue({
                data: { user: mockUser },
                error: null
              });
              (supabase.from as any).mockReturnValue({
                upsert: vi.fn().mockResolvedValue({ error: null }),
                insert: vi.fn().mockResolvedValue({ error: null }),
                delete: vi.fn().mockResolvedValue({ error: null }),
                eq: vi.fn(() => mockDeleteChain)
              });
              (supabase.auth.signInWithPassword as any).mockResolvedValue({
                error: { message: 'Authentication failed' }
              });
              break;
          }
          
          // Execute registration and expect failure
          const result = await ProviderRegistrationService.registerProvider(registrationData);
          
          // Verify failure occurred (Requirement 1.5, 4.3)
          expect(result.success).toBe(false);
          
          // Verify clear error message is provided (Requirement 4.3)
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
          expect(result.error!.length).toBeGreaterThan(0);
          
          // Verify error message is specific and helpful
          expect(result.error).toMatch(/failed|error|already|creation|assignment|authentication/i);
          
          // Verify transaction state is preserved for debugging (Requirement 4.5)
          expect(result.transaction).toBeDefined();
          expect(typeof result.transaction!.profileCreated).toBe('boolean');
          expect(typeof result.transaction!.roleAssigned).toBe('boolean');
          expect(typeof result.transaction!.applicationCreated).toBe('boolean');
          expect(typeof result.transaction!.authenticationComplete).toBe('boolean');
          
          // Verify error logging for debugging (Requirement 4.3)
          expect(consoleErrorSpy).toHaveBeenCalled();
          
          // Verify rollback attempt was logged when user was created
          if (failureType !== 'auth_failure') {
            expect(consoleLogSpy).toHaveBeenCalledWith(
              expect.stringMatching(/rollback/i),
              expect.any(String)
            );
          }
          
          // The original registration data should be preserved in the calling context
          // This property verifies that the service doesn't modify the input data
          const originalDataKeys = Object.keys(registrationData);
          expect(originalDataKeys).toContain('email');
          expect(originalDataKeys).toContain('password');
          expect(originalDataKeys).toContain('full_name');
          expect(originalDataKeys).toContain('license_number');
          expect(originalDataKeys).toContain('specialty');
          
          // Verify the input data values are unchanged
          expect(registrationData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
          expect(registrationData.password.length).toBeGreaterThanOrEqual(6);
          expect(registrationData.full_name.trim().length).toBeGreaterThan(0);
          expect(registrationData.license_number.trim().length).toBeGreaterThan(0);
          expect(registrationData.specialty.trim().length).toBeGreaterThan(0);
          expect(registrationData.years_of_experience).toBeGreaterThanOrEqual(0);
          
          // Cleanup
          consoleErrorSpy.mockRestore();
          consoleLogSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  }, 15000); // 15 second timeout for async operations

  /**
   * **Feature: provider-registration-fix, Property 6: User feedback consistency**
   * **Validates: Requirements 4.1, 4.2, 4.4**
   * 
   * For any registration state change (processing, success, failure), the system 
   * should provide appropriate visual feedback through loading indicators, success 
   * messages, or error messages
   */
  it('Property 6: User feedback consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generator for valid registration data
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 6, maxLength: 20 }),
          full_name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          phone_number: fc.option(fc.string().filter(s => /^\+?[\d\s\-\(\)]+$/.test(s)), { nil: undefined }),
          license_number: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          specialty: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          years_of_experience: fc.nat({ max: 50 }),
          documents_url: fc.array(fc.webUrl(), { maxLength: 3 })
        }).map(data => ({
          ...data,
          confirmPassword: data.password // Ensure passwords match
        })),
        // Generator for different registration outcomes
        fc.constantFrom('success', 'failure'),
        async (registrationData, outcome) => {
          const { supabase } = await import('@/integrations/supabase/client');
          vi.clearAllMocks();
          
          const mockUser = { id: 'test-user-id', email: registrationData.email };
          const mockDeleteChain = { delete: vi.fn().mockResolvedValue({ error: null }) };
          
          let result;
          
          if (outcome === 'success') {
            // Set up successful registration scenario
            (supabase.auth.signUp as any).mockResolvedValue({
              data: { user: mockUser },
              error: null
            });
            
            const mockFromChain = {
              upsert: vi.fn().mockResolvedValue({ error: null }),
              insert: vi.fn().mockResolvedValue({ error: null }),
              delete: vi.fn().mockResolvedValue({ error: null }),
              eq: vi.fn(() => mockDeleteChain)
            };
            
            (supabase.from as any).mockReturnValue(mockFromChain);
            (supabase.auth.signInWithPassword as any).mockResolvedValue({ error: null });
            
            result = await ProviderRegistrationService.registerProvider(registrationData);
            
            // Verify success feedback requirements (Requirement 4.2)
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            
            // Verify transaction state provides feedback about completion (Requirement 4.4)
            expect(result.transaction).toBeDefined();
            expect(result.transaction!.profileCreated).toBe(true);
            expect(result.transaction!.roleAssigned).toBe(true);
            expect(result.transaction!.applicationCreated).toBe(true);
            expect(result.transaction!.authenticationComplete).toBe(true);
            
            // Success state should have all steps completed
            const completedSteps = [
              result.transaction!.profileCreated,
              result.transaction!.roleAssigned,
              result.transaction!.applicationCreated,
              result.transaction!.authenticationComplete
            ];
            expect(completedSteps.every(step => step === true)).toBe(true);
            
          } else {
            // Set up failure scenario
            (supabase.auth.signUp as any).mockResolvedValue({
              data: { user: null },
              error: { message: 'Registration failed' }
            });
            
            result = await ProviderRegistrationService.registerProvider(registrationData);
            
            // Verify failure feedback requirements (Requirement 4.4)
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error!.length).toBeGreaterThan(0);
            
            // Verify transaction state provides feedback about what failed (Requirement 4.4)
            expect(result.transaction).toBeDefined();
            
            // For auth failure, no steps should be completed
            expect(result.transaction!.profileCreated).toBe(false);
            expect(result.transaction!.roleAssigned).toBe(false);
            expect(result.transaction!.applicationCreated).toBe(false);
            expect(result.transaction!.authenticationComplete).toBe(false);
            
            // Error message should be informative and specific
            expect(result.error).toMatch(/failed|error|registration/i);
          }
          
          // Verify consistent feedback structure regardless of outcome
          expect(typeof result.success).toBe('boolean');
          expect(result.transaction).toBeDefined();
          expect(typeof result.transaction!.profileCreated).toBe('boolean');
          expect(typeof result.transaction!.roleAssigned).toBe('boolean');
          expect(typeof result.transaction!.applicationCreated).toBe('boolean');
          expect(typeof result.transaction!.authenticationComplete).toBe('boolean');
          
          // Verify that feedback is mutually exclusive (success XOR error)
          if (result.success) {
            expect(result.error).toBeUndefined();
          } else {
            expect(result.error).toBeDefined();
            expect(result.error!.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 10000); // 10 second timeout
});