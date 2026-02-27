-- Fix publicly readable tables - restrict to authenticated users

-- locations: remove overly permissive SELECT policies
DROP POLICY IF EXISTS "Anyone can view active locations" ON public.locations;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.locations;

-- menu_items: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view menu_items" ON public.menu_items;
CREATE POLICY "Authenticated users view menu_items"
  ON public.menu_items FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

-- menu_categories: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view categories" ON public.menu_categories;
CREATE POLICY "Authenticated users view categories"
  ON public.menu_categories FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

-- ingredients: remove public read policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ingredients;

-- inventory: remove public read policy  
DROP POLICY IF EXISTS "Enable read access for all users" ON public.inventory;

-- shifts: restrict viewing to own shifts or admin
DROP POLICY IF EXISTS "Users view shifts" ON public.shifts;
CREATE POLICY "Users view own or admin shifts"
  ON public.shifts FOR SELECT
  USING (user_id = auth.uid() OR is_admin_or_manager(auth.uid()));