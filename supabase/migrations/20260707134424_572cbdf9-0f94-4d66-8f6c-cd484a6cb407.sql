
-- 1. lab_results INSERT
DROP POLICY IF EXISTS "Health personnel can insert lab results" ON public.lab_results;
CREATE POLICY "Providers with care relationship can insert lab results"
ON public.lab_results
FOR INSERT
WITH CHECK (
  public.has_care_relationship(auth.uid(), patient_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- 2. vaccination_records INSERT
DROP POLICY IF EXISTS "Health personnel can insert vaccination records" ON public.vaccination_records;
CREATE POLICY "Providers with care relationship can insert vaccination records"
ON public.vaccination_records
FOR INSERT
WITH CHECK (
  public.has_care_relationship(auth.uid(), patient_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- 3. patient_allergies INSERT + UPDATE
DROP POLICY IF EXISTS "Users and providers can insert allergies" ON public.patient_allergies;
CREATE POLICY "Users and providers with care relationship can insert allergies"
ON public.patient_allergies
FOR INSERT
WITH CHECK (
  patient_id = auth.uid()
  OR public.has_care_relationship(auth.uid(), patient_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

DROP POLICY IF EXISTS "Users and providers can update allergies" ON public.patient_allergies;
CREATE POLICY "Users and providers with care relationship can update allergies"
ON public.patient_allergies
FOR UPDATE
USING (
  patient_id = auth.uid()
  OR public.has_care_relationship(auth.uid(), patient_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  patient_id = auth.uid()
  OR public.has_care_relationship(auth.uid(), patient_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- 4. billing_records INSERT
DROP POLICY IF EXISTS "Health personnel can insert billing records" ON public.billing_records;
CREATE POLICY "Providers with care relationship can insert billing records"
ON public.billing_records
FOR INSERT
WITH CHECK (
  public.has_care_relationship(auth.uid(), patient_id)
  OR public.has_role(auth.uid(), 'billing_staff'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- 5. chat-attachments storage: replace LIKE match with exact path match
DROP POLICY IF EXISTS "Chat participants can read chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can access their chat attachments" ON storage.objects;

CREATE POLICY "Chat participants can read chat attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.chat_attachments ca
    JOIN public.messages m ON m.id = ca.message_id
    WHERE regexp_replace(ca.file_url, '^.*/chat-attachments/', '') = objects.name
      AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  )
);

-- 6. medical_documents INSERT: restrict role to authenticated
DROP POLICY IF EXISTS "Users can upload their own medical documents" ON storage.objects;
CREATE POLICY "Users can upload their own medical documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'medical_documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
