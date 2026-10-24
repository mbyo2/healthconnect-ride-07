-- Security containment (emergency) — drift record
--
-- Purpose: record, as a repo migration, the containment changes made
-- directly against the live project during the emergency response to the
-- 2026-10-23 full-platform security audit (see the audit report's
-- "ANNEX 2026-10-23 — LIVE VERIFICATION + CONTAINMENT").
--
-- Applied live via dashboard 2026-10-23 during emergency containment;
-- this file is the drift record. It is written to be idempotent where
-- feasible so re-running it against the already-contained live schema
-- is a no-op in effect.
--
-- Contents:
--   1. Neutralise the committed-credential backdoor account
--      (admin@doc-o-clock.internal, audit finding P0-5).
--   2. Revoke client EXECUTE on process_full_payment (P0-4).
--   3. institution_wallets balance/currency/delete protection triggers
--      (P0-2).
--   4. lis_machines: institution-scoped policy, anon grants revoked.
--   5. payments: inserts pinned to own rows born 'pending'.
--   6. healthcare_institutions: self-provisioning pinned to
--      unverified + 'pending'.
--   7. courier_locations: reads scoped to the courier, the delivery's
--      patient, the delivery's pharmacy institution, and admins.
--
-- WARNING: migration 20251221_create_superuser_manual.sql contains a
-- COMPROMISED credential. The live password was verified working on
-- 2026-10-23, then scrambled and the account banned (see section 1), so
-- the credential is dead live — but the file must NEVER be re-run
-- against any environment, and the value must never be reused.
--
-- Date: 2026-10-23

-- ---------------------------------------------------------------------
-- 1. Backdoor account neutralisation (P0-5)
--
-- The account created by 20251221_create_superuser_manual.sql existed
-- live with its committed password still working. Deleting the auth
-- user was blocked by the security_audit_log foreign key; that is
-- acceptable — the audit rows are evidence and must NOT be deleted.
-- Instead the password is scrambled to an unknown random value and the
-- account is banned indefinitely, leaving the row (and its audit
-- trail) intact but unusable.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@doc-o-clock.internal';

  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
        banned_until = 'infinity'::timestamptz
    WHERE id = v_user_id;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------
-- 2. process_full_payment — service-role only (P0-4)
--
-- The RPC debits an arbitrary patient wallet and credits an arbitrary
-- provider with no in-body caller check. Its only legitimate caller is
-- the service-role edge-function path. Live proacl after this revoke:
-- {postgres, service_role}.
-- ---------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.process_full_payment(uuid, uuid, numeric, text, uuid, text, text, text, text)
  FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. institution_wallets — balance protection triggers (P0-2)
--
-- Institution admins previously held a FOR ALL policy on their wallet
-- row and could PATCH balance/currency directly, minting platform
-- money with no ledger entry. Balance/currency may now change only
-- from privileged database contexts (service_role / postgres /
-- supabase_admin — i.e. approved payment flows), and wallet rows
-- cannot be deleted by client roles at all.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_institution_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
      RAISE EXCEPTION 'Institution wallets cannot be deleted'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF (NEW.balance IS DISTINCT FROM OLD.balance
      OR NEW.currency IS DISTINCT FROM OLD.currency)
     AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Wallet balance can only change through approved payment flows'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_institution_wallet_update ON public.institution_wallets;
CREATE TRIGGER trg_protect_institution_wallet_update
  BEFORE UPDATE ON public.institution_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_institution_wallet();

DROP TRIGGER IF EXISTS trg_protect_institution_wallet_delete ON public.institution_wallets;
CREATE TRIGGER trg_protect_institution_wallet_delete
  BEFORE DELETE ON public.institution_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_institution_wallet();

-- ---------------------------------------------------------------------
-- 4. lis_machines — institution-scoped management, no anon access
--
-- The previous policy was effectively open (USING/WITH CHECK true)
-- and anon held table grants. Management is now limited to personnel
-- of the owning institution and the institution's admin.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Institution staff manage LIS machines" ON public.lis_machines;
CREATE POLICY "Institution staff manage LIS machines"
  ON public.lis_machines
  FOR ALL
  TO authenticated
  USING (
    (institution_id IN (SELECT institution_id FROM public.institution_personnel WHERE user_id = auth.uid()))
    OR (institution_id IN (SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid()))
  )
  WITH CHECK (
    (institution_id IN (SELECT institution_id FROM public.institution_personnel WHERE user_id = auth.uid()))
    OR (institution_id IN (SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid()))
  );

REVOKE ALL ON TABLE public.lis_machines FROM anon;

-- ---------------------------------------------------------------------
-- 5. payments — inserts are own-row and born 'pending'
--
-- The duplicate insert policy is dropped; the surviving policy now
-- carries an explicit WITH CHECK so a patient can no longer insert a
-- payment row born 'completed' (or insert rows for anyone else).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;

ALTER POLICY "Users can create payments" ON public.payments
  WITH CHECK ((auth.uid() = patient_id) AND (status = 'pending'));

-- ---------------------------------------------------------------------
-- 6. healthcare_institutions — self-provisioning pinned unverified
--
-- A self-provisioned institution must be created by its own admin,
-- unverified on both verification flags, and in 'pending' status.
-- Verification remains a platform-admin action.
-- ---------------------------------------------------------------------
ALTER POLICY "Users can self-provision their own institution" ON public.healthcare_institutions
  WITH CHECK ((admin_id = auth.uid()) AND (is_verified IS NOT TRUE) AND (verified IS NOT TRUE) AND (status = 'pending'));

-- ---------------------------------------------------------------------
-- 7. courier_locations — reads scoped to parties of the delivery
--
-- Live courier GPS was previously readable by any authenticated user.
-- Reads are now limited to the courier themselves, the patient on the
-- delivery, staff/admin of the fulfilling pharmacy institution, and
-- platform admins.
-- ---------------------------------------------------------------------
ALTER POLICY "Authenticated read courier locations" ON public.courier_locations
  USING (
    (courier_id IN (SELECT id FROM public.couriers WHERE user_id = auth.uid()))
    OR (delivery_id IN (SELECT id FROM public.delivery_orders WHERE patient_id = auth.uid()))
    OR (delivery_id IN (SELECT id FROM public.delivery_orders WHERE pharmacy_id IN (SELECT institution_id FROM public.institution_personnel WHERE user_id = auth.uid())))
    OR (delivery_id IN (SELECT id FROM public.delivery_orders WHERE pharmacy_id IN (SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid())))
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );
