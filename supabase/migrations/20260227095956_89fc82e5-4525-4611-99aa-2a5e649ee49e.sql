-- 1. Enable RLS on tables that have policies but RLS disabled
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- 2. Fix overly permissive RLS policies

-- stocktaking_docs: replace "Allow all access" with proper policies
DROP POLICY IF EXISTS "Allow all access for stocktaking" ON public.stocktaking_docs;

CREATE POLICY "Admins manage stocktaking_docs"
  ON public.stocktaking_docs FOR ALL
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Users view stocktaking_docs for their location"
  ON public.stocktaking_docs FOR SELECT
  USING (location_id = get_user_location(auth.uid()) OR is_admin_or_manager(auth.uid()));

-- material_documents: replace "Allow all" with proper policy
DROP POLICY IF EXISTS "Allow all for material_documents" ON public.material_documents;

-- material_document_items: replace "Allow all" with proper policy  
DROP POLICY IF EXISTS "Allow all for material_document_items" ON public.material_document_items;

-- shifts: fix INSERT policy to require auth
DROP POLICY IF EXISTS "Users can create shifts" ON public.shifts;
CREATE POLICY "Users can create shifts"
  ON public.shifts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Fix increment_inventory function with SECURITY DEFINER and search_path
CREATE OR REPLACE FUNCTION public.increment_inventory(loc_id uuid, ing_id uuid, val numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    loc_id = public.get_user_location(auth.uid())
    OR public.is_admin_or_manager(auth.uid())
    OR public.has_role(auth.uid(), 'cashier')
  ) THEN
    RAISE EXCEPTION 'Unauthorized inventory modification';
  END IF;

  INSERT INTO inventory (location_id, ingredient_id, quantity)
  VALUES (loc_id, ing_id, val)
  ON CONFLICT (location_id, ingredient_id)
  DO UPDATE SET quantity = inventory.quantity + val;
END;
$function$;