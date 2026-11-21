-- ZRA Smart Invoice — same legacy-vocabulary trap as
-- fiscal_submissions.status, one table over: the Oct-2025 manual
-- schema restricted vsdc_operation_logs.operation_type to the old
-- page's operations ('initialize', 'sync_codes', 'sync_items',
-- 'submit_sale', 'health_check', 'sync_code_map'). The real
-- pipeline's operations ('test_connection', 'save_sales',
-- 'save_credit_note', 'save_item') were silently refused — found in
-- the 2026-11-21 live proof when successful declarations left no log
-- rows. Widen the CHECK to the union of both vocabularies.

ALTER TABLE public.vsdc_operation_logs
  DROP CONSTRAINT vsdc_operation_logs_operation_type_check;

ALTER TABLE public.vsdc_operation_logs
  ADD CONSTRAINT vsdc_operation_logs_operation_type_check
  CHECK (operation_type IN (
    'initialize', 'sync_codes', 'sync_items', 'submit_sale',
    'health_check', 'sync_code_map',
    'test_connection', 'save_sales', 'save_credit_note', 'save_item'
  ));
