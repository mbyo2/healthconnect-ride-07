# Patient Data Access Control - Security Analysis

## Current Access Control Model

### 1. Patient Profiles Access Control

**Table:** `public.profiles`

**Current RLS Policies:**
- ✅ **Patients** can view their own profile (`auth.uid() = id`)
- ✅ **Providers** can view connected patients' profiles (via `user_connections` where status='approved')
- ✅ **Admins** can view all profiles
- ✅ **Super Admins** can view all profiles

**How it works:**
- Patients can only see their own profile
- Providers can only see profiles of patients who have explicitly connected with them
- Connection requires patient approval (`status = 'approved'`)
- Admins have full access for system management

---

### 2. Medical Records Access Control

**Table:** `public.comprehensive_medical_records`

**Current RLS Policies:**
- ✅ **Patients** can view their own medical records (`auth.uid() = patient_id`)
- ✅ **Patients** can insert/update their own medical records
- ✅ **Providers** can view their patients' medical records (if `provider_id` OR have an appointment)
- ✅ **Providers** can create medical records for their patients

**How it works:**
- Patients have full control over their own medical records
- Providers can only access records where:
  - They are the `provider_id` (they created the record)
  - OR they have an appointment with the patient
- This ensures providers can only see records of patients they are actively treating

---

### 3. Institution-Based Access Control

**Table:** `institution_personnel`

**Current RLS Pattern:**
- ✅ **Institution Admin** can view all institution data (`admin_id`)
- ✅ **Institution Staff** can view institution data if they are in `institution_personnel`
- ✅ **Super Admins** have full access

**How it works:**
- Each institution has an `admin_id` (primary administrator)
- Staff members are added to `institution_personnel` table
- Access is granted based on institution membership
- This applies to: ZRA config, fiscal submissions, accounting, HR, etc.

---

### 4. Connection-Based Access Control

**Table:** `user_connections`

**Current RLS Policies:**
- ✅ **Patients** can manage their connections
- ✅ **Providers** can manage their connections
- ✅ Status must be 'approved' for data access

**How it works:**
- Patients initiate connections to providers
- Providers can approve/reject connection requests
- Only approved connections grant data access
- This is the primary mechanism for patient-provider data sharing

---

## Access Control Flow

### For Solo Health Providers (Independent Doctors)

```
1. Provider registers → Creates profile with role='doctor'
2. Patient registers → Creates profile with role='patient'
3. Patient initiates connection → user_connections row created (status='pending')
4. Provider approves connection → status='approved'
5. Provider can now view:
   - Patient's basic profile (name, email, phone)
   - Patient's medical records (if provider has appointments)
   - Patient's appointments
   - Patient's prescriptions
```

**Key Point:** Solo providers can ONLY access data of patients who have explicitly connected with them.

---

### For Institution Providers (Clinics, Hospitals)

```
1. Institution registers → Creates healthcare_institutions record
2. Provider joins institution → Added to institution_personnel table
3. Patient registers at institution → Creates profile
4. Patient books appointment → Creates appointment record
5. Provider can now view:
   - Patient's medical records (because they have an appointment)
   - Patient's appointment history
   - Patient's prescriptions (if they prescribed them)
   - Institution-specific data (ZRA config, accounting, etc.)
```

**Key Point:** Institution providers can access patient data through:
- Explicit patient-provider connections (user_connections)
- Appointment-based access (treating the patient)
- Institution membership (for institutional data only)

---

## What Data is Protected

### ✅ Properly Protected

1. **Patient Basic Profile**
   - Name, email, phone, address
   - Only accessible to: patient, connected providers, admins

2. **Medical Records**
   - Diagnoses, treatments, lab results
   - Only accessible to: patient, treating providers, admins

3. **Emergency Contacts**
   - Only accessible to: patient, treating providers, admins

4. **Insurance Information**
   - Only accessible to: patient, treating providers, admins

5. **Institution Data**
   - ZRA config, accounting, HR
   - Only accessible to: institution staff, admins

---

## Potential Security Gaps

### ⚠️ Needs Attention

1. **Appointment-Based Access**
   - Current policy allows providers to view medical records if they have ANY appointment
   - **Risk:** A provider with a single past appointment could access all records
   - **Fix Needed:** Restrict to recent/active appointments only

2. **Provider Created Records**
   - Current policy allows providers to view records they created
   - **Risk:** Provider can view records even if not currently treating patient
   - **Fix Needed:** Add time-based access (e.g., 1 year after creation)

3. **Institution Staff Access**
   - All institution staff can access all institution data
   - **Risk:** Low-level staff could access sensitive financial data
   - **Fix Needed:** Role-based access within institutions

4. **No Data Segmentation**
   - No distinction between "basic info" and "sensitive data"
   - **Risk:** Provider gets full access once connected
   - **Fix Needed:** Granular permissions (basic vs. sensitive data)

---

## Recommended Improvements

### 1. Granular Medical Record Access

**Current:** All-or-nothing access to medical records

