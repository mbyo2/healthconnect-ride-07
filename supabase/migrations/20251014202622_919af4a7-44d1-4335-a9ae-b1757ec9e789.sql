-- Enable Row Level Security on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view own roles" 
ON public.user_roles
FOR SELECT 
USING (user_id = auth.uid());

-- Policy: Only admins can insert new role assignments
CREATE POLICY "Admins can assign roles" 
ON public.user_roles
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Only admins can update role assignments
CREATE POLICY "Admins can update roles" 
ON public.user_roles
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Only admins can delete role assignments
CREATE POLICY "Admins can revoke roles" 
ON public.user_roles
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role)
);