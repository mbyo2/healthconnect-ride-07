-- Stage C2b Cluster A — 2026-10-25
--
-- P3-10 (DB parts, (a)): views without security_invoker over
-- RLS-protected tenant data run with the view owner's rights, bypassing
-- the base tables' RLS for anyone who can SELECT the view.
--
-- Live enumeration (pg_class.reloptions, 10 views in public):
--   Already security_invoker=true: institution_staff_directory,
--     pending_applications, pharmacy_stock_valuation,
--     pharmacy_writeoff_summary, user_two_factor_status.
--   SET BY THIS MIGRATION (tenant-scoped aggregates over RLS tables):
--     * institution_comprehensive_view — per-institution financial /
--       compliance config + staff counts over healthcare_institutions,
--       financial_controls, zambia_* config tables.
--     * inventory_status_enhanced_view — per-institution medication
--       inventory + supplier performance.
--     * revenue_leakage_summary_view — per-institution flagged /
--       pending revenue amounts over revenue_audit_log.
--   LEFT AS-IS, with reasons:
--     * provider_directory (security_invoker=false) — the deliberate
--       public provider directory: it is granted to anon BY DESIGN and
--       reads profiles through its own verified-provider filter. The
--       invoker has no profiles row (anon), so security_invoker=true
--       would empty it and break public search; its residual exposure
--       (email/phone columns) is P2-10, a separate CEO-decision item,
--       NOT changed here.
--     * shareable_equipment (no reloptions) — the deliberate
--       cross-institution equipment-sharing catalogue (CEO 2026-10-16):
--       it only exposes rows the owning institution explicitly marked
--       is_shareable=true AND status='operational' at verified
--       institutions, for discovery by other institutions. Setting
--       security_invoker=true would subject it to asset_register's
--       own-institution-staff RLS and silently empty the shared
--       catalogue for exactly the cross-institution viewers it exists
--       for. Its column set is discovery metadata (no patient,
--       financial, or credential data).

ALTER VIEW public.institution_comprehensive_view SET (security_invoker = true);
ALTER VIEW public.inventory_status_enhanced_view SET (security_invoker = true);
ALTER VIEW public.revenue_leakage_summary_view SET (security_invoker = true);
