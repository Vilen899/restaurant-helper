-- Drop existing view policies that only allow authenticated users
DROP POLICY IF EXISTS "All users view menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "All users view categories" ON public.menu_categories;

-- Create new policies that allow anyone (including anon) to view
CREATE POLICY "Anyone can view menu_items"
ON public.menu_items
FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Anyone can view categories"
ON public.menu_categories
FOR SELECT
TO public
USING (is_active = true);