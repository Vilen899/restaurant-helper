-- Fix the calculate_menu_item_cost function - proper GROUP BY handling
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
    sf_record RECORD;
BEGIN
    -- Get the menu_item_id
    menu_id := COALESCE(NEW.menu_item_id, OLD.menu_item_id);

    -- Calculate cost from direct ingredients
    SELECT COALESCE(SUM(mii.quantity * i.cost_per_unit), 0) INTO ingredient_cost
    FROM public.menu_item_ingredients mii
    JOIN public.ingredients i ON i.id = mii.ingredient_id
    WHERE mii.menu_item_id = menu_id
    AND mii.ingredient_id IS NOT NULL;

    -- Calculate cost from semi-finished products using a loop to avoid GROUP BY issues
    semi_finished_cost := 0;
    FOR sf_record IN
        SELECT mii.quantity AS recipe_qty, mii.semi_finished_id
        FROM public.menu_item_ingredients mii
        WHERE mii.menu_item_id = menu_id
        AND mii.semi_finished_id IS NOT NULL
    LOOP
        DECLARE
            sf_unit_cost DECIMAL(10,4) := 0;
            sf_output DECIMAL(10,4) := 1;
        BEGIN
            -- Get output quantity
            SELECT COALESCE(sf.output_quantity, 1) INTO sf_output
            FROM public.semi_finished sf
            WHERE sf.id = sf_record.semi_finished_id;

            -- Get total ingredient cost for this semi-finished
            SELECT COALESCE(SUM(sfi.quantity * ing.cost_per_unit), 0) INTO sf_unit_cost
            FROM public.semi_finished_ingredients sfi
            JOIN public.ingredients ing ON ing.id = sfi.ingredient_id
            WHERE sfi.semi_finished_id = sf_record.semi_finished_id;

            -- Add to total: recipe_qty * (sf_ingredient_cost / sf_output)
            semi_finished_cost := semi_finished_cost + (sf_record.recipe_qty * sf_unit_cost / NULLIF(sf_output, 0));
        END;
    END LOOP;

    total_cost := ingredient_cost + COALESCE(semi_finished_cost, 0);

    -- Update menu item cost
    UPDATE public.menu_items
    SET cost_price = total_cost
    WHERE id = menu_id;

    RETURN NEW;
END;
$function$;