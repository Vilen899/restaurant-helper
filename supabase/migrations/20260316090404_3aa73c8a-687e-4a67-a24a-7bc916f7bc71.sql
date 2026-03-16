
-- Группы модификаторов (например: "Размер", "Соус", "Допы")
CREATE TABLE public.modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_select integer NOT NULL DEFAULT 0,
  max_select integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage modifier_groups" ON public.modifier_groups
  FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "All users view modifier_groups" ON public.modifier_groups
  FOR SELECT TO authenticated
  USING (true);

-- Отдельные модификаторы (варианты внутри группы)
CREATE TABLE public.modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_adjustment numeric NOT NULL DEFAULT 0,
  ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE SET NULL,
  ingredient_quantity numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage modifiers" ON public.modifiers
  FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "All users view modifiers" ON public.modifiers
  FOR SELECT TO authenticated
  USING (true);

-- Связь модификаторов с блюдами (через тех.карту)
CREATE TABLE public.menu_item_modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  modifier_group_id uuid NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(menu_item_id, modifier_group_id)
);

ALTER TABLE public.menu_item_modifier_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage menu_item_modifier_groups" ON public.menu_item_modifier_groups
  FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "All users view menu_item_modifier_groups" ON public.menu_item_modifier_groups
  FOR SELECT TO authenticated
  USING (true);

-- Выбранные модификаторы в заказе
CREATE TABLE public.order_item_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  modifier_id uuid NOT NULL REFERENCES public.modifiers(id),
  modifier_name text NOT NULL,
  price_adjustment numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_item_modifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage order_item_modifiers" ON public.order_item_modifiers
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_modifiers.order_item_id
    AND (o.location_id = get_user_location(auth.uid()) OR is_admin_or_manager(auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_modifiers.order_item_id
    AND (o.location_id = get_user_location(auth.uid()) OR is_admin_or_manager(auth.uid()))
  ));

CREATE POLICY "Users view order_item_modifiers" ON public.order_item_modifiers
  FOR SELECT TO authenticated
  USING (true);
