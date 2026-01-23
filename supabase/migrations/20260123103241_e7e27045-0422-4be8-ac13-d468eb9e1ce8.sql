-- Discounts table: admin configures available discounts
CREATE TABLE public.discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                              -- e.g. "Именинник", "Сотрудник", "Промо-акция"
  discount_type TEXT NOT NULL DEFAULT 'percent',   -- 'percent' or 'fixed'
  value NUMERIC NOT NULL DEFAULT 0,                -- percent (10) or fixed amount (500)
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

-- Admins manage discounts
CREATE POLICY "Admins manage discounts"
ON public.discounts
FOR ALL
USING (is_admin_or_manager(auth.uid()))
WITH CHECK (is_admin_or_manager(auth.uid()));

-- Cashiers can view active discounts
CREATE POLICY "All users view discounts"
ON public.discounts
FOR SELECT
USING (is_active = true);

-- Add trigger to auto-update updated_at
CREATE TRIGGER update_discounts_updated_at
BEFORE UPDATE ON public.discounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Extend orders table for discount info
ALTER TABLE public.orders
  ADD COLUMN discount_id UUID REFERENCES public.discounts(id),
  ADD COLUMN discount_name TEXT,
  ADD COLUMN discount_type TEXT,
  ADD COLUMN discount_value NUMERIC DEFAULT 0,
  ADD COLUMN discount_reason TEXT;
