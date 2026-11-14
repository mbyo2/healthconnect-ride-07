-- 20261114_fix_auth_users_rls_policies.sql
-- Bug-free gate 2026-11-14 (F7, CRITICAL): 31 RLS policies on 14 tables
-- inlined `auth.uid() IN (SELECT users.id FROM auth.users WHERE ...)`
-- inside the policy predicate. The authenticated role has no SELECT on
-- auth.users, so EVERY read/write on those tables 403d live with
-- 42501 "permission denied for table users" (proven 2026-11-14 with a QA
-- patient JWT: all 14 tables 403 on plain SELECT). The template also
-- carried a tautology (institution_personnel.institution_id =
-- institution_personnel.institution_id, always true) instead of comparing
-- against the row's institution_id.
--
-- Fix: drop the 31 broken policies and replace them with the existing
-- SECURITY DEFINER helper public.user_affiliated_with_institution
-- (admin of the institution OR active institution_staff) — the same
-- helper the healthy medical_shifts policies already use. Command
-- parity is preserved per table; medical_shifts, zambia_medical_council_
-- config and zambia_tax_config keep their healthy policies and get no
-- replacement. paye_tax_slabs keeps its institution_id IS NULL carve-out
-- on SELECT. institution_personnel has 0 live rows, so the helper's
-- staff-only membership matches the original intent on live data.
-- Idempotent: DROP ... IF EXISTS + CREATE only where no healthy policy
-- already covers the command (see per-table notes).

-- ── asset_records: replace INSERT / SELECT / UPDATE ────────────────
DROP POLICY IF EXISTS "Users can insert asset records" ON public.asset_records;
DROP POLICY IF EXISTS "Users can view asset records" ON public.asset_records;
DROP POLICY IF EXISTS "Users can update asset records" ON public.asset_records;
CREATE POLICY "Users can insert asset records" ON public.asset_records
  FOR INSERT WITH CHECK (public.user_affiliated_with_institution(institution_id));
CREATE POLICY "Users can view asset records" ON public.asset_records
  FOR SELECT USING (public.user_affiliated_with_institution(institution_id));
CREATE POLICY "Users can update asset records" ON public.asset_records
  FOR UPDATE USING (public.user_affiliated_with_institution(institution_id))
  WITH CHECK (public.user_affiliated_with_institution(institution_id));

-- ── attendance_records: replace INSERT / SELECT ────────────────────
DROP POLICY IF EXISTS "Users can insert attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Users can view attendance records" ON public.attendance_records;
CREATE POLICY "Users can insert attendance records" ON public.attendance_records
  FOR INSERT WITH CHECK (public.user_affiliated_with_institution(institution_id));
CREATE POLICY "Users can view attendance records" ON public.attendance_records
  FOR SELECT USING (public.user_affiliated_with_institution(institution_id));

-- ── bank_reconciliations: replace INSERT / SELECT ──────────────────
DROP POLICY IF EXISTS "Users can insert bank reconciliations" ON public.bank_reconciliations;
DROP POLICY IF EXISTS "Users can view bank reconciliations" ON public.bank_reconciliations;
CREATE POLICY "Users can insert bank reconciliations" ON public.bank_reconciliations
  FOR INSERT WITH CHECK (public.user_affiliated_with_institution(institution_id));
CREATE POLICY "Users can view bank reconciliations" ON public.bank_reconciliations
  FOR SELECT USING (public.user_affiliated_with_institution(institution_id));

-- ── biometric_devices: replace INSERT / SELECT ─────────────────────
DROP POLICY IF EXISTS "Users can insert biometric devices" ON public.biometric_devices;
DROP POLICY IF EXISTS "Users can view biometric devices" ON public.biometric_devices;
CREATE POLICY "Users can insert biometric devices" ON public.biometric_devices
  FOR INSERT WITH CHECK (public.user_affiliated_with_institution(institution_id));
CREATE POLICY "Users can view biometric devices" ON public.biometric_devices
  FOR SELECT USING (public.user_affiliated_with_institution(institution_id));

-- ── employee_payroll: replace INSERT / SELECT ──────────────────────
DROP POLICY IF EXISTS "Users can insert employee payroll" ON public.employee_payroll;
DROP POLICY IF EXISTS "Users can view employee payroll" ON public.employee_payroll;
CREATE POLICY "Users can insert employee payroll" ON public.employee_payroll
  FOR INSERT WITH CHECK (public.user_affiliated_with_institution(institution_id));
CREATE POLICY "Users can view employee payroll" ON public.employee_payroll
  FOR SELECT USING (public.user_affiliated_with_institution(institution_id));

-- ── general_ledger_entries: replace INSERT / SELECT / UPDATE ───────
DROP POLICY IF EXISTS "Users can insert institution data" ON public.general_ledger_entries;
DROP POLICY IF EXISTS "Users can view institution data" ON public.general_ledger_entries;
DROP POLICY IF EXISTS "Users can update institution data" ON public.general_ledger_entries;
CREATE POLICY "Users can insert institution data" ON public.general_ledger_entries
  FOR INSERT WITH CHECK (public.user_affiliated_with_institution(institution_id));
