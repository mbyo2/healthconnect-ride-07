# ZRA Smart Invoice Integration - Optional Architecture

## Core Principle: **Zero Dependency on ZRA**

The Doc 0 Clock HMS **works completely normally** without ZRA Smart Invoice integration. ZRA is an **optional add-on** that only affects institutions that explicitly enable it.

## How It Works

### Normal Flow (Without ZRA)
```
Patient Appointment → Consultation → Invoice → Payment → Receipt
                                        ↓
                                  Complete Transaction
```

### ZRA-Enabled Flow (With ZRA)
```
Patient Appointment → Consultation → Invoice → Payment → Receipt
                                        ↓
                                  Complete Transaction
                                        ↓
                            (Asynchronous Background)
                            Queue Fiscal Submission → VSDC → ZRA
```

## Key Guarantees

### 1. **No Blocking Operations**
- ✅ Invoices are created and completed **before** any ZRA interaction
- ✅ Payments are processed normally
- ✅ Receipts are generated normally
- ✅ Pharmacy sales work normally
- ✅ No operation requires ZRA to succeed

### 2. **Asynchronous Fiscalization**
- ZRA submission happens in the **background**
- If ZRA is down/unavailable, invoices are **queued for retry**
- Clinical operations are **never blocked** by ZRA failures
- Users see "Queued for Smart Invoice" status but can continue working

### 3. **Feature Flag Per Institution**
Each institution has a `smart_invoice_status`:
- `not_connected` - Default. No ZRA integration. All features work normally.
- `pending_setup` - Institution is configuring ZRA but not yet active
- `sandbox` - Testing environment
- `active` - Production ZRA integration enabled
- `suspended` - Temporarily disabled (e.g., technical issues)
- `error` - Configuration error, needs admin attention

### 4. **Code Pattern**

```typescript
// When creating an invoice
const needsZraSubmission = institution.smart_invoice_status === "active";

// Create the invoice first (always succeeds)
await createInvoice(invoiceData);

// Then, optionally, queue fiscal submission
if (needsZraSubmission) {
  await createFiscalSubmission({
    invoice_id: invoice.id,
    status: "queued",  // Async, non-blocking
  });
} else {
  // Or skip entirely
  await createFiscalSubmission({
    invoice_id: invoice.id,
    status: "not_required",
  });
}
```

## Database Schema Design

### Institution Smart Invoice Settings
```sql
institution_smart_invoice_settings
├── status (default: 'not_connected')
├── environment (sandbox/production)
├── tpin, bhf_id, device_serial_number
└── vsdc_base_url
```

### Fiscal Submissions
```sql
fiscal_submissions
├── invoice_id (references payments table)
├── status (not_required, queued, submitted, accepted, rejected, retrying)
├── attempt_count
└── idempotency_key (prevents duplicate submissions)
```

**Critical Design:**
- ✅ `fiscal_submissions` has a **foreign key to `payments`** (one-way relationship)
- ✅ `payments` table has **NO foreign key to `fiscal_submissions`**
- ✅ This means: Payments can exist without any fiscal submission
- ✅ Fiscal submissions are **optional children** of payments
- ✅ Deleting a fiscal submission does NOT delete the payment
- ✅ Creating a payment does NOT require creating a fiscal submission

**Data Flow:**
```
1. Create payment (ALWAYS succeeds, no ZRA dependency)
2. Optionally create fiscal_submission (only if ZRA is enabled)
3. If fiscal_submission fails, payment still exists and is valid
```

## What Works Without ZRA

### ✅ All Core Features
- Patient registration and management
- Appointments and scheduling
- Consultations and medical records
- Prescriptions and pharmacy
- Lab tests and diagnostics
- Invoicing and billing
- Payments and receipts
- Inventory management
- Staff management
- Reports and analytics
- Multi-center management
- Enterprise accounting (GL, assets, bank reconciliation)
- PAYE tax calculations
- Medical shift HR
- Zambia compliance (NHIMA, Medical Council)

### ❌ What Requires ZRA (Optional)
- Automatic fiscal submission to ZRA
- ZRA invoice number tracking
- Fiscal audit trail (institution-specific)

