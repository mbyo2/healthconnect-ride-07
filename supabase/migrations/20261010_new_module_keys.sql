-- Add 6 new module keys to the facility module charter (CEO decision 2026-10-10).
-- These give independent grant/revoke control for dashboard tabs that had no
-- clean charter mapping: pediatrics, physiotherapy, ERP stock, clinical coding,
-- FHIR interoperability, and multi-center governance.
--
-- Inserted as 'planned' status — admin can grant them to any institution at any time.

INSERT INTO public.facility_module_charter (tier, module_key, module_name, description, status, sort_order)
VALUES
  -- Pediatrics: dedicated child-health workflows (was mapped to maternal_child)
  ('primary','pediatrics','Pediatric Center','Child-health consultations, growth monitoring and immunization','planned',12),
  ('secondary','pediatrics','Pediatric Center','Child-health consultations, growth monitoring and immunization','planned',19),
  ('tertiary','pediatrics','Pediatric Center','Child-health consultations, growth monitoring and immunization','planned',22),

  -- Rehabilitation: physio/occupational therapy (was mapped to opd)
  ('primary','rehabilitation','Physiotherapy & Rehabilitation','Physio, occupational and speech therapy workflows','planned',13),
  ('secondary','rehabilitation','Physiotherapy & Rehabilitation','Physio, occupational and speech therapy workflows','planned',20),
  ('tertiary','rehabilitation','Physiotherapy & Rehabilitation','Physio, occupational and speech therapy workflows','planned',23),

  -- ERP inventory: stock/procurement beyond pharmacy (was mapped to pharmacy_inventory)
  ('secondary','erp_inventory','ERP Stock & Procurement','Inventory, purchasing and supplier management','planned',21),
  ('tertiary','erp_inventory','ERP Stock & Procurement','Inventory, purchasing and supplier management','planned',24),

  -- Clinical coding: ICD/CPT procedure coding (was mapped to opd/theatre)
  ('secondary','clinical_coding','Clinical Coding (ICD/CPT)','Diagnosis and procedure coding for billing and records','planned',22),
  ('tertiary','clinical_coding','Clinical Coding (ICD/CPT)','Diagnosis and procedure coding for billing and records','planned',25),

  -- Interoperability: HL7 FHIR data exchange (was mapped to referrals)
  ('secondary','interoperability','HL7 FHIR Interoperability','Standards-based health data exchange with other systems','planned',23),
  ('tertiary','interoperability','HL7 FHIR Interoperability','Standards-based health data exchange with other systems','planned',26),

  -- Governance: multi-center oversight (was mapped to reports)
  ('tertiary','governance','Multi-Center Governance','Oversight, audit and policy across facility networks','planned',27)

ON CONFLICT DO NOTHING;