CREATE POLICY "Users can view institution data" ON public.general_ledger_entries
  FOR SELECT USING (public.user_affiliated_with_institution(institution_id));
CREATE POLICY "Users can update institution data" ON public.general_ledger_entries
  FOR UPDATE USING (public.user_affiliated_with_institution(institution_id))
  WITH CHECK (public.user_affiliated_with_institution(institution_id));

-- ── medical_shifts: drop broken only; healthy ALL + SELECT remain ──
DROP POLICY IF EXISTS "Users can insert medical shifts" ON public.medical_shifts;
DROP POLICY IF EXISTS "Users can view medical shifts" ON public.medical_shifts;

-- ── paye_calculations: replace INSERT / SELECT ─────────────────────
DROP POLICY IF EXISTS "Users can insert PAYE calculations" ON public.paye_calculations;
DROP POLICY IF EXISTS "Users can view PAYE calculations" ON public.paye_calculations;
CREATE POLICY "Users can insert PAYE calculations" ON public.paye_calculations
  FOR INSERT WITH CHECK (public.user_affiliated_with_institution(institution_id));
CREATE POLICY "Users can view PAYE calculations" ON public.paye_calculations
  FOR SELECT USING (public.user_affiliated_with_institution(institution_id));

-- ── paye_tax_slabs: replace INSERT / SELECT / UPDATE ───────────────
-- SELECT keeps the original institution_id IS NULL carve-out (global slabs).
DROP POLICY IF EXISTS "Users can insert PAYE slabs" ON public.paye_tax_slabs;
DROP POLICY IF EXISTS "Users can view PAYE slabs" ON public.paye_tax_slabs;
DROP POLICY IF EXISTS "Users can update PAYE slabs" ON public.paye_tax_slabs;
CREATE POLICY "Users can insert PAYE slabs" ON public.paye_tax_slabs
  FOR INSERT WITH CHECK (public.user_affiliated_with_institution(institution_id));
CREATE POLICY "Users can view PAYE slabs" ON public.paye_tax_slabs
  FOR SELECT USING ((institution_id IS NULL) OR public.user_affiliated_with_institution(institution_id));
CREATE POLICY "Users can update PAYE slabs" ON public.paye_tax_slabs
  FOR UPDATE USING (public.user_affiliated_with_institution(institution_id))
  WITH CHECK (public.user_affiliated_with_institution(institution_id));

-- ── shift_assignments: replace INSERT / SELECT ─────────────────────
DROP POLICY IF EXISTS "Users can insert shift assignments" ON public.shift_assignments;
DROP POLICY IF EXISTS "Users can view shift assignments" ON public.shift_assignments;
CREATE POLICY "Users can insert shift assignments" ON public.shift_assignments
  FOR INSERT WITH CHECK (public.user_affiliated_with_institution(institution_id));
CREATE POLICY "Users can view shift assignments" ON public.shift_assignments
  FOR SELECT USING (public.user_affiliated_with_institution(institution_id));

-- ── smart_invoices: replace INSERT / SELECT ────────────────────────
DROP POLICY IF EXISTS "Users can insert smart invoices" ON public.smart_invoices;
DROP POLICY IF EXISTS "Users can view smart invoices" ON public.smart_invoices;
CREATE POLICY "Users can insert smart invoices" ON public.smart_invoices
  FOR INSERT WITH CHECK (public.user_affiliated_with_institution(institution_id));
CREATE POLICY "Users can view smart invoices" ON public.smart_invoices
  FOR SELECT USING (public.user_affiliated_with_institution(institution_id));

-- ── zambia_medical_council_config: drop broken only; healthy ALL remains ──
DROP POLICY IF EXISTS "Users can upsert Medical Council config" ON public.zambia_medical_council_config;
DROP POLICY IF EXISTS "Users can view Medical Council config" ON public.zambia_medical_council_config;

-- ── zambia_nhima_config: replace ALL + SELECT with one helper ALL ──
DROP POLICY IF EXISTS "Users can upsert NHIMA config" ON public.zambia_nhima_config;
DROP POLICY IF EXISTS "Users can view NHIMA config" ON public.zambia_nhima_config;
CREATE POLICY "Users can upsert NHIMA config" ON public.zambia_nhima_config
  FOR ALL USING (public.user_affiliated_with_institution(institution_id))
  WITH CHECK (public.user_affiliated_with_institution(institution_id));

-- ── zambia_tax_config: drop broken only; healthy ALL remains ───────
DROP POLICY IF EXISTS "Users can upsert Tax config" ON public.zambia_tax_config;
DROP POLICY IF EXISTS "Users can view Tax config" ON public.zambia_tax_config;
