-- Create stocktaking (инвентаризация) tables
CREATE TABLE public.stocktakings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'completed',
  total_items INTEGER NOT NULL DEFAULT 0,
  items_with_difference INTEGER NOT NULL DEFAULT 0,
  surplus_count INTEGER NOT NULL DEFAULT 0,
  shortage_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE public.stocktaking_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stocktaking_id UUID NOT NULL REFERENCES public.stocktakings(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id),
  system_quantity NUMERIC NOT NULL,
  actual_quantity NUMERIC NOT NULL,
  difference NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stocktakings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocktaking_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for stocktakings
CREATE POLICY "Admins manage stocktakings"
ON public.stocktakings
FOR ALL
USING (is_admin_or_manager(auth.uid()))
WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Users view stocktakings for their location"
ON public.stocktakings
FOR SELECT
USING (location_id = get_user_location(auth.uid()) OR is_admin_or_manager(auth.uid()));

-- RLS policies for stocktaking_items
CREATE POLICY "Admins manage stocktaking_items"
ON public.stocktaking_items
FOR ALL
USING (is_admin_or_manager(auth.uid()))
WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Users view stocktaking_items"
ON public.stocktaking_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.stocktakings s
  WHERE s.id = stocktaking_items.stocktaking_id
  AND (s.location_id = get_user_location(auth.uid()) OR is_admin_or_manager(auth.uid()))
));

-- Add indexes
CREATE INDEX idx_stocktakings_location ON public.stocktakings(location_id);
CREATE INDEX idx_stocktakings_created_at ON public.stocktakings(created_at DESC);
CREATE INDEX idx_stocktaking_items_stocktaking ON public.stocktaking_items(stocktaking_id);