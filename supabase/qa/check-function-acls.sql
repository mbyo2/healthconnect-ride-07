-- check-function-acls.sql — QA/audit script (NOT a migration).
-- Stage C1 P2-16: lists every public-schema function that is EXECUTE-able by
-- anon or authenticated OUTSIDE the allow-lists below, plus any function that
-- is EXECUTE-able by PUBLIC (PUBLIC EXECUTE is allowed for NO function).
-- Expected result after migration 20261025_stagec16_function_acl_sweep.sql:
-- zero rows. Run in the Supabase SQL editor or via the Management API.
--
-- ALLOW-LISTS (edit here when a new client/public RPC is deliberately added;
-- keep in sync with the stagec16 triage doc):
--   anon: get_invitation_by_token, get_provider_booked_slots, get_public_platform_counts
--   authenticated: the A (client .rpc), B-rls (RLS policy helpers),
--     D-ambiguous-keep-auth and C (public) classes of the P2-16 triage.
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       CASE WHEN has_function_privilege('anon', p.oid, 'EXECUTE') THEN 'anon ' ELSE '' END ||
       CASE WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN 'authenticated ' ELSE '' END ||
       CASE WHEN has_function_privilege('public', p.oid, 'EXECUTE') THEN 'PUBLIC' ELSE '' END AS executable_by,
       p.proacl::text AS acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    has_function_privilege('public', p.oid, 'EXECUTE')
    OR (has_function_privilege('anon', p.oid, 'EXECUTE')
        AND p.proname NOT IN ('get_invitation_by_token', 'get_provider_booked_slots', 'get_public_platform_counts'))
    OR (has_function_privilege('authenticated', p.oid, 'EXECUTE')
        AND p.proname NOT IN ('accept_staff_invitation', 'apply_drug_stock_movement', 'approve_prescription_refill', 'approve_stock_audit_session', 'audit_log_institution_id', 'can_access_art_cycle', 'can_access_institution_blood_bank', 'can_approve_pharmacy_adjustments', 'can_insert_delivery_custody', 'can_manage_optical', 'can_perform_service', 'can_view_support_ticket', 'delete_patient_allergy', 'delete_user', 'dispense_medicine_batches', 'emergency_patient_search', 'find_potential_duplicates', 'fulfill_marketplace_order', 'generate_receipt_number', 'get_current_user_admin_level', 'get_current_user_role', 'get_diagnosis_by_id', 'get_institution_application_details', 'get_institution_appointments', 'get_institution_compliance_status', 'get_invitation_by_token', 'get_my_diagnosis_history', 'get_procedure_price', 'get_provider_application_details', 'get_provider_booked_slots', 'get_public_platform_counts', 'get_public_profile', 'get_user_role', 'get_user_roles', 'has_admin_scope', 'has_break_glass_access', 'has_care_relationship', 'has_patient_relationship', 'has_role', 'increment_kb_views', 'increment_template_use', 'is_admin_via_profiles', 'is_camp_staff', 'is_indent_staff', 'is_institution_admin', 'is_institution_admin_of', 'is_institution_finance_staff', 'is_institution_staff', 'is_institution_staff_member', 'is_pharmacy_operator', 'is_service_role', 'is_super_admin', 'is_support_staff', 'issue_blood', 'lab_institution_access', 'lab_result_in_scope', 'log_emergency_lookup', 'lookup_user_id_by_email', 'map_staff_role_to_app_role', 'merge_patients', 'post_stock_writeoff', 'quarantine_expired_batches', 'record_blood_donation', 'redeem_promo_code', 'request_break_glass_access', 'revoke_break_glass_access', 'search_patients_for_provider', 'set_institution_suspended', 'set_provider_suspended', 'shares_institution_with_provider', 'transfer_institution_superadmin', 'user_affiliated_with_institution', 'user_can_view_lab_profile', 'user_institution_ids', 'user_is_institution_staff_for_institution', 'user_is_institution_staff_for_patient', 'user_manages_institution', 'user_manages_mch_institution', 'user_manages_procurement_institution', 'user_shares_appointment_with'))
  )
ORDER BY p.proname, args;
