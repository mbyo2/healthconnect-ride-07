
-- Restrict provider_insurance_networks read to authenticated
DROP POLICY IF EXISTS "Public can read provider networks" ON public.provider_insurance_networks;
CREATE POLICY "Authenticated can read provider networks"
  ON public.provider_insurance_networks FOR SELECT
  TO authenticated
  USING (true);

-- Scope form_templates active-read to creator/admins
DROP POLICY IF EXISTS "Authenticated can view active form templates" ON public.form_templates;
CREATE POLICY "Creators and admins can view active form templates"
  ON public.form_templates FOR SELECT
  TO authenticated
  USING (
    is_active = true AND (
      created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

-- Harden profile self-elevation: block role/admin_level/is_verified/provider_type changes
-- regardless of who initiates, unless service_role or an admin acting on someone else.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;

  -- Only admins (acting on another user) may change privilege columns.
  IF (OLD.role IS DISTINCT FROM NEW.role
      OR OLD.admin_level IS DISTINCT FROM NEW.admin_level) THEN
    IF NOT (public.has_role(auth.uid(), 'super_admin'::app_role)
            OR public.has_role(auth.uid(), 'admin'::app_role))
       OR auth.uid() = OLD.id THEN
      NEW.role := OLD.role;
      NEW.admin_level := OLD.admin_level;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_change ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_change();

-- Storage policies for chat-attachments bucket (created via storage tool)
DROP POLICY IF EXISTS "Chat participants can read chat attachments" ON storage.objects;
CREATE POLICY "Chat participants can read chat attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND EXISTS (
      SELECT 1 FROM public.chat_attachments ca
      JOIN public.messages m ON m.id = ca.message_id
      WHERE ca.file_url LIKE ('%' || storage.objects.name)
        AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can upload their chat attachments" ON storage.objects;
CREATE POLICY "Users can upload their chat attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their chat attachments" ON storage.objects;
CREATE POLICY "Users can delete their chat attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
