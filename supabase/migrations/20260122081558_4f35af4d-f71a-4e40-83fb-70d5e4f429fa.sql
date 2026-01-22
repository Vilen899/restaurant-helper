-- Создаем таблицу для способов оплаты
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Admins manage payment_methods"
  ON public.payment_methods
  FOR ALL
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "All users view payment_methods"
  ON public.payment_methods
  FOR SELECT
  USING (true);

-- Триггер для обновления updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Добавляем стандартные способы оплаты
INSERT INTO public.payment_methods (name, code, icon, sort_order) VALUES
  ('Наличные', 'cash', 'Banknote', 1),
  ('Карта', 'card', 'CreditCard', 2);