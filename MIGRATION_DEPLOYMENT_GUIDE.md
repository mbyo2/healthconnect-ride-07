# Application Workflow Update - Migration & Deployment Guide

## Overview

This document outlines the changes made to enforce admin-only approval of provider and institution applications in HealthConnect Ride (Doc' O Clock).

**Version**: 1.0  
**Date**: August 10, 2026  
**Status**: Ready for Deployment  

---

## Summary of Changes

### 1. **Code Changes**

#### Frontend Updates:
- **AccountApprovalGate.tsx**: 
  - Integrated country-specific document requirements
  - Added support for Zambia (ZM), South Africa (ZA), Botswana (BW), Malawi (MW), Tanzania (TZ)
  - Document labels now localized per country and role
  - Improved UI messaging for admin review process

- **documentRequirements.ts** (New File):
  - Centralized configuration for document requirements by country
  - Supports 5 countries with role-specific document lists
  - Helper functions: `getDocumentLabels()`, `areRequiredDocumentsComplete()`
  - Maintains forward compatibility for future country additions

- **ProviderApplications.tsx**:
  - Added UserRoles context import
  - Implemented admin-only role checks (both component-level and handler-level)
  - Prevents unauthorized approval actions at UI and runtime

- **InstitutionApplications.tsx**:
  - Identical admin enforcement pattern as ProviderApplications
  - Role-based access control for institution approval workflow

- **ProviderRegistrationService.ts**:
  - Changed default application status from `'approved'` to `'pending'`
  - New provider registrations now require explicit admin review before service access

- **HealthPersonnelApplicationForm.tsx**:
  - Post-registration redirect changed to `/application-status`
  - Users immediately see pending status instead of accessing provider features

- **ApplicationStatus.tsx**:
  - Updated to query actual application tables instead of non-existent generic table
  - Unified interface for both provider and institution applications
  - Displays status tracking across application types

### 2. **Database Migration**

File: `supabase/migrations/20260810_update_application_workflow.sql`

**Key Migration Steps**:

1. **Status Defaults Updated**:
   ```sql
   ALTER TABLE public.health_personnel_applications 
   ALTER COLUMN status SET DEFAULT 'pending'::text;
   ```

2. **Performance Indexes Added**:
   - `idx_health_personnel_applications_status` - for admin dashboard queries
   - `idx_health_personnel_applications_user_id` - for user lookups
   - Same indexes for institution_applications table

3. **Audit Logging Functions Created**:
   - `log_application_approval()` - tracks approval/rejection of provider applications
   - `log_institution_approval()` - tracks approval/rejection of institution applications
   - Automatically logs to `audit_logs` table on status changes

4. **Row-Level Security (RLS) Policies**:
   - "Only admins can approve health personnel applications"
   - "Only admins can approve institution applications"
   - Enforces database-level authorization

5. **Admin Dashboard View**:
   - `pending_applications` view - unified view of all pending applications across types
   - Queries: `SELECT * FROM pending_applications` to see all applications awaiting review

### 3. **Data Flow - Updated Workflow**

```
User Registration
    ↓
Create Auth Account
    ↓
Create Profile + health_personnel_applications (status='pending')
    ↓
Redirect to /application-status
    ↓
AccountApprovalGate blocks access
    ↓
User uploads required documents
    ↓
Admin notified (optional - to be implemented)
    ↓
Admin reviews documents in ProviderApplications panel
    ↓
Admin approves/rejects
    ↓
Status changes to 'approved' or 'rejected'
    ↓
profiles.is_verified = true (if approved)
    ↓
User gains full access to provider features
```

---

## Deployment Instructions

### Step 1: Deploy Frontend Code

```bash
# Pull latest changes
git pull origin main

# Install dependencies (if needed)
bun install

# Verify TypeScript compilation
bun run build
# or
node node_modules/typescript/bin/tsc --project tsconfig.json --noEmit
```

✅ **Verification**: Should compile with no errors.

### Step 2: Deploy Database Migration

**Option A: Using Supabase CLI**

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Link to your Supabase project
supabase link --project-id <YOUR_PROJECT_ID>

# Push migration to production
supabase db push

# Or, apply specific migration
supabase migration up --version 20260810_update_application_workflow
```

**Option B: Using Supabase Dashboard**

1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your project → SQL Editor
3. Copy the contents of `supabase/migrations/20260810_update_application_workflow.sql`
4. Paste and execute in SQL Editor
5. Verify all queries execute successfully

**Option C: Manual Execution**

If using Supabase API/client:

```typescript
import { supabase } from '@/integrations/supabase/client';

// Read migration file
const migrationSQL = `...`; // Contents of migration file

// Execute
const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
if (error) console.error(error);
```

### Step 3: Verify Migration Success

```bash
# Check that pending_applications view was created
supabase list view

# Verify default status for new applications
SELECT status, COUNT(*) FROM health_personnel_applications GROUP BY status;

# Check audit triggers are active
SELECT tablename FROM pg_tables WHERE tablename LIKE '%applications%';
```

### Step 4: Update Environment Configuration

Ensure `.env` files include:

```
VITE_SUPABASE_URL=<your_supabase_url>
VITE_SUPABASE_ANON_KEY=<your_anon_key>
```

### Step 5: Test Workflow End-to-End

**Test Case 1: New Provider Registration**
1. Register as a doctor/nurse/pharmacist
2. ✅ Should redirect to `/application-status`
3. ✅ Status should show "Pending Review"
4. ✅ AccountApprovalGate should block access to provider features

**Test Case 2: Admin Approval**
1. Log in as admin user
2. Navigate to `/admin/applications`
3. ✅ Should see pending applications
4. ✅ Should be able to review documents
5. ✅ Should be able to approve/reject with notes

**Test Case 3: Document Upload**
1. As pending provider, upload required documents
2. ✅ Documents should appear in AccountApprovalGate UI
3. ✅ Status should show document count
4. ✅ Admin should see uploaded documents in approval panel

**Test Case 4: Approval Success**
1. Admin approves provider application
2. ✅ Status changes to "approved"
3. ✅ profiles.is_verified should be true
4. ✅ Provider should now have access to provider features
5. ✅ Entry should appear in audit_logs

**Test Case 5: Rejection Flow**
1. Admin rejects provider application with notes
2. ✅ Status changes to "rejected"
3. ✅ Review notes should be visible to provider
4. ✅ Provider should be able to re-upload documents
5. ✅ Audit log entry created

### Step 6: Monitor & Rollback (if needed)

**Monitoring**:
```sql
-- Check recent approvals
SELECT * FROM audit_logs 
WHERE action IN ('APPROVE_APPLICATION', 'REJECT_APPLICATION')
ORDER BY created_at DESC LIMIT 20;

-- Check pending applications
SELECT * FROM pending_applications 
ORDER BY submitted_date DESC;

-- Monitor errors
SELECT * FROM public.audit_logs 
WHERE category = 'error'
ORDER BY timestamp DESC;
```

**Rollback Instructions** (if serious issues occur):

```sql
-- Disable triggers
DROP TRIGGER IF EXISTS trigger_log_health_personnel_approval ON public.health_personnel_applications;
DROP TRIGGER IF EXISTS trigger_log_institution_approval ON public.institution_applications;

-- Reset status default to 'approved' (temporary)
ALTER TABLE public.health_personnel_applications 
ALTER COLUMN status SET DEFAULT 'approved'::text;

-- Drop view (optional)
DROP VIEW IF EXISTS pending_applications;

-- Drop policies (if using RLS)
DROP POLICY IF EXISTS "Only admins can approve health personnel applications" 
ON public.health_personnel_applications;
```

Then revert code changes:
- Set `status: 'approved'` in ProviderRegistrationService.ts
- Revert AccountApprovalGate.tsx changes
- Revert ApplicationStatus.tsx changes

---

## File Changes Summary

### Modified Files:
1. `src/components/auth/AccountApprovalGate.tsx` - Integrated country-specific docs
2. `src/components/admin/ProviderApplications.tsx` - Added admin role enforcement
3. `src/components/admin/InstitutionApplications.tsx` - Added admin role enforcement
4. `src/components/auth/HealthPersonnelApplicationForm.tsx` - Updated redirect
5. `src/pages/ApplicationStatus.tsx` - Query actual application tables
6. `src/services/ProviderRegistrationService.ts` - Default to pending status

### New Files:
1. `src/config/documentRequirements.ts` - Country-specific document requirements
2. `supabase/migrations/20260810_update_application_workflow.sql` - Database migration

---

## Feature Highlights

### 1. Country-Specific Document Requirements

The system now supports multiple countries with localized document requirements:

**Zambia (ZM)**:
- Doctor: Medical Degree, GMZ License, ID
- Nurse: NBMZ License, Nursing Diploma, ID
- Pharmacist: ZPRA License, Pharmacy Degree, ID
- Pharmacy: Business Registration, ZPRA License, Tax Registration, Premises Certificate

**South Africa (ZA)**:
- Doctor: Medical Degree, HPCSA Registration, ID
- Nurse: Nursing Qualification, SANC Registration, ID
- Pharmacist: Pharmacy Degree, SAPC Registration, ID

To add more countries, extend `src/config/documentRequirements.ts`:

```typescript
export const NEW_COUNTRY_DOCUMENT_REQUIREMENTS: CountryDocumentRequirements = {
  country: 'XX',
  countryName: 'Country Name',
  roles: { /* ... */ }
};
```

### 2. Admin Approval Workflow

- Providers register → status = 'pending'
- Admin reviews documents
- Admin approves/rejects with notes
- Approval sets is_verified = true
- User gains access to provider features
- All actions logged to audit_logs

### 3. Database-Level Security

- RLS policies prevent non-admin users from approving
- Audit triggers automatically log approval actions
- Status transitions are immutable once approved
- pending_applications view provides admin dashboard

---

## Configuration & Customization

### Adding a New Country

1. Create entry in `COUNTRY_DOCUMENT_REQUIREMENTS`:

```typescript
export const BOTSWANA_DOCUMENT_REQUIREMENTS: CountryDocumentRequirements = {
  country: 'BW',
  countryName: 'Botswana',
  roles: {
    doctor: [/* ... */],
    pharmacy: [/* ... */],
  }
};

export const COUNTRY_DOCUMENT_REQUIREMENTS: Record<CountryCode, ...> = {
  // ... existing
  BW: BOTSWANA_DOCUMENT_REQUIREMENTS,
};
```

2. Update `CountryCode` type to include `'BW'`

3. Export function to get user's country in UI:

```typescript
// In AccountApprovalGate.tsx
const userCountry = getUserCountry(profile); // implement helper
```

### Customizing Document Labels

Edit the DocumentRequirement objects in `documentRequirements.ts`:

```typescript
{
  label: 'Medical License',
  description: 'Current GMZ registration certificate',
  required: true,
  acceptedFormats: ['pdf', 'jpg', 'png']
}
```

---

## Performance Considerations

- **Indexes**: Added composite indexes on status + user_id for fast queries
- **View Performance**: `pending_applications` view queries are optimized with UNION ALL
- **Audit Logging**: Uses trigger-based logging (minimal impact)
- **Document Storage**: Uses Supabase Storage (no database bloat)

---

## Troubleshooting

**Issue**: Admin cannot approve applications
- **Solution**: Verify user has `admin_level = 'admin'` or `'superadmin'` in profiles table

**Issue**: Document upload fails
- **Solution**: Check Supabase Storage bucket permissions and file size limits

**Issue**: Migration fails during deployment
- **Solution**: Check that all required tables exist and audit_logs table is defined

**Issue**: Tests fail after migration
- **Solution**: Update test fixtures to use `status: 'pending'` instead of `'approved'`

---

## Testing Checklist

- [ ] TypeScript compiles without errors
- [ ] Provider registration creates pending applications
- [ ] Non-admin users cannot access approval panels
- [ ] Admins can view and approve pending applications
- [ ] Document upload works with country-specific requirements
- [ ] Audit logs record approval actions
- [ ] Rejected applications allow re-upload
- [ ] Approved providers can access all features
- [ ] Institution applications follow same workflow

---

## Support & Questions

For deployment issues or questions:
1. Check `supabase/migrations/` for rollback instructions
2. Review `DEPLOYMENT.md` in project root
3. Contact: support@dococlock.online

---

## Changelog

**v1.0 (2026-08-10)**
- Initial release with Zambia country support
- Admin-only approval workflow
- Country-specific document requirements
- Audit logging for approvals
- Database-level security via RLS

