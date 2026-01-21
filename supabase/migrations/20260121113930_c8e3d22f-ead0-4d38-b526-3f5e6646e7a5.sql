-- 1. Profiles: Add authentication requirement (combine with existing policies)
-- The existing policies already use auth.uid() which requires authentication
-- But let's ensure there's no public access by adding explicit check

-- 2. Shifts: Add authentication requirement to SELECT policy
DROP POLICY IF EXISTS "Users view own shifts" ON public.shifts;
CREATE POLICY "Users view own shifts"
ON public.shifts
FOR SELECT
USING (auth.uid() IS NOT NULL AND ((user_id = auth.uid()) OR is_admin_or_manager(auth.uid())));

-- 3. Orders: Add authentication requirement to SELECT policy  
DROP POLICY IF EXISTS "Users view orders for their location" ON public.orders;
CREATE POLICY "Users view orders for their location"
ON public.orders
FOR SELECT
USING (auth.uid() IS NOT NULL AND ((location_id = get_user_location(auth.uid())) OR is_admin_or_manager(auth.uid())));

-- 4. Audit Log: Add authentication requirement to SELECT policy
DROP POLICY IF EXISTS "Admins view audit" ON public.audit_log;
CREATE POLICY "Admins view audit"
ON public.audit_log
FOR SELECT
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Remove the INSERT policy for audit_log (should only be written by triggers)
DROP POLICY IF EXISTS "Users insert own audit entries" ON public.audit_log;