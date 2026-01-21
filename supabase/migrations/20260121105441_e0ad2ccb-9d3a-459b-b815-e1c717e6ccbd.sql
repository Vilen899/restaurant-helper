
-- =============================================
-- 1. ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'cashier');
CREATE TYPE public.movement_type AS ENUM ('sale', 'supply', 'transfer_in', 'transfer_out', 'write_off', 'adjustment');
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'ready', 'completed', 'cancelled');
CREATE TYPE public.transfer_status AS ENUM ('pending', 'in_transit', 'completed', 'cancelled');
CREATE TYPE public.supply_status AS ENUM ('pending', 'received', 'cancelled');

-- =============================================
-- 2. LOCATIONS (Точки/Филиалы)
-- =============================================
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 3. PROFILES (Профили пользователей)
-- =============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    pin_hash TEXT, -- Хешированный PIN для кассиров
    location_id UUID REFERENCES public.locations(id),
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 4. USER ROLES (Роли - ОТДЕЛЬНАЯ ТАБЛИЦА!)
-- =============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- =============================================
-- 5. SECURITY DEFINER FUNCTIONS
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_location(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT location_id FROM public.profiles
    WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role IN ('admin', 'manager')
    )
$$;

-- =============================================
-- 6. UNITS (Единицы измерения)
-- =============================================
CREATE TABLE public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    abbreviation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Базовые единицы
INSERT INTO public.units (name, abbreviation) VALUES
    ('Килограмм', 'кг'),
    ('Грамм', 'г'),
    ('Литр', 'л'),
    ('Миллилитр', 'мл'),
    ('Штука', 'шт'),
    ('Порция', 'порц');

-- =============================================
-- 7. MENU CATEGORIES (Категории меню)
-- =============================================
CREATE TABLE public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 8. INGREDIENTS (Ингредиенты/Сырьё)
-- =============================================
CREATE TABLE public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit_id UUID NOT NULL REFERENCES public.units(id),
    cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_stock DECIMAL(10,3) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 9. SEMI-FINISHED PRODUCTS (Полуфабрикаты)
-- =============================================
CREATE TABLE public.semi_finished (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit_id UUID NOT NULL REFERENCES public.units(id),
    output_quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Состав полуфабриката
CREATE TABLE public.semi_finished_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semi_finished_id UUID NOT NULL REFERENCES public.semi_finished(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
    semi_finished_component_id UUID REFERENCES public.semi_finished(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_one_component CHECK (
        (ingredient_id IS NOT NULL AND semi_finished_component_id IS NULL) OR
        (ingredient_id IS NULL AND semi_finished_component_id IS NOT NULL)
    )
);

-- =============================================
-- 10. MENU ITEMS (Блюда меню)
-- =============================================
CREATE TABLE public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.menu_categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    output_weight DECIMAL(10,3),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Тех.карта блюда (состав)
CREATE TABLE public.menu_item_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
    semi_finished_id UUID REFERENCES public.semi_finished(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_one_source CHECK (
        (ingredient_id IS NOT NULL AND semi_finished_id IS NULL) OR
        (ingredient_id IS NULL AND semi_finished_id IS NOT NULL)
    )
);

-- =============================================
-- 11. INVENTORY (Остатки на складах)
-- =============================================
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (location_id, ingredient_id)
);

-- =============================================
-- 12. INVENTORY MOVEMENTS (Движения по складу - АУДИТ)
-- =============================================
CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.locations(id),
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id),
    movement_type movement_type NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    cost_per_unit DECIMAL(10,2),
    reference_id UUID, -- Ссылка на заказ/поставку/перемещение
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 13. SUPPLIES (Поставки)
-- =============================================
CREATE TABLE public.supplies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.locations(id),
    supplier_name TEXT,
    invoice_number TEXT,
    status supply_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    received_by UUID REFERENCES auth.users(id),
    received_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.supply_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supply_id UUID NOT NULL REFERENCES public.supplies(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id),
    quantity DECIMAL(10,3) NOT NULL,
    cost_per_unit DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 14. TRANSFERS (Перемещения между точками)
-- =============================================
CREATE TABLE public.transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_location_id UUID NOT NULL REFERENCES public.locations(id),
    to_location_id UUID NOT NULL REFERENCES public.locations(id),
    status transfer_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    completed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT different_locations CHECK (from_location_id != to_location_id)
);

