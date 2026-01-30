-- Включаем RLS для таблиц где он отключён
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_document_items ENABLE ROW LEVEL SECURITY;

-- Политики для stock_movements
DROP POLICY IF EXISTS "Admins manage stock_movements" ON public.stock_movements;
CREATE POLICY "Admins manage stock_movements"
ON public.stock_movements FOR ALL
USING (is_admin_or_manager(auth.uid()))
WITH CHECK (is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Users view stock_movements" ON public.stock_movements;
CREATE POLICY "Users view stock_movements"
ON public.stock_movements FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Политики для material_documents
DROP POLICY IF EXISTS "Admins manage material_documents" ON public.material_documents;
CREATE POLICY "Admins manage material_documents"
ON public.material_documents FOR ALL
USING (is_admin_or_manager(auth.uid()))
WITH CHECK (is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Users view material_documents" ON public.material_documents;
CREATE POLICY "Users view material_documents"
ON public.material_documents FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Политики для material_document_items
DROP POLICY IF EXISTS "Admins manage material_document_items" ON public.material_document_items;
CREATE POLICY "Admins manage material_document_items"
ON public.material_document_items FOR ALL
USING (is_admin_or_manager(auth.uid()))
WITH CHECK (is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Users view material_document_items" ON public.material_document_items;
CREATE POLICY "Users view material_document_items"
ON public.material_document_items FOR SELECT
USING (auth.uid() IS NOT NULL);