-- Allow admins to delete shifts
CREATE POLICY "Admins can delete shifts" 
ON public.shifts 
FOR DELETE 
USING (is_admin_or_manager(auth.uid()));