CREATE TABLE public.transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id),
    quantity DECIMAL(10,3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 15. SHIFTS (Смены сотрудников)
-- =============================================
CREATE TABLE public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    location_id UUID NOT NULL REFERENCES public.locations(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    break_minutes INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 16. ORDERS (Заказы)
-- =============================================
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.locations(id),
    order_number SERIAL,
    status order_status NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 17. AUDIT LOG (Журнал аудита)
-- =============================================
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 18. ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semi_finished ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semi_finished_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 19. RLS POLICIES
-- =============================================

-- LOCATIONS: Админы видят все, остальные - только свою точку
CREATE POLICY "Admins manage all locations" ON public.locations
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view their location" ON public.locations
    FOR SELECT TO authenticated
    USING (id = public.get_user_location(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- PROFILES: Пользователи видят свой профиль, админы - все
CREATE POLICY "Users view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins manage profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES: Только админы
CREATE POLICY "Admins manage roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own role" ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- UNITS: Все могут читать, админы/менеджеры - редактировать
CREATE POLICY "All users view units" ON public.units
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins manage units" ON public.units
    FOR ALL TO authenticated
    USING (public.is_admin_or_manager(auth.uid()))
    WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- MENU_CATEGORIES: Все читают, админы/менеджеры редактируют
CREATE POLICY "All users view categories" ON public.menu_categories
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins manage categories" ON public.menu_categories
    FOR ALL TO authenticated
    USING (public.is_admin_or_manager(auth.uid()))
    WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- INGREDIENTS: Все читают, админы/менеджеры редактируют
CREATE POLICY "All users view ingredients" ON public.ingredients
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins manage ingredients" ON public.ingredients
    FOR ALL TO authenticated
    USING (public.is_admin_or_manager(auth.uid()))
    WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- SEMI_FINISHED: Все читают, админы/менеджеры редактируют
CREATE POLICY "All users view semi_finished" ON public.semi_finished
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins manage semi_finished" ON public.semi_finished
    FOR ALL TO authenticated
    USING (public.is_admin_or_manager(auth.uid()))
    WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "All users view semi_finished_ingredients" ON public.semi_finished_ingredients
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins manage semi_finished_ingredients" ON public.semi_finished_ingredients
    FOR ALL TO authenticated
    USING (public.is_admin_or_manager(auth.uid()))
    WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- MENU_ITEMS: Все читают, админы/менеджеры редактируют
CREATE POLICY "All users view menu_items" ON public.menu_items
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins manage menu_items" ON public.menu_items
    FOR ALL TO authenticated
    USING (public.is_admin_or_manager(auth.uid()))
    WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "All users view menu_item_ingredients" ON public.menu_item_ingredients
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins manage menu_item_ingredients" ON public.menu_item_ingredients
    FOR ALL TO authenticated
    USING (public.is_admin_or_manager(auth.uid()))
    WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- INVENTORY: По локации
CREATE POLICY "Users view inventory for their location" ON public.inventory
    FOR SELECT TO authenticated
    USING (location_id = public.get_user_location(auth.uid()) OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins manage inventory" ON public.inventory
    FOR ALL TO authenticated
    USING (public.is_admin_or_manager(auth.uid()))
    WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- INVENTORY_MOVEMENTS: По локации, только чтение для кассиров
CREATE POLICY "Users view movements for their location" ON public.inventory_movements
    FOR SELECT TO authenticated
    USING (location_id = public.get_user_location(auth.uid()) OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins insert movements" ON public.inventory_movements
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager(auth.uid()) OR public.has_role(auth.uid(), 'cashier'));

-- SUPPLIES: По локации
CREATE POLICY "Users view supplies for their location" ON public.supplies
    FOR SELECT TO authenticated
    USING (location_id = public.get_user_location(auth.uid()) OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins manage supplies" ON public.supplies
    FOR ALL TO authenticated
    USING (public.is_admin_or_manager(auth.uid()))
    WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users view supply_items" ON public.supply_items
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins manage supply_items" ON public.supply_items
    FOR ALL TO authenticated
    USING (public.is_admin_or_manager(auth.uid()))
    WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- TRANSFERS: По локациям отправки/получения
CREATE POLICY "Users view their transfers" ON public.transfers
    FOR SELECT TO authenticated
    USING (
        from_location_id = public.get_user_location(auth.uid()) OR 
        to_location_id = public.get_user_location(auth.uid()) OR 
        public.is_admin_or_manager(auth.uid())
    );

CREATE POLICY "Admins manage transfers" ON public.transfers
    FOR ALL TO authenticated
    USING (public.is_admin_or_manager(auth.uid()))
    WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users view transfer_items" ON public.transfer_items
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins manage transfer_items" ON public.transfer_items
    FOR ALL TO authenticated
    USING (public.is_admin_or_manager(auth.uid()))
    WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- SHIFTS: Свои смены + менеджеры видят по локации
CREATE POLICY "Users view own shifts" ON public.shifts
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users manage own shifts" ON public.shifts
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own shifts" ON public.shifts
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

-- ORDERS: По локации
CREATE POLICY "Users view orders for their location" ON public.orders
    FOR SELECT TO authenticated
    USING (location_id = public.get_user_location(auth.uid()) OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users create orders" ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (location_id = public.get_user_location(auth.uid()) OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users update orders" ON public.orders
    FOR UPDATE TO authenticated
    USING (location_id = public.get_user_location(auth.uid()) OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users view order_items" ON public.order_items
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users manage order_items" ON public.order_items
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- AUDIT_LOG: Только админы
CREATE POLICY "Admins view audit" ON public.audit_log
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System inserts audit" ON public.audit_log
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- =============================================
-- 20. TRIGGERS
-- =============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply to relevant tables
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON public.menu_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON public.ingredients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_semi_finished_updated_at BEFORE UPDATE ON public.semi_finished
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplies_updated_at BEFORE UPDATE ON public.supplies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Calculate menu item cost price
CREATE OR REPLACE FUNCTION public.calculate_menu_item_cost()
RETURNS TRIGGER AS $$
DECLARE
    total_cost DECIMAL(10,2) := 0;
    ingredient_cost DECIMAL(10,2);
    semi_cost DECIMAL(10,2);
BEGIN
    -- Calculate from direct ingredients
    SELECT COALESCE(SUM(mii.quantity * i.cost_per_unit), 0) INTO ingredient_cost
    FROM public.menu_item_ingredients mii
    JOIN public.ingredients i ON i.id = mii.ingredient_id
    WHERE mii.menu_item_id = COALESCE(NEW.menu_item_id, OLD.menu_item_id)
    AND mii.ingredient_id IS NOT NULL;

    total_cost := ingredient_cost;

    -- Update menu item cost
    UPDATE public.menu_items
    SET cost_price = total_cost
    WHERE id = COALESCE(NEW.menu_item_id, OLD.menu_item_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER recalculate_cost_on_ingredient_change
    AFTER INSERT OR UPDATE OR DELETE ON public.menu_item_ingredients
    FOR EACH ROW EXECUTE FUNCTION public.calculate_menu_item_cost();