## Error Handling

### If ZRA is Not Configured
```typescript
// Check before any ZRA operation
if (!settings || settings.status === "not_connected") {
  // Skip ZRA operations
  return { status: "not_required" };
}
```

### If ZRA is Down
```typescript
// Queue for retry with exponential backoff
await supabase.from("fiscal_submissions").update({
  status: "retrying",
  next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
});
```

### If VSDC Container is Stopped
```typescript
// Log error, queue for retry
await supabase.from("vsdc_operation_logs").insert({
  operation_type: "submit_sale",
  operation_status: "error",
  error_message: "VSDC container unreachable",
});
```

## User Experience

### For Institutions Without ZRA
- All features work normally
- No Smart Invoice button visible
- No fiscal submission indicators
- Normal invoice workflow

### For Institutions With ZRA (Sandbox)
- "ZRA Smart Invoice" button visible
- Dashboard shows "Sandbox Environment"
- Can test fiscal submissions
- Test invoices don't affect production

### For Institutions With ZRA (Production)
- "ZRA Smart Invoice" button visible
- Dashboard shows "Active"
- Invoices show fiscal status
- Accepted invoices get ZRA invoice number
- Failed invoices can be retried

## Migration Path

### Phase 1: Launch Without ZRA (Current State)
- Deploy HMS with all features
- All institutions work normally
- No ZRA dependency

### Phase 2: Add ZRA Tables (Optional)
- Run `zra-vsdc-fiscal-schema.sql`
- No impact on existing data
- All features continue working

### Phase 3: Enable for Pilot Institutions
- Configure ZRA for test institutions
- Deploy VSDC gateway service
- Test sandbox flow
- Monitor and validate

### Phase 4: Roll Out to Production
- Enable for interested institutions
- Each institution registers with ZRA independently
- Doc 0 Clock manages hosting and infrastructure
- HMS continues working for all institutions

## Deployment Checklist

### Before Launch
- ✅ Ensure all payment flows work without ZRA tables
- ✅ Ensure fiscal_submission status defaults to 'not_required'
- ✅ Ensure no foreign key constraints on payments require fiscal_submissions
- ✅ Test complete patient-to-payment flow

### After ZRA Tables Added
- ✅ Test that existing invoices still work
- ✅ Test that new invoices work without ZRA configured
- ✅ Verify fiscal_submission creation is truly optional
- ✅ Check that no errors occur when settings table is empty

## Support Commitment

**We guarantee:**
1. The HMS works 100% without ZRA Smart Invoice
2. No core feature requires ZRA integration
3. ZRA is an optional add-on for interested institutions
4. Clinical operations are never blocked by ZRA failures
5. Invoices, payments, and receipts work normally regardless of ZRA status

**If any error occurs without ZRA configured:**
- It's a bug that we will fix immediately
- The architecture is designed to prevent this
- Report the issue and we'll resolve it

## Testing Procedure

### Test 1: Normal Flow (No ZRA)
1. Create patient
2. Book appointment
3. Complete consultation
4. Create invoice
5. Process payment
6. Generate receipt
7. **Expected:** All steps complete successfully

### Test 2: ZRA Not Configured
1. Check `institution_smart_invoice_settings` table (should be empty)
2. Create invoice
3. Check `fiscal_submissions` table (should have status='not_required')
4. **Expected:** Invoice created successfully, no errors

### Test 3: ZRA Enabled (Sandbox)
1. Configure institution with status='sandbox'
2. Create invoice
3. Check `fiscal_submissions` table (should have status='queued')
4. **Expected:** Invoice created successfully, fiscal submission queued

### Test 4: ZRA Down (Testing Resilience)
1. Enable ZRA with status='active'
2. Stop VSDC container
3. Create invoice
4. Check `fiscal_submissions` table (should have status='retrying')
5. **Expected:** Invoice created successfully, queued for retry

## Conclusion

The ZRA Smart Invoice integration is **100% optional** and **non-blocking**. The HMS works completely normally without it, and institutions can enable it when ready without any impact on existing operations.
