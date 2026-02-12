import { supabase } from "@/integrations/supabase/client";

export type FiscalAction = "test_connection" | "print_receipt" | "x_report" | "z_report" | "test_check" | "open_drawer";

export interface FiscalResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

export async function callFiscal(
  action: FiscalAction,
  locationId?: string,
  orderData?: any,
): Promise<FiscalResult> {
  const { data, error } = await supabase.functions.invoke("fiscal-print", {
    body: { action, location_id: locationId, order_data: orderData },
  });

  if (error) {
    throw new Error(error.message || "Ошибка вызова фискальной функции");
  }

  return data as FiscalResult;
}
