-- Добавляем поле для имени поставщика в material_documents
ALTER TABLE public.material_documents 
ADD COLUMN IF NOT EXISTS supplier_name TEXT;

-- Политики удаления для администраторов (DROP + CREATE для идемпотентности)
DROP POLICY IF EXISTS "Admins can delete material_documents" ON public.material_documents;
CREATE POLICY "Admins can delete material_documents"
ON public.material_documents FOR DELETE
USING (is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete material_document_items" ON public.material_document_items;
CREATE POLICY "Admins can delete material_document_items"
ON public.material_document_items FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Политики удаления для stock_movements
DROP POLICY IF EXISTS "Admins can delete stock_movements" ON public.stock_movements;
CREATE POLICY "Admins can delete stock_movements"
ON public.stock_movements FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Политика удаления для orders (чеки)
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders"
ON public.orders FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Политика удаления для order_items
DROP POLICY IF EXISTS "Admins can delete order_items" ON public.order_items;
CREATE POLICY "Admins can delete order_items"
ON public.order_items FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Политика удаления для inventory_movements
DROP POLICY IF EXISTS "Admins can delete inventory_movements" ON public.inventory_movements;
CREATE POLICY "Admins can delete inventory_movements"
ON public.inventory_movements FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Политика удаления для inventory
DROP POLICY IF EXISTS "Admins can delete inventory" ON public.inventory;
CREATE POLICY "Admins can delete inventory"
ON public.inventory FOR DELETE
USING (is_admin_or_manager(auth.uid()));