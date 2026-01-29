-- 1. Таблица для ЗАГОЛОВКОВ документов (Общая информация)
CREATE TABLE IF NOT EXISTS material_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  type text NOT NULL,             -- 'MIGO' (Приход), 'MB1B' (Перенос), 'MI01' (Инвент)
  doc_number text,                -- Номер накладной или акта
  vendor_inn text,                -- ИНН поставщика
  location_id uuid REFERENCES locations(id),
  description text                -- Комментарий
);

-- 2. Таблица для ПОЗИЦИЙ документов (Список товаров внутри)
CREATE TABLE IF NOT EXISTS material_document_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id uuid REFERENCES material_documents(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES ingredients(id),
  quantity numeric NOT NULL,
  price numeric DEFAULT 0         -- Если захочешь считать деньги
);

-- 3. Функция "Двигатель" (чтобы обновлялись остатки на складе)
CREATE OR REPLACE FUNCTION increment_inventory(loc_id uuid, ing_id uuid, val numeric)
RETURNS void AS $$
BEGIN
  INSERT INTO inventory (location_id, ingredient_id, quantity)
  VALUES (loc_id, ing_id, val)
  ON CONFLICT (location_id, ingredient_id)
  DO UPDATE SET quantity = inventory.quantity + val;
END;
$$ LANGUAGE plpgsql;