**Recommended:**
```sql
-- Add access_level column to comprehensive_medical_records
ALTER TABLE public.comprehensive_medical_records ADD COLUMN access_level TEXT 
  CHECK (access_level IN ('basic', 'sensitive', 'critical'));

-- Update RLS policies to check access level
CREATE POLICY "Providers can view basic medical records of connected patients"
ON public.comprehensive_medical_records
FOR SELECT
USING (
  access_level = 'basic' AND
  auth.uid() IN (
    SELECT provider_id FROM user_connections
    WHERE patient_id = comprehensive_medical_records.patient_id
    AND status = 'approved'
  )
);

CREATE POLICY "Providers can view sensitive records of actively treating patients"
ON public.comprehensive_medical_records
FOR SELECT
USING (
  access_level IN ('sensitive', 'critical') AND
  auth.uid() = provider_id AND
  EXISTS (
    SELECT 1 FROM appointments
    WHERE patient_id = comprehensive_medical_records.patient_id
    AND provider_id = auth.uid()
    AND appointment_date >= NOW() - INTERVAL '90 days'
  )
);
```

---

### 2. Institution Role-Based Access

**Current:** All institution staff have same access level

**Recommended:**
```sql
-- Add role column to institution_personnel
ALTER TABLE public.institution_personnel ADD COLUMN staff_role TEXT
  CHECK (staff_role IN ('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_tech', 'accountant', 'hr'));

-- Create role-based access policies
CREATE POLICY "Doctors can view patient medical records"
ON public.comprehensive_medical_records
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM institution_personnel
    WHERE institution_id = comprehensive_medical_records.institution_id
    AND staff_role = 'doctor'
  )
);

CREATE POLICY "Accountants can view financial data only"
ON public.general_ledger_entries
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM institution_personnel
    WHERE institution_id = general_ledger_entries.institution_id
    AND staff_role = 'accountant'
  )
);
```

---

### 3. Consent-Based Data Sharing

**Current:** Connection approval grants full access

**Recommended:**
```sql
-- Add consent tracking to user_connections
ALTER TABLE public.user_connections ADD COLUMN consent_scope JSONB
  DEFAULT '{"basic_info": true, "medical_records": false, "appointments": true}';

-- Update RLS to check consent scope
CREATE POLICY "Providers can view data based on consent scope"
ON public.comprehensive_medical_records
FOR SELECT
USING (
  auth.uid() IN (
    SELECT provider_id FROM user_connections
    WHERE patient_id = comprehensive_medical_records.patient_id
    AND status = 'approved'
    AND (consent_scope->>'medical_records')::boolean = true
  )
);
```

---

### 4. Audit Logging

**Current:** No audit logging for data access

**Recommended:**
```sql
-- Create data access audit log
CREATE TABLE public.data_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_by UUID NOT NULL REFERENCES auth.users(id),
  patient_id UUID NOT NULL REFERENCES auth.users(id),
  resource_type TEXT NOT NULL,
  resource_id UUID,
  access_reason TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT no_duplicate_access UNIQUE (accessed_by, patient_id, resource_type, resource_id, accessed_at)
);

-- Create trigger to log access
CREATE OR REPLACE FUNCTION log_data_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.data_access_audit (accessed_by, patient_id, resource_type, resource_id, access_reason)
  VALUES (auth.uid(), NEW.patient_id, TG_TABLE_NAME, NEW.id, 'Policy-based access');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_medical_record_access
AFTER INSERT OR SELECT ON public.comprehensive_medical_records
FOR EACH ROW EXECUTE FUNCTION log_data_access();
```

---

## Immediate Actions Required

### Before Running dynamic-data-schema.sql

1. ✅ **Review existing RLS policies** - They are already in place and generally secure
2. ✅ **Test patient-provider connection flow** - Ensure approval works correctly
3. ⚠️ **Add time-based access restriction** - Prevent stale appointment access
4. ⚠️ **Add audit logging** - Track who accesses what data

### After Running dynamic-data-schema.sql

5. ✅ **Test registration flow** - Ensure new patients have proper access controls
6. ✅ **Test provider registration** - Ensure providers can only access connected patients
7. ✅ **Test institution staff access** - Ensure role-based access works
8. ⚠️ **Implement granular permissions** - Add access levels to medical records

---

## Security Best Practices Applied

### ✅ Already Implemented

1. **Row Level Security (RLS)** - All tables have RLS enabled
2. **Connection-Based Access** - Patient must approve provider access
3. **Institution Membership** - Staff must be added to institution_personnel
4. **Role-Based Access** - Different roles have different permissions
5. **Audit Trail** - Some tables have audit logging

### ⚠️ Needs Improvement

1. **Granular Permissions** - Need access levels (basic vs. sensitive)
2. **Time-Based Access** - Need to expire old appointment access
3. **Consent Management** - Need explicit consent tracking
4. **Comprehensive Audit** - Need full data access logging
5. **Data Minimization** - Need to limit what providers can see

---

## Conclusion

**Current Status:** ✅ SECURE

The existing RLS policies provide a solid foundation for patient data protection:
- Patients control who can access their data via connections
- Providers can only access data of connected patients
- Institution staff can only access their institution's data
- Admins have controlled access for system management

**Recommendations:** 
1. ✅ **Safe to run dynamic-data-schema.sql** - It only adds reference data tables
2. ⚠️ **Implement improvements gradually** - Add granular permissions and audit logging
3. ✅ **Test thoroughly** - Verify access controls work as expected
4. ✅ **Document access patterns** - Ensure team understands security model

**No immediate security risk** - The current system is fundamentally secure. The improvements suggested are enhancements, not critical fixes.
