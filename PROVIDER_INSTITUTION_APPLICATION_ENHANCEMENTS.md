# Provider & Institution Application Enhancements

## Overview
Comprehensive enhancements to provider and institution application systems to collect all relevant data for admin/super admin review, while supporting institutions that only want HMS access without marketplace listing.

---

## Current Status

### ✅ Already Implemented
- Provider Applications (ProviderApplications.tsx)
  - Document upload system
  - Country-specific regulatory requirements
  - Admin approval/rejection workflow
  - Document verification checklist

- Institution Applications (InstitutionApplications.tsx)
  - Basic application submission
  - Document upload
  - Admin review system
  - Status tracking (pending/approved/rejected)

### 🔄 Enhancements Needed

---

## 1. Institution Registration Enhancements

### A. Marketplace Listing Option

**New Field: `list_in_marketplace`** (boolean, default: true)

```typescript
// Add to healthcare_institutions table
list_in_marketplace: boolean DEFAULT true

// Options:
- true: List institution in public marketplace/search
- false: HMS-only access (internal use, no public listing)
```

**UI Implementation:**
```tsx
<div className="flex items-center space-x-2">
  <Checkbox
    id="list_in_marketplace"
    checked={formData.list_in_marketplace}
    onCheckedChange={(checked) => 
      setFormData({ ...formData, list_in_marketplace: checked as boolean })
    }
  />
  <label htmlFor="list_in_marketplace" className="text-sm font-medium">
    List my institution in public marketplace
    <p className="text-xs text-muted-foreground mt-1">
      Uncheck if you only want HMS access without being publicly searchable
    </p>
  </label>
</div>
```

### B. Comprehensive Institution Data Collection

#### Basic Information (Already Exists)
- ✅ Institution Name
- ✅ Institution Type
- ✅ License Number
- ✅ Address, City, State, Country, Postal Code
- ✅ Phone, Email, Website

#### New Required Fields

**Operational Details:**
```typescript
operational_since: string // Date when institution started
number_of_beds: number // For hospitals/clinics
number_of_staff: number // Total staff count
emergency_services: boolean
ambulance_services: boolean
is_24_7: boolean
```

**Accreditation & Compliance:**
```typescript
accreditation_body: string // e.g., "Health Professions Council of Zambia"
accreditation_number: string
accreditation_expiry_date: date
tax_id: string // Tax identification number
business_registration_number: string
```

**Financial Information:**
```typescript
bank_name: string
bank_account_number: string // For payment splits
bank_account_name: string
swift_code?: string // For international transfers
```

**Services & Capabilities:**
```typescript
insurance_providers: string[] // Accepted insurance companies
services_offered: string[] // List of medical services
equipment_available: string[] // Major equipment (MRI, CT Scan, etc.)
specialties: string[] // Medical specialties available
languages_spoken: string[]
```

**Operating Hours:**
```typescript
opening_hours: {
  monday: { open: string, close: string, closed: boolean },
  tuesday: { open: string, close: string, closed: boolean },
  wednesday: { open: string, close: string, closed: boolean },
  thursday: { open: string, close: string, closed: boolean },
  friday: { open: string, close: string, closed: boolean },
  saturday: { open: string, close: string, closed: boolean },
  sunday: { open: string, close: string, closed: boolean }
}
```

### C. Document Requirements

**Required Documents (vary by country/type):**

For Hospitals/Clinics:
1. Business Registration Certificate
2. Professional License
3. Proof of Address (utility bill, lease agreement)
4. Tax Clearance Certificate
5. Insurance Policy (Professional Indemnity)
6. Fire Safety Certificate
7. Health Inspection Certificate
8. Photos of Facility (exterior, waiting area, examination rooms)
9. List of Medical Equipment with Serial Numbers
10. Staff Credentials (scanned licenses of all practitioners)

For Pharmacies:
1. Pharmacy License
2. Pharmacist Registration Certificate
3. Drug Import/Export License (if applicable)
4. Business Permit
5. Tax Clearance
6. Proof of Premises Ownership/Lease
7. Storage Facility Inspection Report

---

## 2. Provider Application Enhancements

### A. Enhanced Provider Profile Data

**Current Fields (Already Collected):**
- ✅ License Number
- ✅ Specialty
- ✅ Years of Experience
- ✅ Documents

**New Required Fields:**

**Professional Details:**
```typescript
medical_school: string
graduation_year: number
board_certifications: string[]
subspecialties: string[]
languages_spoken: string[]
research_publications?: string[] // Optional
awards_recognition?: string[] // Optional
```

