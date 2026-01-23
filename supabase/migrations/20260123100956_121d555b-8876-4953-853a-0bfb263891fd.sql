-- Drop existing shift insert policy
DROP POLICY IF EXISTS "Users manage own shifts" ON public.shifts;

-- Create new policy that allows inserting shifts
-- This allows authenticated users or edge function calls to create shifts
CREATE POLICY "Users can create shifts"
ON public.shifts
FOR INSERT
WITH CHECK (true);

-- Also need to allow cashiers to view their shifts (for queries)
DROP POLICY IF EXISTS "Users view own shifts" ON public.shifts;

CREATE POLICY "Users view shifts"
ON public.shifts
FOR SELECT
USING (true);