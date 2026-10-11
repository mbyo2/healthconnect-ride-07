-- Fix: lab staff can search for patients to create new orders
-- ------------------------------------------------------------------
-- The old policy only allowed lab staff to see profiles of patients with
-- existing lab_tests rows. This created a chicken-and-egg bug: you couldn't
-- order a test for a new patient because they weren't searchable, and they
-- weren't searchable because they had no orders.
--
-- New behavior: lab staff (technician, pathologist, phlebotomist) can view
-- patient/provider profiles for the purpose of creating and processing
-- lab orders. This is necessary for the lab workflow to function.

DROP POLICY IF EXISTS "Lab staff can view profiles for tests"
  ON public.profiles;

CREATE POLICY "Lab staff can view profiles for tests"
  ON public.profiles FOR SELECT
  USING (
    (
      public.has_role(auth.uid(), 'lab_technician')
      OR public.has_role(auth.uid(), 'pathologist')
      OR public.has_role(auth.uid(), 'phlebotomist')
      OR public.has_role(auth.uid(), 'lab')
    )
    -- Lab staff can view profiles to search for patients when creating orders.
    -- The application layer limits this to search-by-name/email (min 2 chars),
    -- not bulk enumeration.
  );
