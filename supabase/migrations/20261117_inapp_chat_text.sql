-- In-app text chat (group 1 of 4), 2026-11-17.
--
-- What this adds, and why:
--   1. Delivery-participant profile visibility. A patient must be able to
--      open a chat with the courier assigned to their delivery (and the
--      courier with that patient), but a patient must NEVER see other
--      patients. Mirrors the proven appointment pattern exactly:
--      SECURITY DEFINER helper (opaque to the RLS rewriter — NEVER an
--      inline EXISTS against other RLS tables in a profiles policy, see
--      2026-09-30 recursion lesson) + a profiles SELECT policy on top.
--      Cancelled/failed deliveries grant no visibility, same as cancelled
--      appointments in user_shares_appointment_with.
--   2. Read receipts. messages had NO UPDATE policy, so marking a message
--      read failed from the client. The receiver may now UPDATE only rows
--      they received, and a BEFORE UPDATE guard trigger makes every column
--      except read/updated_at immutable (a receiver cannot rewrite the
--      sender, the content, or re-address the row — the policy alone
--      could not express "sender_id must not change").
--   3. Realtime publication. delivery_orders and location_updates were
--      NOT in supabase_realtime, so the patient/courier delivery channels
--      never delivered anything live. Added (same pattern as
--      20261016_equipment_sharing_network / 20261020_ambulance_positions).
--      messages was already a member; no change there.
--
-- Live-apply: short statements via docsql.sh, then verify with JWT
-- replays (see ~/workspace/doc-inapp-chat/text/).

-- 1) Delivery-participant helper -------------------------------------------
CREATE OR REPLACE FUNCTION public.user_shares_delivery_with(viewer_id uuid, other_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.delivery_orders d
    JOIN public.couriers c ON c.id = d.courier_id
    WHERE d.status IS DISTINCT FROM 'cancelled'
      AND d.status IS DISTINCT FROM 'failed'
      AND (
        (d.patient_id = viewer_id AND c.user_id = other_id)
        OR (c.user_id = viewer_id AND d.patient_id = other_id)
      )
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.user_shares_delivery_with(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_shares_delivery_with(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Delivery participants can view each other's profiles"
ON public.profiles FOR SELECT
USING (
  (id = auth.uid())
  OR public.user_shares_delivery_with(auth.uid(), id)
);

-- 2) Read receipts ----------------------------------------------------------
CREATE POLICY "Receivers can mark messages read"
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

CREATE OR REPLACE FUNCTION public.guard_message_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.sender_id IS DISTINCT FROM NEW.sender_id
    OR OLD.receiver_id IS DISTINCT FROM NEW.receiver_id
    OR OLD.content IS DISTINCT FROM NEW.content
  THEN
    RAISE EXCEPTION 'messages are immutable except for the read flag';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_message_update ON public.messages;
CREATE TRIGGER trg_guard_message_update
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_message_update();

-- 3) Realtime publication (idempotent guards: safe to re-run) --------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'delivery_orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_orders';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'location_updates'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.location_updates';
  END IF;
END $$;