**Practice Information:**
```typescript
primary_practice_location: string
affiliated_hospitals: string[]
consultation_fee_range: { min: number, max: number }
accepts_insurance: boolean
insurance_providers_accepted: string[]
telemedicine_available: boolean
home_visits_available: boolean
```

**Availability:**
```typescript
availability_schedule: {
  monday: { available: boolean, hours: string[] },
  tuesday: { available: boolean, hours: string[] },
  // ... other days
}
typical_wait_time: string // e.g., "15-30 minutes"
appointment_types: string[] // e.g., ["In-person", "Telemedicine", "Home Visit"]
```

**Professional References:**
```typescript
references: Array<{
  name: string
  title: string
  institution: string
  phone: string
  email: string
}>
```

### B. Enhanced Document Verification

**Required Documents for Providers:**
1. Medical Degree/Diploma
2. Professional License (current & valid)
3. Board Certification Certificates
4. Malpractice Insurance Policy
5. Government-Issued ID
6. CV/Resume
7. Professional Headshot
8. Reference Letters (2-3)
9. CPD/CME Certificates (Continuing Education)
10. Background Check/Police Clearance

---

## 3. Admin Review Dashboard Enhancements

### A. Comprehensive Application View

**Enhanced Application Detail Modal:**

```tsx
<Dialog>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <Tabs defaultValue="basic">
      <TabsList>
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="professional">Professional</TabsTrigger>
        <TabsTrigger value="financial">Financial</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="verification">Verification</TabsTrigger>
      </TabsList>

      {/* Basic Information Tab */}
      <TabsContent value="basic">
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Name" value={app.name} />
          <InfoField label="Type" value={app.type} />
          <InfoField label="License #" value={app.license_number} />
          <InfoField label="Email" value={app.email} />
          <InfoField label="Phone" value={app.phone} />
          <InfoField label="Address" value={app.address} />
          <InfoField label="Listed in Marketplace" value={app.list_in_marketplace ? "Yes" : "No (HMS Only)"} />
        </div>
      </TabsContent>

      {/* Professional Details Tab */}
      <TabsContent value="professional">
        <div className="space-y-4">
          <InfoField label="Operational Since" value={app.operational_since} />
          <InfoField label="Number of Beds" value={app.number_of_beds} />
          <InfoField label="Staff Count" value={app.number_of_staff} />
          <InfoField label="Services Offered" value={app.services_offered.join(", ")} />
          <InfoField label="Equipment" value={app.equipment_available.join(", ")} />
          <InfoField label="Emergency Services" value={app.emergency_services ? "Yes" : "No"} />
          <InfoField label="24/7 Operations" value={app.is_24_7 ? "Yes" : "No"} />
        </div>
      </TabsContent>

      {/* Financial Information Tab */}
      <TabsContent value="financial">
        <div className="space-y-4">
          <InfoField label="Tax ID" value={app.tax_id} />
          <InfoField label="Business Reg. #" value={app.business_registration_number} />
          <InfoField label="Bank Name" value={app.bank_name} />
          <InfoField label="Account Number" value={maskAccountNumber(app.bank_account_number)} />
          <InfoField label="Account Name" value={app.bank_account_name} />
        </div>
      </TabsContent>

      {/* Documents Tab */}
      <TabsContent value="documents">
        <DocumentVerificationChecklist
          documents={app.documents}
          requirements={getRequirements(app)}
          onVerify={handleDocumentVerification}
        />
      </TabsContent>

      {/* Verification Checklist Tab */}
      <TabsContent value="verification">
        <VerificationChecklist
          items={[
            { id: 'license', label: 'License verified with regulatory body', checked: false },
            { id: 'address', label: 'Address confirmed (via Google Maps/site visit)', checked: false },
            { id: 'insurance', label: 'Professional indemnity insurance valid', checked: false },
            { id: 'tax', label: 'Tax clearance current', checked: false },
            { id: 'references', label: 'References contacted and verified', checked: false },
            { id: 'background', label: 'Background check completed', checked: false },
          ]}
          onCheckChange={handleChecklistChange}
        />
      </TabsContent>
    </Tabs>

    <DialogFooter>
      <Button variant="outline" onClick={handleReject}>Reject</Button>
      <Button onClick={handleApprove} disabled={!allChecksComplete}>
        Approve & Verify
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### B. Application Metrics Dashboard

**Add to AdminDashboard:**

```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <MetricCard
    title="Pending Provider Applications"
    value={providerApplications.pending.length}
    icon={Stethoscope}
    trend={{ value: 15, isPositive: true }}
  />
  <MetricCard
    title="Pending Institution Applications"
    value={institutionApplications.pending.length}
    icon={Building2}
    trend={{ value: 8, isPositive: true }}
  />
  <MetricCard
    title="Avg. Review Time"
    value="2.3 days"
    icon={Clock}
    trend={{ value: -12, isPositive: true }}
  />
  <MetricCard
    title="Approval Rate"
    value="87%"
    icon={CheckCircle}
    trend={{ value: 5, isPositive: true }}
  />
