CREATE OR REPLACE FUNCTION public.calculate_menu_item_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    total_cost DECIMAL(10,4) := 0;
    ingredient_cost DECIMAL(10,4) := 0;
    semi_finished_cost DECIMAL(10,4) := 0;
    menu_id UUID;
BEGIN
    -- Get the menu_item_id
    menu_id := COALESCE(NEW.menu_item_id, OLD.menu_item_id);

    -- Calculate cost from direct ingredients
    SELECT COALESCE(SUM(mii.quantity * i.cost_per_unit), 0) INTO ingredient_cost
    FROM public.menu_item_ingredients mii
    JOIN public.ingredients i ON i.id = mii.ingredient_id
    WHERE mii.menu_item_id = menu_id
      AND mii.ingredient_id IS NOT NULL;

    -- Calculate cost from semi-finished products
    SELECT COALESCE(SUM(
        mii.quantity * (
            SELECT COALESCE(SUM(sfi.quantity * ing.cost_per_unit), 0) 
                   / GREATEST(sf.output_quantity, 1)
            FROM public.semi_finished_ingredients sfi
            JOIN public.ingredients ing ON ing.id = sfi.ingredient_id
            JOIN public.semi_finished sf ON sf.id = sfi.semi_finished_id
            WHERE sfi.semi_finished_id = mii.semi_finished_id
        )
    ), 0) INTO semi_finished_cost
    FROM public.menu_item_ingredients mii
    WHERE mii.menu_item_id = menu_id
      AND mii.semi_finished_id IS NOT NULL;

    total_cost := ingredient_cost + semi_finished_cost;

    -- Update menu item cost
    UPDATE public.menu_items
    SET cost_price = total_cost
    WHERE id = menu_id;

    RETURN NEW;
END;
$function$;
