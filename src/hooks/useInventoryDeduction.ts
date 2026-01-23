import { supabase } from "@/integrations/supabase/client";

/**
 * Deduct a single ingredient from inventory
 */
export async function deductIngredient(
  locationId: string,
  ingredientId: string,
  quantity: number,
  orderId: string
): Promise<void> {
  const { data: currentInv } = await supabase
    .from("inventory")
    .select("id, quantity")
    .eq("location_id", locationId)
    .eq("ingredient_id", ingredientId)
    .maybeSingle();

  if (currentInv) {
    // Allow negative inventory
    await supabase
      .from("inventory")
      .update({ quantity: Number(currentInv.quantity) - quantity })
      .eq("id", currentInv.id);

    await supabase.from("inventory_movements").insert({
      location_id: locationId,
      ingredient_id: ingredientId,
      movement_type: "sale",
      quantity: -quantity,
      reference_id: orderId,
    });
  }
}

/**
 * Recursively deduct ingredients from a semi-finished product
 * Handles nested semi-finished products (заготовка внутри заготовки)
 */
export async function deductSemiFinishedIngredients(
  locationId: string,
  semiFinishedId: string,
  recipeQuantity: number,
  itemQuantity: number,
  orderId: string
): Promise<void> {
  // Get the semi-finished output quantity
  const { data: semiFinished } = await supabase
    .from("semi_finished")
    .select("output_quantity")
    .eq("id", semiFinishedId)
    .maybeSingle();

  if (!semiFinished?.output_quantity) return;

  // Get all ingredients of this semi-finished
  const { data: semiIngredients } = await supabase
    .from("semi_finished_ingredients")
    .select("ingredient_id, semi_finished_component_id, quantity")
    .eq("semi_finished_id", semiFinishedId);

  if (!semiIngredients) return;

  // Calculate ratio: how much of the semi-finished we need relative to its output
  // Example: recipe needs 100g, semi-finished outputs 800g → ratio = 100/800 = 0.125
  const ratio = (recipeQuantity * itemQuantity) / Number(semiFinished.output_quantity);

  for (const sfIngredient of semiIngredients) {
    const usedQty = Number(sfIngredient.quantity) * ratio;

    // Direct ingredient in semi-finished
    if (sfIngredient.ingredient_id) {
      await deductIngredient(
        locationId,
        sfIngredient.ingredient_id,
        usedQty,
        orderId
      );
    }

    // Nested semi-finished (заготовка внутри заготовки)
    if (sfIngredient.semi_finished_component_id) {
      await deductSemiFinishedIngredients(
        locationId,
        sfIngredient.semi_finished_component_id,
        Number(sfIngredient.quantity),
        ratio, // Pass ratio as multiplier
        orderId
      );
    }
  }
}

/**
 * Return ingredients to inventory (for refunds)
 */
export async function returnIngredient(
  locationId: string,
  ingredientId: string,
  quantity: number,
  orderId: string,
  orderNumber: number
): Promise<void> {
  const { data: currentInv } = await supabase
    .from("inventory")
    .select("id, quantity")
    .eq("location_id", locationId)
    .eq("ingredient_id", ingredientId)
    .maybeSingle();

  if (currentInv) {
    await supabase
      .from("inventory")
      .update({ quantity: Number(currentInv.quantity) + quantity })
      .eq("id", currentInv.id);

    await supabase.from("inventory_movements").insert({
      location_id: locationId,
      ingredient_id: ingredientId,
      movement_type: "adjustment",
      quantity: quantity,
      notes: `Возврат заказа #${orderNumber}`,
      reference_id: orderId,
    });
  }
}

/**
 * Recursively return ingredients from a semi-finished product (for refunds)
 */
export async function returnSemiFinishedIngredients(
  locationId: string,
  semiFinishedId: string,
  recipeQuantity: number,
  itemQuantity: number,
  orderId: string,
  orderNumber: number
): Promise<void> {
  const { data: semiFinished } = await supabase
    .from("semi_finished")
    .select("output_quantity")
    .eq("id", semiFinishedId)
    .maybeSingle();

  if (!semiFinished?.output_quantity) return;

  const { data: semiIngredients } = await supabase
    .from("semi_finished_ingredients")
    .select("ingredient_id, semi_finished_component_id, quantity")
    .eq("semi_finished_id", semiFinishedId);

  if (!semiIngredients) return;

  const ratio = (recipeQuantity * itemQuantity) / Number(semiFinished.output_quantity);

  for (const sfIngredient of semiIngredients) {
    const returnQty = Number(sfIngredient.quantity) * ratio;

    if (sfIngredient.ingredient_id) {
      await returnIngredient(
        locationId,
        sfIngredient.ingredient_id,
        returnQty,
        orderId,
        orderNumber
      );
    }

    if (sfIngredient.semi_finished_component_id) {
      await returnSemiFinishedIngredients(
        locationId,
        sfIngredient.semi_finished_component_id,
        Number(sfIngredient.quantity),
        ratio,
        orderId,
        orderNumber
      );
    }
  }
}
