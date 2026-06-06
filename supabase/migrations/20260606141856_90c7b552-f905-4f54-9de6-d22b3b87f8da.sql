
-- 1) Fix function search_path
ALTER FUNCTION public.cleanup_old_form_data() SET search_path = public;
ALTER FUNCTION public.log_prescription_changes() SET search_path = public;
ALTER FUNCTION public.map_staff_role_to_app_role(text) SET search_path = public;
ALTER FUNCTION public.update_provider_time_slots_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 2) Add deny-by-default super_admin-only policies on tables with RLS but no policy.
-- service_role bypasses RLS so backend/edge-function access continues to work.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'accounts_payable','accounts_receivable','bank_accounts','bank_transactions',
    'budget_lines','budgets','chart_of_accounts','employee_benefits','expense_categories',
    'expenses','financial_reports','general_ledger','hospital_billing_items','job_applications',
    'journal_entries','journal_entry_lines','leave_balances','leave_history','payment_transactions',
    'payroll_items','performance_criteria','performance_scores','promotions','reconciliations',
    'resignations','revenue','revenue_categories','tax_rates','tax_transactions','timesheet_entries',
    'timesheets','training_enrollments','training_sessions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admins manage %I" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "Admins manage %I" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''super_admin''::app_role) OR public.has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''super_admin''::app_role) OR public.has_role(auth.uid(), ''admin''::app_role))',
      t, t
    );
  END LOOP;
END$$;

-- 3) Revoke EXECUTE on internal trigger functions from anon/authenticated/PUBLIC.
-- Triggers still fire (they run as table owner), but these can no longer be called as RPC.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'assign_default_role()',
    'audit_role_assignment()',
    'audit_role_changes()',
    'audit_security_changes()',
    'auto_accept_invitations_on_signup()',
    'auto_create_institution_application()',
    'auto_create_provider_application()',
    'auto_generate_conversation_title()',
    'charge_booking_fee()',
    'create_automatic_connection()',
    'create_chat_connection()',
    'create_user_wallet()',
    'create_video_connection()',
    'generate_invoice_number()',
    'generate_prescription_number()',
    'generate_token_number()',
    'handle_new_user()',
    'handle_updated_at()',
    'log_prescription_changes()',
    'notify_waitlist_on_appointment_cancellation()',
    'notify_waitlist_on_cancellation()',
    'pos_sale_update_inventory()',
    'pos_sale_update_register()',
    'prevent_role_escalation()',
    'update_conversation_timestamp()',
    'update_fraud_alerts_updated_at()',
    'update_health_reminders_updated_at()',
    'update_inventory_quantity()',
    'update_invoice_on_payment()',
    'update_medication_alerts_updated_at()',
    'update_provider_rating()',
    'update_provider_time_slots_updated_at()',
    'update_updated_at_column()',
    'update_user_streak()',
    'insert_applications_for_doctors()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END$$;

-- 4) Revoke anon execute on SECURITY DEFINER RPCs that should only be reachable by signed-in users.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_user_admin_level() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_via_profiles(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_institution_admin(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_institution_staff(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_institution_staff_member(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_service_role() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_perform_service(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_diagnosis_by_id(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_diagnosis_history() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_staff_invitation(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_wallet_transaction(uuid, text, numeric, text, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_receipt_number(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_payment_with_splits(uuid, numeric, uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_payment_with_splits(uuid, numeric, uuid, uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_user() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.map_staff_role_to_app_role(text) FROM anon, PUBLIC;

-- Payment splits should only be invoked by backend (service_role), not directly by users
REVOKE EXECUTE ON FUNCTION public.process_payment_with_splits(uuid, numeric, uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_payment_with_splits(uuid, numeric, uuid, uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.insert_applications_for_doctors() FROM authenticated;
