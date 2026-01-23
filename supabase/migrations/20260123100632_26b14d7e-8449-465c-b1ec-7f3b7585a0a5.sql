-- Allow public read access to locations for PIN login screen
-- This is safe because locations are not sensitive data
CREATE POLICY "Anyone can view active locations"
ON public.locations
FOR SELECT
USING (is_active = true);