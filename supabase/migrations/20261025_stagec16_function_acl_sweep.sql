-- Stage C1 P2-16 — function EXECUTE ACL sweep (project tthzcijscedgxjfnfnky)
-- Generated from live pg_proc dump on 2026-10-24 (207 public functions at generation).
-- Policy: EXECUTE is granted only to the roles that demonstrably need it:
--   * anon          -> only public-by-design RPCs (class C)
--   * authenticated -> web-client RPCs (A), RLS-policy helpers (B-rls), ambiguous-keep (flagged)
--   * service_role + postgres -> everything (unchanged everywhere)
-- Trigger functions need no EXECUTE for firing (proven behaviourally, see triage doc).
-- delete_user() intentionally untouched: coordinator-reviewed, self-scoped, closed-with-evidence.

-- ===== class A-client-rpc: REVOKE PUBLIC+anon; keep authenticated (web client .rpc) =====
REVOKE EXECUTE ON FUNCTION public.approve_stock_audit_session(p_session_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_potential_duplicates(p_limit integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fulfill_marketplace_order(p_order_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_institution_appointments(p_institution_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_patient_relationship(p_patient_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_kb_views(p_slug text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_template_use(p_template_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.issue_blood(p_request_id uuid, p_issued_by uuid, p_notes text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lookup_user_id_by_email(p_email text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.merge_patients(p_survivor uuid, p_duplicate uuid, p_reason text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.post_stock_writeoff(p_writeoff_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.quarantine_expired_batches(p_institution_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_blood_donation(p_hospital_id uuid, p_donor_id uuid, p_blood_type text, p_component_type text, p_units_collected numeric, p_screening_status text, p_screening_notes text, p_expiry_date date, p_collected_by uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_break_glass_access(p_grant_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_patients_for_provider(p_search text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_institution_suspended(p_institution_id uuid, p_suspended boolean, p_reason text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_provider_suspended(p_user_id uuid, p_suspended boolean, p_reason text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transfer_institution_superadmin(p_institution_id uuid, p_new_admin_id uuid) FROM PUBLIC, anon;
-- ===== class B-rls-helper: REVOKE PUBLIC+anon; keep authenticated (RLS policies roles {authenticated}) =====
REVOKE EXECUTE ON FUNCTION public.audit_log_institution_id(p_event_data jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_art_cycle(p_cycle_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_institution_blood_bank(p_institution_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_approve_pharmacy_adjustments(p_institution_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_optical(p_user_id uuid, p_institution_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_support_ticket(p_ticket_id uuid, p_user_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_admin_scope(p_uid uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_break_glass_access(p_patient_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_camp_staff(p_camp_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_indent_staff(p_indent_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_institution_admin_of(p_institution_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_institution_finance_staff(p_institution_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_pharmacy_operator(p_institution_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_support_staff(p_user_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lab_institution_access(p_institution_id uuid, p_viewer uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lab_result_in_scope(p_request_id uuid, p_test_id uuid, p_technician_id uuid, p_viewer uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.shares_institution_with_provider(p_provider_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_affiliated_with_institution(p_institution_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_view_lab_profile(viewer_id uuid, profile_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_institution_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_is_institution_staff_for_institution(p_user_id uuid, p_institution_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_is_institution_staff_for_patient(p_viewer_id uuid, p_patient_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_manages_institution(inst_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_manages_mch_institution(p_institution_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_manages_procurement_institution(p_institution_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_shares_appointment_with(viewer_id uuid, other_id uuid) FROM PUBLIC, anon;
-- ===== class B-trigger: REVOKE PUBLIC+anon+authenticated (trigger firing needs no EXECUTE) =====
REVOKE EXECUTE ON FUNCTION public.apply_batch_movement() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_doctor_fraction_earning() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_suspended_institution() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_suspended_provider() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_unverified_provider() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_qa_maker_checker() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_writeoff_approver() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_audit_variance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_billing_on_appointment_complete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_lab_result_verify_rules() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_lab_test_verify_rules() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_provider_availability() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_share_request_integrity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_withdrawal_reservation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_institution_admin_on_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_provider_role_on_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_audit_line_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_institution_trust_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_inventory_non_negative() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_payment_mode_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_withdrawal_update_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_application_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_institution_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_provider_complete_on_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mirror_lab_test_verification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_appointment_slot_time() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_doctor_on_lab_result() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pin_appointment_status_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pin_appointment_status_on_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_institution_wallet() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_appointment_institution_from_provider() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.stamp_claim_denial_resolved_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.stamp_health_metrics_authorship() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.stamp_vital_signs_authorship() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_admin_level_from_roles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_institution_superadmin_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_inventory_quantity_from_batches() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_claim_denial_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_optical_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_service_tariffs_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_create_delivery_tracking() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_create_video_consultation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_donor_last_donation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_pharmacist_rx_update() FROM PUBLIC, anon, authenticated;
-- ===== class C-public: REVOKE FROM PUBLIC only; keep anon+authenticated (public by design) =====
REVOKE EXECUTE ON FUNCTION public.get_invitation_by_token(p_token text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_provider_booked_slots(p_ids uuid[], p_from date, p_to date) FROM PUBLIC;
-- ===== class D-ambiguous-keep-auth: REVOKE PUBLIC+anon; KEEP authenticated — ambiguous client usage, flagged per gate =====
REVOKE EXECUTE ON FUNCTION public.get_institution_application_details(institution_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_institution_compliance_status(p_institution_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_procedure_price(p_procedure_id uuid, p_institution_id uuid, p_date date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_provider_application_details(provider_id uuid) FROM PUBLIC, anon;
-- ===== class D-internal: REVOKE PUBLIC+anon+authenticated (internal/definer-called only) =====
REVOKE EXECUTE ON FUNCTION public.appointment_actor_has_clinical_role(p_appointment_provider uuid, p_appointment_institution uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.asset_owner_institution(p_asset_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_merge_patients() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_financial_controls(p_institution_id uuid, p_amount numeric, p_transaction_type text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_low_stock_alerts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_form_data() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.drug_classes_for(p_name text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.drug_names_match(p_a text, p_b text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_lapsed_subscriptions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_asset_shareable(p_asset_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_institution_super_admin(p_uid uuid, p_institution_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_institution_suspended(p_institution_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_provider_suspended(p_user_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_verified_prescriber(p_user_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_wholesale_order_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_drug_name(p_name text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.summarize_safety_findings(p_blocking jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_can_verify_for_lab(p_user_id uuid, p_lab_institution_id uuid) FROM PUBLIC, anon, authenticated;
-- ===== class E-edge-service: REVOKE PUBLIC+anon+authenticated (edge functions call via service_role) =====
REVOKE EXECUTE ON FUNCTION public.process_wallet_transaction(p_user_id uuid, p_transaction_type text, p_amount numeric, p_description text, p_payment_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_wallet_transaction(p_user_id uuid, p_transaction_type text, p_amount numeric, p_description text, p_payment_id uuid, p_gateway_ref text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_service_price(_service_id text) FROM authenticated;

-- ===== Default privileges: future functions are born locked =====
-- Before this change, pg_default_acl for postgres (and supabase_admin) granted
-- EXECUTE on new functions to anon+authenticated+service_role. Revoke the
-- PUBLIC/anon/authenticated defaults; service_role keeps its default grant.
-- New functions must now GRANT EXECUTE explicitly to the roles that need it.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
