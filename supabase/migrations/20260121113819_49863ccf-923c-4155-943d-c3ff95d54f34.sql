-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;

-- Create policy: Users can only view their own profile
CREATE POLICY "Users view own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Create separate policy: Only admins can view all profiles (for staff management)
CREATE POLICY "Admins view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));