-- 1. Restrict cashiers to only see today's orders (not historical)
DROP POLICY IF EXISTS "Users view orders for their location" ON public.orders;

CREATE POLICY "Users view orders for their location"
ON public.orders
FOR SELECT
USING (
    auth.uid() IS NOT NULL 
    AND (
        -- Admins and managers can see all orders
        is_admin_or_manager(auth.uid())
        OR 
        -- Cashiers can only see orders from their location created today
        (
            location_id = get_user_location(auth.uid())
            AND created_at >= CURRENT_DATE
        )
    )
);

-- 2. Add audit triggers for remaining tables
CREATE TRIGGER audit_shifts
    AFTER INSERT OR UPDATE OR DELETE ON public.shifts
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_supplies
    AFTER INSERT OR UPDATE OR DELETE ON public.supplies
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_transfers
    AFTER INSERT OR UPDATE OR DELETE ON public.transfers
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_supply_items
    AFTER INSERT OR UPDATE OR DELETE ON public.supply_items
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_transfer_items
    AFTER INSERT OR UPDATE OR DELETE ON public.transfer_items
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_inventory_movements
    AFTER INSERT OR UPDATE OR DELETE ON public.inventory_movements
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();