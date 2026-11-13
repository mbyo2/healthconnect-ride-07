import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Phantom tables + phantom columns (audit workstream C, 2026-11-13).
// Three tables do not exist live (booking_widgets, connections,
// promoted_listings) and 19 columns across 8 tables were phantom — every
// affected select 400'd/404'd on PostgREST, so the feature failed outright.
// These tests pin the fixed select lists to the LIVE column names (verified
// against live information_schema); live behaviour is proven by the
// scripted PostgREST replay with a real QA-user JWT.

const readSrc = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('Phantom tables · dead feature paths removed, not re-pointed', () => {
  it('BookingWidgetManager and PromotedListingManager are deleted (nothing imported them; no widget.js, no /book/ route)', () => {
    expect(existsSync(resolve(process.cwd(), 'src/components/provider/BookingWidgetManager.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'src/components/provider/PromotedListingManager.tsx'))).toBe(false);
  });

  it('connection-workflows is deleted (nothing called it; live connections run on user_connections via useConnections)', () => {
    expect(existsSync(resolve(process.cwd(), 'src/utils/connection-workflows.ts'))).toBe(false);
  });

  it('no live code references the three phantom tables', () => {
    const files = [
      'src/types/connections.ts',
      'src/hooks/useConnections.ts',
      'src/components/marketplace/PatientOrderTracking.tsx',
    ];
    for (const f of files) {
      const src = readSrc(f);
      expect(src).not.toContain("from('booking_widgets')");
      expect(src).not.toContain("from('promoted_listings')");
      expect(src).not.toContain("from('connections')");
    }
  });
});

describe('Phantom columns · fixed selects use only live columns', () => {
  it('ERPAdministration: billing_invoices.status (not payment_status); staff_schedules staff_id/shift_start/shift_end', () => {
    const src = readSrc('src/components/erp/ERPAdministration.tsx');
    expect(src).toContain('select("id, invoice_number, total_amount, balance, status, created_at")');
    expect(src).toContain('select("staff_id, shift_type, shift_start, shift_end")');
    expect(src).not.toContain('payment_status, created_at');
    expect(src).not.toContain('user_id, shift_type, start_time, end_time');
    expect(src).not.toContain('s.start_time');
    expect(src).not.toContain('s.end_time');
  });

  it('MultiCountryAccounting: chart_of_accounts account_code/account_name; journal legs in journal_entry_lines', () => {
    const src = readSrc('src/components/accounting/MultiCountryAccounting.tsx');
    expect(src).toContain('select("id, account_code, account_name, account_type")');
    expect(src).toContain('.order("account_code")');
    expect(src).toContain('select("id, entry_number, entry_date, reference_number, description, total_debit, total_credit")');
    expect(src).toContain('.from("journal_entry_lines")');
    expect(src).toContain('select("journal_entry_id, account_id, debit_amount, credit_amount, line_number")');
    expect(src).not.toContain('select("id, code, name, account_type")');
    expect(src).not.toContain('reference, description, debit_account, credit_account, amount');
    expect(src).not.toContain('debit_account:');
    expect(src).not.toContain('credit_account:');
    expect(src).not.toContain('posted_by:');
    expect(src).not.toContain('balance: 0');
  });

  it('PaymentSuccess: payments.external_payment_id (not reference/transaction_id)', () => {
    const src = readSrc('src/pages/PaymentSuccess.tsx');
    expect(src).toContain("select('metadata, amount, currency, payment_method, external_payment_id')");
    expect(src).toContain("select('status, amount, currency, payment_method, external_payment_id')");
    expect(src).not.toContain('reference, transaction_id');
  });

  it('PatientOrderTracking: delivery_tracking.driver_id (not courier_id)', () => {
    const src = readSrc('src/components/marketplace/PatientOrderTracking.tsx');
    expect(src).toContain('tracking_notes, updated_at, driver_id');
    expect(src).not.toContain('courier_id');
  });

  it('LiveDeliveryMap: no pickup/dropoff lat/lng; courier by user_id = driver_id (no FK for an embed)', () => {
    const src = readSrc('src/components/delivery/LiveDeliveryMap.tsx');
    expect(src).toContain('.select("id, status, driver_id")');
    expect(src).toContain(".from(\"couriers\")");
    expect(src).toContain('select("id, full_name, current_latitude, current_longitude, vehicle_type")');
    expect(src).toContain(".eq(\"user_id\", data.driver_id)");
    expect(src).not.toContain('courier:couriers(');
    expect(src).not.toContain('pickup_lat');
    expect(src).not.toContain('pickup_lng');
    expect(src).not.toContain('dropoff_lat');
    expect(src).not.toContain('dropoff_lng');
    expect(src).not.toContain('current_lat,');
    expect(src).not.toContain('current_lng');
  });

  it('useCXODashboard: queue_tokens.serving_start_time (not called_at)', () => {
    const src = readSrc('src/hooks/useCXODashboard.ts');
    expect(src).toContain("select('created_at, serving_start_time')");
    expect(src).toContain(".not('serving_start_time', 'is', null)");
    expect(src).not.toContain('called_at');
  });

  it('AdvancedDashboard: profiles.specialty in the provider embed (not specialization)', () => {
    const src = readSrc('src/pages/AdvancedDashboard.tsx');
    expect(src).not.toContain('specialization,');
    expect(src).not.toContain('apt.provider?.specialization');
  });
});
