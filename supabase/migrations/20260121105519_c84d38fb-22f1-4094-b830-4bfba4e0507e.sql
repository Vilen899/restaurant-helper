
-- Fix permissive RLS policies for order_items and audit_log

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users manage order_items" ON public.order_items;
DROP POLICY IF EXISTS "System inserts audit" ON public.audit_log;

-- Create proper order_items policies
CREATE POLICY "Users manage order_items for their orders" ON public.order_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_items.order_id
            AND (o.location_id = public.get_user_location(auth.uid()) OR public.is_admin_or_manager(auth.uid()))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_items.order_id
            AND (o.location_id = public.get_user_location(auth.uid()) OR public.is_admin_or_manager(auth.uid()))
        )
    );

-- Create proper audit_log insert policy (only authenticated users can insert their own actions)
DROP POLICY IF EXISTS "System inserts audit" ON public.audit_log;
CREATE POLICY "Users insert own audit entries" ON public.audit_log
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));
