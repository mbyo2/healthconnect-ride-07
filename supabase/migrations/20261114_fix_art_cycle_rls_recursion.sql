-- 20261114_fix_art_cycle_rls_recursion.sql
-- Bug-free gate 2026-11-14 (F8, CRITICAL): every SELECT on art_cycles and
-- art_cycle_staff 500d live with 42P17 "infinite recursion detected in
-- policy for relation art_cycle_staff", so the whole ART module (cycles
-- list, cycle detail, staff assignment) was dead for every user.
--
-- Root cause: inline cross-table checks in the policies. art_cycle_staff
-- "ART staff manage" (ALL) inlined EXISTS against art_cycles AND a
-- self-reference to art_cycle_staff (s2), while art_cycles "strict read"
-- / "update" inlined EXISTS against art_cycle_staff. Evaluating either
-- table's SELECT pulls the other's policies into the plan and re-enters
-- the cycle — the exact class documented in AGENTS.md (profiles/lab_tests
-- recursion, 2026-09-30): never inline EXISTS/subqueries against other
-- RLS tables in a policy; wrap them in a SECURITY DEFINER function.
--
-- Fix: route all three policies through the existing SECURITY DEFINER
-- helper public.can_access_art_cycle(p_cycle_id) (patient / partner /
-- creator / assigned staff), which the "ART staff read" SELECT policy
-- already used. Semantics are unchanged: the helper's predicate is the
-- same access rule the inline EXISTS expressions spelled out.
-- Idempotent: DROP ... IF EXISTS + CREATE POLICY (names kept).
DROP POLICY IF EXISTS "ART staff manage" ON public.art_cycle_staff;
CREATE POLICY "ART staff manage" ON public.art_cycle_staff
  FOR ALL USING (public.can_access_art_cycle(cycle_id))
  WITH CHECK (public.can_access_art_cycle(cycle_id));

DROP POLICY IF EXISTS "ART cycle strict read" ON public.art_cycles;
CREATE POLICY "ART cycle strict read" ON public.art_cycles
  FOR SELECT USING (public.can_access_art_cycle(id));

DROP POLICY IF EXISTS "ART cycle update" ON public.art_cycles;
CREATE POLICY "ART cycle update" ON public.art_cycles
  FOR UPDATE USING (public.can_access_art_cycle(id))
  WITH CHECK (public.can_access_art_cycle(id));