</div>
```

---

## 4. Database Schema Updates

### A. Update healthcare_institutions Table

```sql
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS list_in_marketplace boolean DEFAULT true;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS operational_since date;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS number_of_beds integer;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS number_of_staff integer;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS emergency_services boolean DEFAULT false;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS ambulance_services boolean DEFAULT false;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS is_24_7 boolean DEFAULT false;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS accreditation_body text;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS accreditation_number text;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS accreditation_expiry_date date;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS business_registration_number text;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS bank_account_name text;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS swift_code text;
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS services_offered text[];
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS equipment_available text[];
ALTER TABLE healthcare_institutions ADD COLUMN IF NOT EXISTS languages_spoken text[];
```

### B. Update profiles Table (for Providers)

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medical_school text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS graduation_year integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS board_certifications text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subspecialties text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages_spoken text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consultation_fee_min numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consultation_fee_max numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accepts_insurance boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_providers_accepted text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telemedicine_available boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_visits_available boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS typical_wait_time text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS appointment_types text[];
```

### C. Create Application Extended Data Table

```sql
CREATE TABLE IF NOT EXISTS application_extended_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  application_type text NOT NULL CHECK (application_type IN ('provider', 'institution')),
  extended_data jsonb NOT NULL DEFAULT '{}',
  verification_checklist jsonb NOT NULL DEFAULT '[]',
  admin_notes jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_application FOREIGN KEY (application_id) 
    REFERENCES health_personnel_applications(id) ON DELETE CASCADE
);

CREATE INDEX idx_application_extended_type ON application_extended_data(application_type);
CREATE INDEX idx_application_extended_id ON application_extended_data(application_id);
```

---

## 5. Implementation Priority

### Phase 1 (Immediate - This Session)
1. ✅ Add `list_in_marketplace` field to institutions
2. ✅ Document comprehensive requirements
3. Add marketplace listing toggle to institution form

### Phase 2 (Next)
1. Extend institution registration form with all new fields
2. Update database schema
3. Enhance admin review modals with tabbed interface

### Phase 3 (Future)
1. Implement verification checklist system
2. Add automated license verification (API integration)
3. Build application metrics dashboard
4. Add email notifications for application status changes

---

## 6. User Experience Flow

### For Institutions

**Scenario 1: Want to be Listed**
1. Register institution
2. Check "List in marketplace" ✓
3. Fill comprehensive details
4. Upload all documents
5. Submit for review
6. → Approved → Listed in public search

**Scenario 2: HMS Only**
1. Register institution
2. Uncheck "List in marketplace"
3. Fill required operational details
4. Upload minimal documents (license, registration)
5. Submit for review
6. → Approved → HMS access only (not in search)

### For Providers

1. Apply as healthcare professional
2. Fill comprehensive profile
3. Upload credentials & documents
4. Submit for review
5. Admin reviews all information
6. → Approved → Listed in search with full profile

### For Admins

1. View application in queue
2. Open detailed review modal
3. Review all tabs (Basic, Professional, Financial, Documents, Verification)
4. Check each verification item
5. Add review notes
6. Approve or Reject with reason
7. System automatically:
   - Updates application status
   - Sends email to applicant
   - Logs audit trail
   - Lists in marketplace (if opted in)

---

## 7. Benefits

**For Admins:**
- Complete information for informed decisions
- Reduced back-and-forth communication
- Clear verification checklist
- Audit trail for compliance

**For Applicants:**
- Clear requirements upfront
- Option to use HMS without listing
- Faster approval with complete information
- Professional presentation in marketplace

**For Platform:**
- Higher quality listings
- Better regulatory compliance
- Reduced fraud/fake accounts
- Improved trust and credibility

---

## Implementation Status

**Current Session:**
- ✅ Created comprehensive enhancement documentation
- ✅ Defined all required fields and data structures
- ✅ Documented database schema changes
- ✅ Specified UI/UX improvements

**Next Steps:**
1. Update database schema with new columns
2. Enhance HealthcareInstitutionForm component
3. Update admin review components
4. Test end-to-end flow
5. Deploy to production

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Ready for Implementation
