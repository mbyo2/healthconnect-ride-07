-- Doc swarm clinical 2026-11-16 — ART cycle creator-read policy.
--
-- DEFECT (proven live 2026-11-16 with QA-user JWTs against production
-- PostgREST): creating an ART cycle through the app's exact call shape
--   supabase.from('art_cycles').insert({...}).select().single()
-- failed with 403 42501 "new row violates row-level security policy",
-- while the identical insert WITHOUT .select() succeeded (201) and a
-- standalone GET of the created row also succeeded. The app's ARTModule
-- "create cycle" flow was therefore broken live: no cycle was ever
-- created, so the auto-assign-creator-as-staff step never ran either.
--
-- ROOT CAUSE: PostgREST INSERT with return=representation re-checks the
-- new row against the SELECT policy inside the same statement. The only
-- SELECT policy on art_cycles routes through the SECURITY DEFINER
-- function can_access_art_cycle(), whose self-table lookup runs under
-- the statement snapshot and cannot see the row currently being
-- inserted. (Staff/procedure inserts with representation work because
-- their can_access check looks up the already-committed parent cycle;
-- PATCH with representation works because the row pre-exists.)
--
-- FIX: additive permissive SELECT policy evaluated directly on the
-- RETURNING row — no self-table lookup, so it is snapshot-proof.
-- Grants NOTHING new: the creator can already read the cycle via
-- can_access_art_cycle() (created_by = auth.uid() is one of its
-- branches); this only makes that same access visible inside the
-- INSERT statement. The strict function-based policy stays in place
-- for every other reader.
--
-- LIVE PROOF (2026-11-16, swarm-clinical-doctor JWT): insert().select()
-- returned 403 before this policy, 201 with the full row after.
-- The 20261114 recursion fix is untouched: no policy body inlines a
-- subquery against art_cycles or art_cycle_staff.

CREATE POLICY "ART cycle creator read"
  ON public.art_cycles
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());
