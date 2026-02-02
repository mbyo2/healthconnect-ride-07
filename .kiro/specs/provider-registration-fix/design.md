# Design Document

## Overview

The provider registration system currently has a critical flaw where healthcare providers can submit applications but are not automatically granted provider roles or redirected to the appropriate dashboard. The current implementation only creates entries in the `health_personnel_applications` table but does not complete the user account setup process.

This design addresses the gap by implementing a complete registration workflow that:
1. Creates user accounts with proper authentication
2. Assigns provider roles through the user roles system
3. Creates complete user profiles
4. Implements proper role-based redirection
5. Provides comprehensive error handling and user feedback

## Architecture

The solution follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  HealthPersonnelApplicationForm + HealthcareApplication     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                            │
│           ProviderRegistrationService                       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  Supabase Auth + Profiles + User Roles + Applications      │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Enhanced HealthPersonnelApplicationForm
- **Purpose**: Collect provider registration data and handle complete account creation
- **Key Changes**: 
  - Add user account creation fields (email, password)
  - Implement transaction-based registration process
  - Add comprehensive validation and error handling
  - Integrate with role assignment system

### ProviderRegistrationService
- **Purpose**: Orchestrate the complete provider registration workflow
- **Responsibilities**:
  - User account creation via Supabase Auth
  - Profile creation and completion
  - Role assignment through user_roles table
  - Application record creation
  - Transaction management and rollback

### Enhanced AuthContext Integration
- **Purpose**: Ensure seamless authentication flow after registration
- **Key Changes**:
  - Automatic sign-in after successful registration
  - Profile refresh to include new role data
  - Integration with role-based redirection system

## Data Models

### Extended Registration Form Data
```typescript
interface ProviderRegistrationData {
  // User Account Fields
  email: string;
  password: string;
  confirmPassword: string;
  
  // Profile Fields
  full_name: string;
  phone_number?: string;
  
  // Provider-Specific Fields
  license_number: string;
  specialty: string;
  years_of_experience: number;
  documents_url?: string[];
}
```

### Registration Transaction State
```typescript
interface RegistrationTransaction {
  userId?: string;
  profileCreated: boolean;
  roleAssigned: boolean;
  applicationCreated: boolean;
  authenticationComplete: boolean;
}
```

## Correctness Properties
*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After reviewing the acceptance criteria, several properties can be consolidated to eliminate redundancy:

**Property Reflection:**
- Properties 1.1, 1.2, 1.3, and 1.4 can be combined into a comprehensive registration flow property
- Properties 2.1, 2.3, and 2.5 overlap in testing form validation states and can be consolidated
- Properties 3.1, 3.2, and 3.3 all test transaction behavior and can be unified
- Properties 4.2 and 4.3 both test user feedback and can be combined

**Property 1: Complete registration workflow**
*For any* valid provider registration data, submitting the form should result in a new user account with health_personnel role, complete profile data, automatic authentication, and redirection to the Provider Dashboard
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

**Property 2: Form validation consistency**
*For any* form input state, the submit button should be enabled if and only if all required fields are valid and no fields contain invalid data
**Validates: Requirements 2.1, 2.3, 2.5**

**Property 3: Validation error specificity**
*For any* invalid form input, the system should display specific error messages that clearly identify which fields are invalid and why
**Validates: Requirements 2.2, 2.4**

**Property 4: Transaction atomicity**
*For any* registration attempt, either all registration steps (account creation, profile creation, role assignment, application creation) should succeed together, or all should fail together with no partial state
**Validates: Requirements 3.1, 3.2, 3.3**

**Property 5: Error handling and data preservation**
*For any* registration failure, the system should display clear error messages and preserve all previously entered valid form data
**Validates: Requirements 1.5, 4.3, 4.5**

**Property 6: User feedback consistency**
*For any* registration state change (processing, success, failure), the system should provide appropriate visual feedback through loading indicators, success messages, or error messages
**Validates: Requirements 4.1, 4.2, 4.4**

**Property 7: Retry mechanism reliability**
*For any* network failure during registration, the system should retry failed operations up to three times before displaying an error, and log detailed error information for debugging
**Validates: Requirements 3.4, 3.5**

## Error Handling

### Validation Errors
- **Field-level validation**: Real-time validation with specific error messages
- **Form-level validation**: Comprehensive validation before submission
- **Cross-field validation**: Password confirmation, email format verification

### Registration Process Errors
- **Authentication failures**: Invalid credentials, email already exists
- **Database errors**: Connection issues, constraint violations, transaction failures
- **Network errors**: Timeout handling, retry mechanisms with exponential backoff
- **Role assignment errors**: User roles table constraints, permission issues

### User Experience Errors
- **Loading states**: Clear progress indicators during async operations
- **Error recovery**: Preserved form data, clear retry instructions
- **Success feedback**: Confirmation messages before redirection

## Testing Strategy

### Dual Testing Approach
The testing strategy employs both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Testing**:
- Specific examples of successful registration flows
- Edge cases like duplicate emails, invalid license numbers
- Integration points between authentication and role assignment
- Error boundary testing for network failures

**Property-Based Testing**:
- Uses **fast-check** library for JavaScript/TypeScript property-based testing
- Each property-based test runs a minimum of 100 iterations
- Tests universal properties across all valid input combinations
- Each test is tagged with the format: **Feature: provider-registration-fix, Property {number}: {property_text}**

**Property-Based Test Requirements**:
- Property 1: Generate random valid registration data and verify complete workflow
- Property 2: Generate various form states and verify submit button behavior
- Property 3: Generate invalid inputs and verify error message specificity
- Property 4: Test transaction atomicity with simulated failures at different steps
- Property 5: Test error handling with various failure scenarios
- Property 6: Test user feedback across different registration states
- Property 7: Test retry mechanisms with simulated network failures

**Test Configuration**:
- Minimum 100 iterations per property test
- Custom generators for valid registration data, email formats, license numbers
- Failure injection utilities for testing error scenarios
- Database transaction monitoring for atomicity verification