
-- Attach trigger to create provider applications on signup
DROP TRIGGER IF EXISTS on_auth_user_created_provider_application ON auth.users;
CREATE TRIGGER on_auth_user_created_provider_application
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_provider_application();

-- Backfill applications for existing health personnel users without one
INSERT INTO public.health_personnel_applications (user_id, license_number, specialty, years_of_experience, status, experience_level)
SELECT 
  p.id,
  COALESCE(u.raw_user_meta_data->>'license_number', ''),
  COALESCE(u.raw_user_meta_data->>'specialty', p.specialty, 'General'),
  0,
  'pending',
  'entry'
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.role IN ('doctor','nurse','pharmacist','lab_technician','radiologist','health_personnel','pathologist','phlebotomist','specialist')
  AND NOT EXISTS (SELECT 1 FROM public.health_personnel_applications hpa WHERE hpa.user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;
